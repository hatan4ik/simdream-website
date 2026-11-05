import { describe, expect, it } from 'vitest';
import {
  normalizeWixBookingPhone,
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

describe('Wix native booking checkout client', () => {
  it('keeps one visitor session across slot revalidation, booking, cart and hosted checkout', async () => {
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
      response({ summary: { violations: [] } }),
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

    expect(calls).toHaveLength(5);
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
        coupons: [{ code: 'WIX-TEST' }],
      },
    });
    expect(calls[3]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[4]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/get-checkout-url');
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
