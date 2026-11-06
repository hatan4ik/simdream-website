import { describe, expect, it } from 'vitest';
import {
  applyWixCoupon,
  normalizeWixBookingPhone,
  removeWixCoupon,
  startWixBookingCheckout,
  wixLocalDateTimeToIso,
  type WixBrowserClient,
  type WixNativeCheckoutCandidate,
} from '@/lib/wix/booking-checkout-client';

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
});
