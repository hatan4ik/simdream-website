'use client';

import {
  WIX_CART_V2_URL,
  postWixJson,
  wixCartUrl,
  wixCatalogLineItem,
  wixCreateCartBody,
  type WixCartCalculationResponse,
  type WixCartCouponResponse,
  type WixCartCreateResponse,
  type WixCartGiftCardResponse,
} from './cart-v2-shared';
import { WIX_ADDON_PRODUCT_IDS, WIX_STORES_APP_ID } from './catalog';
import { getWixMemberClient, isWixBrowserClientConfigured } from './member-client';
import type { WixBrowserClient } from './booking-checkout-client';

export interface VerifiedVoucherOrCodeResult {
  kind: 'local-voucher' | 'wix-gift-card' | 'wix-coupon';
  code: string;
  currentBalanceIls?: number;
  initialValueIls?: number;
  expiryDate?: string;
  discountIls?: number;
}

function wixMoneyAmount(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * Creates a temporary Cart V2 holding high-value Wix Stores catalog items so
 * Wix can calculate Gift Card balances and Coupon discounts without booking a slot.
 */
async function createProbeWixCart(client: WixBrowserClient): Promise<string | null> {
  const productIds = Object.values(WIX_ADDON_PRODUCT_IDS);
  if (productIds.length === 0) return null;
  const catalogItems = productIds.map((productId) => ({
    ...wixCatalogLineItem(WIX_STORES_APP_ID, productId),
    quantity: 2,
  }));
  const { response, payload } = await postWixJson(
    (input, init) => client.fetchWithAuth(input, init),
    WIX_CART_V2_URL,
    wixCreateCartBody(catalogItems)
  );
  const cartId = (payload as WixCartCreateResponse | null)?.cart?.id;
  return response.ok && cartId ? cartId : null;
}

/**
 * Probes a code against a temporary Wix Cart V2 as either a Gift Card or a Coupon.
 * Removes the applied Gift Card / Coupon immediately after calculation.
 */
export async function verifyCodeWithWixCart(
  rawCode: string,
  client: WixBrowserClient = getWixMemberClient()
): Promise<VerifiedVoucherOrCodeResult | null> {
  const code = rawCode.trim();
  if (!code) return null;

  const cartId = await createProbeWixCart(client);
  if (!cartId) return null;

  const fetchAuth = (input: RequestInfo | URL, init?: RequestInit) => client.fetchWithAuth(input, init);

  // 1. Try as a native Wix Gift Card
  const gcReply = await postWixJson(fetchAuth, wixCartUrl(cartId, 'add-gift-card'), {
    giftCard: { code },
  });
  if (gcReply.response.ok) {
    const gcPayload = gcReply.payload as WixCartGiftCardResponse | null;
    const appliedGc = gcPayload?.cart?.paymentInfo?.giftCards?.[0];
    const giftCardId = appliedGc?.id ?? appliedGc?._id;
    const calcReply = await postWixJson(fetchAuth, wixCartUrl(cartId, 'calculate'), { refreshCart: true });
    const calc = calcReply.payload as WixCartCalculationResponse | null;
    const redeemIls = (calc?.summary?.paymentSummary?.giftCards ?? []).reduce(
      (sum, item) => sum + (wixMoneyAmount(item.redeemAmount?.amount) ?? 0),
      0
    );
    if (giftCardId) {
      await postWixJson(fetchAuth, wixCartUrl(cartId, 'remove-gift-card'), { giftCardId }).catch(() => null);
    }
    if (redeemIls > 0) {
      return {
        kind: 'wix-gift-card',
        code: appliedGc?.obfuscatedCode || `****${code.slice(-4)}`,
        currentBalanceIls: redeemIls,
      };
    }
  }

  // 2. Try as a native Wix Coupon
  const baseCalcReply = await postWixJson(fetchAuth, wixCartUrl(cartId, 'calculate'), { refreshCart: true });
  const baseTotal =
    wixMoneyAmount((baseCalcReply.payload as WixCartCalculationResponse | null)?.summary?.priceSummary?.total?.amount) ??
    0;

  const couponReply = await postWixJson(fetchAuth, wixCartUrl(cartId, 'add-coupon'), {
    coupon: { code },
  });
  if (couponReply.response.ok) {
    const couponPayload = couponReply.payload as WixCartCouponResponse | null;
    const appliedCoupon =
      couponPayload?.cart?.coupons?.find((c) => c.code?.toUpperCase() === code.toUpperCase()) ??
      couponPayload?.cart?.coupons?.[0];
    const couponId = appliedCoupon?.id ?? appliedCoupon?._id;
    if (couponId) {
      const calcReply = await postWixJson(fetchAuth, wixCartUrl(cartId, 'calculate'), { refreshCart: true });
      const calc = calcReply.payload as WixCartCalculationResponse | null;
      const summaryDiscount = wixMoneyAmount(calc?.summary?.priceSummary?.discount?.amount) ?? 0;
      const afterTotal = wixMoneyAmount(calc?.summary?.priceSummary?.total?.amount) ?? baseTotal;
      const discountIls = Math.max(summaryDiscount, Math.max(0, Number((baseTotal - afterTotal).toFixed(3))));
      await postWixJson(fetchAuth, wixCartUrl(cartId, 'remove-coupon'), { couponId }).catch(() => null);
      return {
        kind: 'wix-coupon',
        code: appliedCoupon?.code || code,
        discountIls,
      };
    }
  }

  return null;
}

/**
 * Verifies a Gift Voucher (`SD-VOUCH-...`), Wix Gift Card (`8AQMJWNT1V5RK98D`), or Wix Coupon (`OFF-100`, `15-OFF`)
 * from the `/vouchers` verification drawer.
 */
export async function verifyVoucherOrWixCode(rawCode: string): Promise<VerifiedVoucherOrCodeResult> {
  const trimmed = rawCode.trim().toUpperCase();
  if (!trimmed) {
    throw new Error('Invalid voucher code.');
  }

  const wixConfigured = isWixBrowserClientConfigured();

  // Check local `/api/vouchers` first when the code is a local `SD-VOUCH-...` or when Wix is not configured.
  if (!wixConfigured || trimmed.startsWith('SD-VOUCH-')) {
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', code: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      currentBalanceIls?: number;
      initialValueIls?: number;
      expiryDate?: string;
      error?: string;
    };
    if (res.ok && data.code) {
      return {
        kind: 'local-voucher',
        code: data.code,
        currentBalanceIls: data.currentBalanceIls,
        initialValueIls: data.initialValueIls,
        expiryDate: data.expiryDate,
      };
    }
    if (!wixConfigured) {
      throw new Error(data.error || 'Invalid voucher code.');
    }
  }

  const wixResult = await verifyCodeWithWixCart(trimmed);
  if (wixResult) {
    return wixResult;
  }

  throw new Error('Invalid Gift Card, Coupon, or Voucher code. Check the code and try again.');
}
