import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readJson } from '../support/http';

const BOOKING_DATE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const BOOKING_INPUT = {
  packageId: 'pkg-captain-60',
  bookingDate: BOOKING_DATE,
  startTime: '10:15',
} as const;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('@/lib/wix/bookings');
  vi.doUnmock('@/lib/wix/catalog');
  vi.doUnmock('@/lib/wix/config');
  vi.doUnmock('@/lib/wix/booking-checkout');
  vi.doUnmock('@/lib/wix/subscription-booking');
});

describe('Wix subscription booking checkout slot', () => {
  it('returns only a live Wix slot that is also valid in the strict SimDream grid', async () => {
    const listWixAvailability = vi.fn(async () => ({
      timeSlots: [
        {
          serviceId: 'svc-captain-60',
          localStartDate: `${BOOKING_DATE}T10:15:00`,
          localEndDate: `${BOOKING_DATE}T11:15:00`,
          bookable: true,
        },
      ],
      timeZone: 'Asia/Jerusalem',
    }));
    vi.doMock('@/lib/wix/bookings', () => ({
      listWixAvailability,
      listWixServices: async () => [
        {
          id: 'svc-captain-60',
          serviceResources: [{ resourceType: { id: 'simulator-resource' } }],
          locations: [{ id: 'location-id', type: 'BUSINESS' }],
          payment: { options: { online: true, inPerson: false } },
        },
      ],
      wixResourceTypeIdsForService: () => ['simulator-resource'],
    }));
    vi.doMock('@/lib/wix/catalog', () => ({ wixServiceIdFor: () => 'svc-captain-60' }));
    vi.doMock('@/lib/wix/config', () => ({ isWixConfigured: () => true, WIX_TIME_ZONE: 'Asia/Jerusalem' }));

    const { resolveWixSubscriptionBookingCheckout } = await import('@/lib/wix/subscription-booking');
    const result = await resolveWixSubscriptionBookingCheckout(BOOKING_INPUT);

    expect(listWixAvailability).toHaveBeenCalledWith({
      serviceId: 'svc-captain-60',
      fromLocalDate: `${BOOKING_DATE}T00:00:00`,
      toLocalDate: `${BOOKING_DATE}T23:59:59`,
      includeResourceTypeIds: ['simulator-resource'],
    });
    expect(result).toEqual({
      timeZone: 'Asia/Jerusalem',
      slotAvailability: expect.objectContaining({ localStartDate: `${BOOKING_DATE}T10:15:00`, bookable: true }),
    });
  });

  it('refuses a Wix slot outside the strict zero-waste grid', async () => {
    vi.doMock('@/lib/wix/bookings', () => ({
      listWixAvailability: async () => ({
        timeSlots: [
          {
            serviceId: 'svc-captain-60',
            localStartDate: `${BOOKING_DATE}T10:00:00`,
            localEndDate: `${BOOKING_DATE}T11:00:00`,
            bookable: true,
          },
        ],
        timeZone: 'Asia/Jerusalem',
      }),
      listWixServices: async () => [
        {
          id: 'svc-captain-60',
          serviceResources: [{ resourceType: { id: 'simulator-resource' } }],
          locations: [{ id: 'location-id', type: 'BUSINESS' }],
          payment: { options: { online: true, inPerson: false } },
        },
      ],
      wixResourceTypeIdsForService: () => ['simulator-resource'],
    }));
    vi.doMock('@/lib/wix/catalog', () => ({ wixServiceIdFor: () => 'svc-captain-60' }));
    vi.doMock('@/lib/wix/config', () => ({ isWixConfigured: () => true, WIX_TIME_ZONE: 'Asia/Jerusalem' }));

    const { resolveWixSubscriptionBookingCheckout, WixSubscriptionBookingUnavailableError } = await import(
      '@/lib/wix/subscription-booking'
    );
    await expect(resolveWixSubscriptionBookingCheckout({ ...BOOKING_INPUT, startTime: '10:00' })).rejects.toBeInstanceOf(
      WixSubscriptionBookingUnavailableError
    );
  });
});

describe('POST /api/wix/bookings/checkout', () => {
  async function loadRoute(result: 'success' | 'unavailable' | 'failure') {
    vi.resetModules();
    const actual = await vi.importActual<typeof import('@/lib/wix/booking-checkout')>('@/lib/wix/booking-checkout');
    vi.doMock('@/lib/wix/booking-checkout', () => ({
      ...actual,
      resolveWixBookingCheckout:
        result === 'success'
          ? vi.fn(async () => ({
              timeZone: 'Asia/Jerusalem',
              slotAvailability: {
                serviceId: 'svc-captain-60',
                localStartDate: '2026-11-09T10:00:00',
                localEndDate: '2026-11-09T11:00:00',
                bookable: true,
              },
              location: { id: 'location-id', locationType: 'BUSINESS' },
              paymentOptions: { online: true, inPerson: false },
            }))
          : result === 'unavailable'
            ? vi.fn(async () => {
                throw new actual.WixBookingUnavailableError('unavailable');
              })
            : vi.fn(async () => {
                throw new Error('Wix service timeout');
              }),
    }));
    return import('@/app/api/wix/bookings/checkout/route');
  }

  it('returns a validated slot for Wix-hosted checkout and rejects malformed commands', async () => {
    const { POST } = await loadRoute('success');

    const accepted = await readJson(await POST(apiRequest('/api/wix/bookings/checkout', { body: BOOKING_INPUT })));
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({
      timeZone: 'Asia/Jerusalem',
      slotAvailability: { serviceId: 'svc-captain-60', localStartDate: '2026-11-09T10:00:00' },
    });

    const rejected = await readJson(await POST(apiRequest('/api/wix/bookings/checkout', { body: { ...BOOKING_INPUT, startTime: '25:90' } })));
    expect(rejected).toMatchObject({
      status: 400,
      body: { error: 'Use a valid package, date, and departure time.' },
    });
  });

  it('keeps unavailable and provider failures distinct without disclosing provider internals', async () => {
    const unavailableRoute = await loadRoute('unavailable');
    const unavailable = await readJson(await unavailableRoute.POST(apiRequest('/api/wix/bookings/checkout', { body: BOOKING_INPUT })));
    expect(unavailable).toMatchObject({
      status: 409,
      body: { error: 'That departure is no longer available. Please choose another time.' },
    });

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedRoute = await loadRoute('failure');
    const failed = await readJson(await failedRoute.POST(apiRequest('/api/wix/bookings/checkout', { body: BOOKING_INPUT })));
    expect(failed).toMatchObject({
      status: 503,
      body: { error: 'Wix booking is temporarily unavailable.' },
    });
  });
});
