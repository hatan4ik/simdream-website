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
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({
        timeSlot: {
          bookable: true,
          scheduleId: 'schedule-id',
          availableResources: [{ resources: [{ id: 'simulator-resource' }] }],
        },
      }),
      response({ booking: { id: 'booking-id' } }),
      response({ cart: { id: 'cart-id' } }),
      calculation('0', '690'),
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'WIX-TEST' }] } }),
      calculation('690', '0'),
      response({ checkoutUrl: 'https://checkout.wix.com/pay/session' }),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
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

    expect(calls).toHaveLength(7);
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
              resource: { id: 'simulator-resource' },
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
    expect(calls[3]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[4]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-coupon',
      body: { coupon: { code: 'WIX-TEST' } },
    });
    expect(calls[5]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[6]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/get-checkout-url');
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
