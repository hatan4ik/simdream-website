'use client';

import { israelToday } from '@/lib/scheduler/israel-clock';
import {
  WIX_BOOKINGS_APP_ID,
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
import { wixLocalDateTimeToIso, type WixBrowserClient, type WixNativeCheckoutCandidate } from './booking-checkout-client';

const WIX_CREATE_BOOKING_URL = 'https://www.wixapis.com/bookings/v2/bookings';

export interface VerifiedVoucherOrCodeResult {
  kind: 'local-voucher' | 'wix-gift-card' | 'wix-coupon';
  code: string;
  currentBalanceIls?: number;
  initialValueIls?: number;
  expiryDate?: string;
  discountIls?: number;
  percentageOff?: number;
  isActive?: boolean;
}

function wixMoneyAmount(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Resolves an unpaid Wix Bookings reservation for a future 60-minute flight slot so
 * service-scoped coupons (`100-OFF`, `15-OFF`, `KANTOQA100-20261105`) can be validated
 * on the `/vouchers` verification drawer just like on `/book`.
 */
async function createProbeBookingLineItem(client: WixBrowserClient): Promise<{ appId: string; catalogItemId: string } | null> {
  if (typeof window === 'undefined') return null;
  const fetchAuth = (input: RequestInfo | URL, init?: RequestInit) => client.fetchWithAuth(input, init);
  const baseDate = israelToday();

  for (const offset of [5, 6, 7]) {
    const date = addDaysYmd(baseDate, offset);
    try {
      const slotsRes = await fetch(`/api/slots?date=${date}&duration=60`);
      if (!slotsRes.ok) continue;
      const slotsPayload = (await slotsRes.json()) as Array<{ startTime?: string; available?: boolean }>;
      const openSlot = Array.isArray(slotsPayload) ? slotsPayload.find((s) => s.available && s.startTime) : undefined;
      if (!openSlot?.startTime) continue;

      const checkoutRes = await fetch('/api/wix/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: 'pkg-captain-60',
          bookingDate: date,
          startTime: openSlot.startTime,
        }),
      });
      if (!checkoutRes.ok) continue;
      const candidate = (await checkoutRes.json()) as Partial<WixNativeCheckoutCandidate>;
      const slot = candidate.slotAvailability;
      if (!slot?.serviceId || !slot.scheduleId || !slot.localStartDate || !slot.localEndDate || !candidate.timeZone || !candidate.location) {
        continue;
      }

      const bookingReply = await postWixJson(fetchAuth, WIX_CREATE_BOOKING_URL, {
        booking: {
          bookedEntity: {
            slot: {
              serviceId: slot.serviceId,
              scheduleId: slot.scheduleId,
              startDate: wixLocalDateTimeToIso(slot.localStartDate, candidate.timeZone),
              endDate: wixLocalDateTimeToIso(slot.localEndDate, candidate.timeZone),
              timezone: candidate.timeZone,
              location: {
                id: candidate.location.id,
                locationType: candidate.location.locationType === 'BUSINESS' ? 'OWNER_BUSINESS' : candidate.location.locationType,
              },
            },
          },
          totalParticipants: 1,
          selectedPaymentOption: candidate.paymentOptions?.online ? 'ONLINE' : 'OFFLINE',
        },
        formSubmission: {
          first_name: 'Voucher',
          last_name: 'Verification',
          email: 'verify@simdream.co.il',
          phone: '+972555071307',
        },
        participantNotification: { notifyParticipants: false },
      });
      const bookingId = (bookingReply.payload as { booking?: { id?: string } } | null)?.booking?.id;
      if (bookingReply.response.ok && bookingId) {
        return { appId: WIX_BOOKINGS_APP_ID, catalogItemId: bookingId };
      }
    } catch {
      // Ignore and fall back to Stores probe items when offline or in unit tests.
    }
  }
  return null;
}

/**
 * Creates a temporary Cart V2 holding a Wix Bookings service item (when available) plus
 * Wix Stores catalog items so Wix can calculate Gift Card balances and service/store Coupon discounts.
 */
async function createProbeWixCart(client: WixBrowserClient): Promise<string | null> {
  const productIds = Object.values(WIX_ADDON_PRODUCT_IDS);
  if (productIds.length === 0) return null;
  const bookingItem = await createProbeBookingLineItem(client);
  const storeItems = productIds.map((productId) => ({
    ...wixCatalogLineItem(WIX_STORES_APP_ID, productId),
    quantity: 2,
  }));
  const catalogItems = bookingItem ? [wixCatalogLineItem(bookingItem.appId, bookingItem.catalogItemId), ...storeItems] : storeItems;
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
        isActive: true,
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
      const tcCoupon =
        calc?.cart?.tcAppliedDiscounts?.find((d) => d.coupon?.id === couponId)?.coupon ??
        couponPayload?.cart?.tcAppliedDiscounts?.find((d) => d.coupon?.id === couponId)?.coupon ??
        calc?.cart?.tcAppliedDiscounts?.[0]?.coupon ??
        couponPayload?.cart?.tcAppliedDiscounts?.[0]?.coupon;
      const pct = tcCoupon?.percentage ? Number(tcCoupon.percentage) : NaN;
      const percentageOff = Number.isFinite(pct) && pct > 0 ? pct : undefined;
      const tcAmount = wixMoneyAmount(tcCoupon?.amount?.amount);
      const summaryDiscount = wixMoneyAmount(calc?.summary?.priceSummary?.discount?.amount) ?? 0;
      const afterTotal = wixMoneyAmount(calc?.summary?.priceSummary?.total?.amount) ?? baseTotal;
      const diffDiscount = Math.max(0, Number((baseTotal - afterTotal).toFixed(3)));
      const discountIls = tcAmount !== null && tcAmount > 0 ? tcAmount : Math.max(summaryDiscount, diffDiscount);
      await postWixJson(fetchAuth, wixCartUrl(cartId, 'remove-coupon'), { couponId }).catch(() => null);
      return {
        kind: 'wix-coupon',
        code: appliedCoupon?.code || tcCoupon?.code || code,
        discountIls,
        ...(percentageOff ? { percentageOff } : {}),
        isActive: true,
      };
    }
  }

  return null;
}

/**
 * Verifies a Gift Voucher (`SD-VOUCH-...`), Wix Gift Card (`8AQMJWNT1V5RK98D`), or Wix Coupon (`100-OFF`, `15-OFF`)
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
        isActive: true,
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
