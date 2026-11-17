import { describe, expect, it, vi } from 'vitest';
import { verifyCodeWithWixCart } from '@/lib/wix/verify-voucher-or-code';
import type { WixBrowserClient } from '@/lib/wix/booking-checkout-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyCodeWithWixCart (/vouchers bottom verification drawer)', () => {
  it('validates a Wix Gift Card (8AQMJWNT1V5RK98D), extracts available balance, and removes the gift card', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const client: WixBrowserClient = {
      fetchWithAuth: vi.fn(async (input, init) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        calls.push({ url, body });

        if (url === 'https://www.wixapis.com/ecom/v2/carts') {
          return jsonResponse({ cart: { id: 'probe-cart-1' } });
        }
        if (url.endsWith('/add-gift-card')) {
          return jsonResponse({
            cart: {
              paymentInfo: {
                giftCards: [{ id: 'gc-1', obfuscatedCode: '****K98D' }],
              },
            },
          });
        }
        if (url.endsWith('/calculate')) {
          return jsonResponse({
            summary: {
              priceSummary: { total: { amount: '2000' } },
              paymentSummary: {
                giftCards: [{ giftCardId: 'gc-1', redeemAmount: { amount: '690' } }],
              },
            },
          });
        }
        if (url.endsWith('/remove-gift-card')) {
          return jsonResponse({ cart: { paymentInfo: { giftCards: [] } } });
        }
        return jsonResponse({}, 404);
      }),
    };

    const res = await verifyCodeWithWixCart('8AQMJWNT1V5RK98D', client);
    expect(res).toEqual({
      kind: 'wix-gift-card',
      code: '****K98D',
      currentBalanceIls: 690,
    });
    expect(calls.some((c) => c.url.endsWith('/remove-gift-card'))).toBe(true);
    expect(JSON.stringify(res)).not.toContain('8AQMJWNT1V5RK98D');
  });

  it('falls back to add-coupon when the code is a Wix Coupon (OFF-100) and returns the coupon discount', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    let couponAdded = false;
    const client: WixBrowserClient = {
      fetchWithAuth: vi.fn(async (input, init) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        calls.push({ url, body });

        if (url === 'https://www.wixapis.com/ecom/v2/carts') {
          return jsonResponse({ cart: { id: 'probe-cart-2' } });
        }
        if (url.endsWith('/add-gift-card')) {
          return jsonResponse({ message: 'Invalid gift card' }, 400);
        }
        if (url.endsWith('/add-coupon')) {
          couponAdded = true;
          return jsonResponse({
            cart: {
              coupons: [{ id: 'coupon-1', code: 'OFF-100' }],
            },
          });
        }
        if (url.endsWith('/calculate')) {
          return jsonResponse({
            summary: {
              priceSummary: {
                discount: { amount: couponAdded ? '100' : '0' },
                total: { amount: couponAdded ? '1900' : '2000' },
              },
            },
          });
        }
        if (url.endsWith('/remove-coupon')) {
          return jsonResponse({ cart: { coupons: [] } });
        }
        return jsonResponse({}, 404);
      }),
    };

    const res = await verifyCodeWithWixCart('OFF-100', client);
    expect(res).toEqual({
      kind: 'wix-coupon',
      code: 'OFF-100',
      discountIls: 100,
    });
    expect(calls.some((c) => c.url.endsWith('/remove-coupon'))).toBe(true);
  });

  it('returns null when neither Gift Card nor Coupon is accepted by Wix Cart V2', async () => {
    const client: WixBrowserClient = {
      fetchWithAuth: vi.fn(async (input) => {
        const url = String(input);
        if (url === 'https://www.wixapis.com/ecom/v2/carts') {
          return jsonResponse({ cart: { id: 'probe-cart-3' } });
        }
        if (url.endsWith('/calculate')) {
          return jsonResponse({ summary: { priceSummary: { total: { amount: '2000' } } } });
        }
        return jsonResponse({ message: 'Not found' }, 400);
      }),
    };

    await expect(verifyCodeWithWixCart('INVALID-CODE', client)).resolves.toBeNull();
  });
});
