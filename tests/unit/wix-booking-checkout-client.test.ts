import { describe, expect, it } from 'vitest';
import {
  applyWixCoupon,
  applyWixGiftCard,
  createWixCartForBooking,
  normalizeWixBookingPhone,
  prepareWixBookingCheckout,
  removeWixCoupon,
  removeWixGiftCard,
  startWixBookingCheckout,
  wixLocalDateTimeToIso,
  type WixBrowserClient,
  type WixNativeCheckoutCandidate,
} from '@/lib/wix/booking-checkout-client';
import { WIX_ADDON_PRODUCT_IDS, WIX_STORES_APP_ID } from '@/lib/wix/catalog';

const CANDIDATE: WixNativeCheckoutCandidate = {
  slotAvailability: {
    serviceId: 'service-id',
    scheduleId: 'schedule-id',
    localStartDate: '2026-11-09T10:00:00',
    localEndDate: '2026-11-09T11:00:00',
    bookable: true,
  },
  timeZone: 'Asia/Jerusalem',
  location: { id: 'location-id', locationType: 'BUSINESS' },
  paymentOptions: { online: true, inPerson: false },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function calculation(discount: string, total: string): Response {
  return response({
    summary: {
      violations: [],
      priceSummary: { discount: { amount: discount }, total: { amount: total } },
    },
  });
}

function giftCardCalculation(total: string, redeemed: string, totalAfterGiftCards: string): Response {
  return response({
    summary: {
      violations: [],
      priceSummary: { discount: { amount: '0' }, total: { amount: total } },
      paymentSummary: {
        giftCards: [{ giftCardId: 'gift-card-id', redeemAmount: { amount: redeemed } }],
        totalAfterGiftCards: { amount: totalAfterGiftCards },
      },
    },
  });
}

describe('Wix native booking checkout client', () => {
  it('uses one visitor cart to calculate a native coupon before opening hosted checkout', async () => {
    const calls: Array<{ url: string; method?: string; body: unknown }> = [];
    const replies = [
      response({
        timeSlot: {
          bookable: true,
          scheduleId: 'schedule-id',
          availableResources: [
            { resources: [{ id: 'simulator-resource' }] },
            { resources: [{ id: 'staff-resource', name: 'Captain SimDream' }] },
          ],
        },
      }),
      response({ booking: { id: 'booking-id' } }),
      response({ cart: { id: 'cart-id' } }),
      response({ cart: { id: 'cart-id' } }),
      calculation('0', '690'),
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'WIX-TEST' }] } }),
      // Wix Bookings can apply a native coupon on the line item while reporting
      // a zero cart-level `priceSummary.discount`; the total remains decisive.
      calculation('0', '0'),
      response({ checkoutUrl: 'https://checkout.wix.com/pay/session' }),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '054-777-3074',
        notes: 'Flight plan request',
        couponCode: 'WIX-TEST',
        birthdayPricingClaim: { fieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11', token: 'signed-claim' },
      })
    ).resolves.toEqual({ checkoutUrl: 'https://checkout.wix.com/pay/session' });

    expect(calls).toHaveLength(8);
    expect(calls[0]).toMatchObject({
      url: 'https://www.wixapis.com/_api/service-availability/v2/time-slots/get',
      body: {
        serviceId: 'service-id',
        localStartDate: '2026-11-09T10:00:00',
        location: { id: 'location-id', locationType: 'BUSINESS' },
      },
    });
    expect(calls[1]).toMatchObject({
      url: 'https://www.wixapis.com/bookings/v2/bookings',
      body: {
        booking: {
          selectedPaymentOption: 'ONLINE',
          additionalFields: [
            {
              id: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
              value: 'signed-claim',
              valueType: 'SHORT_TEXT',
            },
          ],
          bookedEntity: {
            slot: {
              scheduleId: 'schedule-id',
              startDate: '2026-11-09T08:00:00.000Z',
              endDate: '2026-11-09T09:00:00.000Z',
              location: { id: 'location-id', locationType: 'OWNER_BUSINESS' },
            },
          },
        },
        formSubmission: {
          first_name: 'Avi',
          last_name: 'Pilot',
          email: 'pilot@example.test',
          phone: '+972547773074',
          add_your_message: 'Flight plan request',
        },
      },
    });
    expect(calls[2]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts',
      body: {
        catalogItems: [
          {
            catalogReference: {
              appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97',
              catalogItemId: 'booking-id',
            },
          },
        ],
      },
    });
    expect(calls[3]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-id',
      method: 'PATCH',
      body: {
        cart: {
          id: 'cart-id',
          customerInfo: {
            firstName: 'Avi',
            lastName: 'Pilot',
            email: 'pilot@example.test',
            phone: '+972547773074',
          },
          paymentInfo: {
            billingContact: {
              firstName: 'Avi',
              lastName: 'Pilot',
              phone: '+972547773074',
            },
          },
        },
      },
    });
    expect(calls[4]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[5]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-coupon',
      body: { coupon: { code: 'WIX-TEST' } },
    });
    expect(calls[6]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[7]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/get-checkout-url');
  });

  it('does not open payment when Wix refuses the customer-details handoff to the cart', async () => {
    const calls: string[] = [];
    const replies = [
      response({ timeSlot: { bookable: true, scheduleId: 'schedule-id' } }),
      response({ booking: { id: 'booking-id' } }),
      response({ cart: { id: 'cart-id' } }),
      response({ message: 'Missing Write Carts V2 PII permission' }, 403),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        calls.push(String(input));
        const next = replies.shift();
        if (!next) throw new Error('payment must not be opened after a failed customer-details handoff');
        return next;
      },
    };

    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
      })
    ).rejects.toThrow('securely prepare your checkout');

    expect(calls).toEqual([
      'https://www.wixapis.com/_api/service-availability/v2/time-slots/get',
      'https://www.wixapis.com/bookings/v2/bookings',
      'https://www.wixapis.com/ecom/v2/carts',
      'https://www.wixapis.com/ecom/v2/carts/cart-id',
    ]);
  });

  it('returns Wix-calculated amounts and removes a zero-discount coupon from the same cart', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'KANTOQA100-20261105' }] } }),
      calculation('0', '690'),
      response({ cart: {} }),
      calculation('0', '690'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixCoupon(client, 'cart-id', 'KANTOQA100-20261105')).resolves.toEqual({
      couponId: 'coupon-id',
      price: { discountIls: 0, totalIls: 690 },
    });
    await expect(removeWixCoupon(client, 'cart-id', 'coupon-id')).resolves.toEqual({ discountIls: 0, totalIls: 690 });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-coupon',
        body: { coupon: { code: 'KANTOQA100-20261105' } },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/remove-coupon', body: { couponId: 'coupon-id' } },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('derives a Bookings line-item coupon discount from the before-and-after Wix totals', async () => {
    const replies = [
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'KANTOQA100-20261105' }] } }),
      calculation('0', '0'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async () => {
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixCoupon(client, 'cart-id', 'KANTOQA100-20261105', 690)).resolves.toEqual({
      couponId: 'coupon-id',
      price: { discountIls: 690, totalIls: 0 },
    });
  });

  it('applies a Wix Gift Card as stored value and exposes only Wix’s masked code', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({
        cart: {
          paymentInfo: {
            giftCards: [{ id: 'gift-card-id', obfuscatedCode: 'GC-••••-1234' }],
          },
        },
      }),
      giftCardCalculation('690', '500', '190'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixGiftCard(client, 'cart-id', 'GC-1234-5678-9012')).resolves.toEqual({
      giftCardId: 'gift-card-id',
      obfuscatedCode: 'GC-••••-1234',
      price: { discountIls: 0, giftCardAppliedIls: 500, totalIls: 190 },
    });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-gift-card',
        body: { giftCard: { code: 'GC-1234-5678-9012' } },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('removes a Wix Gift Card by its cart-scoped id and restores Wix’s calculated balance', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [response({ cart: {} }), calculation('0', '690')];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(removeWixGiftCard(client, 'cart-id', 'gift-card-id')).resolves.toEqual({ discountIls: 0, totalIls: 690 });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/remove-gift-card',
        body: { giftCardId: 'gift-card-id' },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('uses Israel daylight and standard time correctly and accepts local Israeli phone entry', () => {
    expect(wixLocalDateTimeToIso('2026-07-15T10:00:00', 'Asia/Jerusalem')).toBe('2026-07-15T07:00:00.000Z');
    expect(wixLocalDateTimeToIso('2026-11-09T10:00:00', 'Asia/Jerusalem')).toBe('2026-11-09T08:00:00.000Z');
    expect(normalizeWixBookingPhone('054 777 3074')).toBe('+972547773074');
  });

  it("stops before creating a booking when the visitor's revalidated slot is unavailable", async () => {
    const client: WixBrowserClient = {
      fetchWithAuth: async () => response({ timeSlot: { bookable: false } }),
    };
    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
      })
    ).rejects.toThrow('no longer available');
  });

  it('includes Wix Stores line items for selected addonIds in createWixCartForBooking and prepareWixBookingCheckout', async () => {
    const cartCalls: unknown[] = [];
    const cartOnlyClient: WixBrowserClient = {
      fetchWithAuth: async (_input, init) => {
        cartCalls.push(init?.body ? JSON.parse(String(init.body)) : null);
        return response({ cart: { id: 'cart-with-addons' } });
      },
    };

    await expect(
      createWixCartForBooking(cartOnlyClient, 'booking-123', ['addon-cold-dark', 'addon-unknown', 'addon-extra-seat'])
    ).resolves.toBe('cart-with-addons');

    expect(cartCalls).toEqual([
      {
        cart: { source: { channelType: 'WEB' } },
        catalogItems: [
          {
            quantity: 1,
            catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'booking-123' },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-cold-dark'] },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-extra-seat'] },
          },
        ],
      },
    ]);

    const prepareCalls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({ timeSlot: { bookable: true, scheduleId: 'schedule-id' } }),
      response({ booking: { id: 'booking-456' } }),
      response({ cart: { id: 'cart-456' } }),
      response({ cart: { id: 'cart-456' } }),
      calculation('0', '940'),
    ];
    const prepareClient: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        prepareCalls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(
      prepareWixBookingCheckout(prepareClient, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
        addonIds: ['addon-cold-dark'],
      })
    ).resolves.toEqual({ cartId: 'cart-456', price: { discountIls: 0, totalIls: 940 } });

    expect(prepareCalls[2]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts',
      body: {
        catalogItems: [
          {
            quantity: 1,
            catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'booking-456' },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-cold-dark'] },
          },
        ],
      },
    });
  });

  it('surfaces Wix applicationError.code, message, and description when cart creation fails', async () => {
    const client: WixBrowserClient = {
      fetchWithAuth: async () =>
        response(
          {
            message: 'Catalog item was not found',
            details: {
              applicationError: {
                code: 'ITEM_NOT_FOUND_IN_CATALOG',
                description: 'Product cold-dark-v1 does not exist in Wix Stores',
              },
            },
          },
          400
        ),
    };

    await expect(createWixCartForBooking(client, 'booking-123', ['addon-cold-dark'])).rejects.toThrow(
      'Wix did not create a checkout cart (400): ITEM_NOT_FOUND_IN_CATALOG — Catalog item was not found — Product cold-dark-v1 does not exist in Wix Stores'
    );
  });

  it('falls back cleanly when the cart creation error response is empty or non-JSON', async () => {
    const emptyClient: WixBrowserClient = {
      fetchWithAuth: async () => new Response(null, { status: 502 }),
    };
    await expect(createWixCartForBooking(emptyClient, 'booking-123')).rejects.toThrow(
      'Wix did not create a checkout cart. Please try again.'
    );

    const htmlErrorClient: WixBrowserClient = {
      fetchWithAuth: async () =>
        new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
    };
    await expect(createWixCartForBooking(htmlErrorClient, 'booking-123')).rejects.toThrow(
      'Wix did not create a checkout cart. Please try again.'
    );
  });
});
