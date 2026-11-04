import { describe, expect, it } from 'vitest';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { WIX_SERVICE_IDS } from '@/lib/wix/catalog';
import {
  createWixCheckoutShadowObserver,
  runWixCheckoutShadow,
  type WixShadowReadClient,
} from '@/lib/wix/checkout-shadow';
import type { WixService } from '@/lib/wix/bookings';

const candidate = {
  packageId: 'pkg-captain-60',
  bookingDate: '2026-11-11',
  startTime: '10:00',
  durationMinutes: 60,
};

function wixService(packageId: string, overrides: Partial<WixService> = {}): WixService {
  const pkg = SIMULATOR_PACKAGES.find((item) => item.id === packageId)!;
  return {
    id: WIX_SERVICE_IDS[packageId],
    name: pkg.title,
    type: 'APPOINTMENT',
    hidden: false,
    schedule: { availabilityConstraints: { sessionDurations: [pkg.durationMinutes] } },
    payment: { rateType: 'FIXED', fixed: { price: { value: String(pkg.priceIls), currency: 'ILS' } } },
    ...overrides,
  };
}

function readClient(options: { services?: WixService[]; slots?: { localStartDate: string; localEndDate: string }[] } = {}): WixShadowReadClient {
  return {
    listServices: async () => options.services ?? Object.keys(WIX_SERVICE_IDS).map((packageId) => wixService(packageId)),
    listAvailability: async () => ({
      timeZone: 'Asia/Jerusalem',
      timeSlots: options.slots ?? [
        {
          serviceId: WIX_SERVICE_IDS['pkg-captain-60'],
          localStartDate: '2026-11-11T10:00:00',
          localEndDate: '2026-11-11T11:00:00',
          bookable: true,
        },
      ],
    }),
  };
}

describe('Wix checkout shadow', () => {
  it('reports a matching read-only catalog and selected slot without customer data', async () => {
    const report = await runWixCheckoutShadow(candidate, 'shadow-1', readClient());

    expect(report).toMatchObject({
      correlationId: 'shadow-1',
      serviceId: WIX_SERVICE_IDS['pkg-captain-60'],
      localSchedulerAccepted: true,
      wixSlotAvailable: true,
      catalogMismatchFields: [],
      issues: [],
    });
    expect(JSON.stringify(report)).not.toMatch(/email|phone|voucher|payment/i);
  });

  it('reports catalog and availability drift but never treats it as a checkout failure', async () => {
    const services = Object.keys(WIX_SERVICE_IDS).map((packageId) => wixService(packageId));
    const captain = services.find((service) => service.id === WIX_SERVICE_IDS['pkg-captain-60'])!;
    captain.payment = { rateType: 'FIXED', fixed: { price: { value: '999' } } };

    const report = await runWixCheckoutShadow(candidate, 'shadow-2', readClient({ services, slots: [] }));

    expect(report.catalogMismatchFields).toContain('price');
    expect(report.issues).toEqual(['catalog-drift', 'availability-mismatch']);
    expect(report.wixSlotAvailable).toBe(false);
  });

  it('does not build an observer while the feature flag is disabled', () => {
    expect(createWixCheckoutShadowObserver({ enabled: false })).toBeNull();
  });

  it('redacts a failed Wix read and resolves normally for the checkout caller', async () => {
    const events: unknown[] = [];
    const observer = createWixCheckoutShadowObserver({
      enabled: true,
      reads: {
        listServices: async () => {
          throw new Error('provider outage');
        },
        listAvailability: async () => ({ timeSlots: [], timeZone: 'Asia/Jerusalem' }),
      },
      emit: (event) => events.push(event),
      createCorrelationId: () => 'shadow-3',
    });

    await expect(observer!.observeBookingCandidate(candidate)).resolves.toBeUndefined();
    expect(events).toEqual([
      {
        event: 'wix_checkout_shadow_failed',
        correlationId: 'shadow-3',
        packageId: candidate.packageId,
        bookingDate: candidate.bookingDate,
        startTime: candidate.startTime,
        reason: 'read-failed',
      },
    ]);
  });
});
