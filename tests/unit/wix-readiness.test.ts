import { describe, expect, it } from 'vitest';
import { assessWixReadiness } from '@/lib/wix/readiness';

const PASS_IDS = [
  'flight-foundations-5x60',
  'advanced-captain-5x90',
  'atpl-concepts-10x60',
  'airline-readiness-10x90',
  'pro-interview-3x90',
  'pro-interview-5x60',
] as const;

describe('Wix Headless cutover readiness', () => {
  it('permits a read-only shadow or Bookings pilot only with an aligned catalog', () => {
    const report = assessWixReadiness({
      wixConfigured: true,
      unmappedPackageIds: [],
      catalogMismatches: [],
      sharedCapacityResourceTypeIds: ['boeing-737-resource-type'],
      expectedSubscriptionPassIds: PASS_IDS,
      resolvedSubscriptionPassIds: PASS_IDS,
    });

    expect(report.blockers).toEqual([]);
    expect(report.catalogAligned).toBe(true);
    expect(report.capacityPoolAligned).toBe(true);
    expect(report.canRunShadowReads).toBe(true);
    expect(report.canPilotWixBookings).toBe(true);
    expect(report.canRouteSubscriptionCheckout).toBe(true);
  });

  it('blocks the affected integration path when public configuration is absent', () => {
    const report = assessWixReadiness({
      wixConfigured: false,
      unmappedPackageIds: [],
      catalogMismatches: [],
      sharedCapacityResourceTypeIds: ['boeing-737-resource-type'],
      expectedSubscriptionPassIds: PASS_IDS,
      resolvedSubscriptionPassIds: PASS_IDS,
    });

    expect(report.blockers.map((blocker) => blocker.code)).toEqual(['wix-not-configured']);
    expect(report.canRunShadowReads).toBe(false);
    expect(report.canPilotWixBookings).toBe(false);
    expect(report.canRouteSubscriptionCheckout).toBe(false);
  });

  it('separates catalog parity from Pricing Plans readiness', () => {
    const report = assessWixReadiness({
      wixConfigured: true,
      unmappedPackageIds: ['pkg-discovery-30'],
      catalogMismatches: [
        {
          packageId: 'pkg-discovery-30',
          serviceId: 'service-id',
          field: 'duration',
          expected: '30',
          actual: '20',
        },
      ],
      sharedCapacityResourceTypeIds: ['boeing-737-resource-type'],
      expectedSubscriptionPassIds: PASS_IDS,
      resolvedSubscriptionPassIds: ['flight-foundations-5x60'],
    });

    expect(report.catalogAligned).toBe(false);
    expect(report.unresolvedSubscriptionPassIds).toEqual([
      'advanced-captain-5x90',
      'atpl-concepts-10x60',
      'airline-readiness-10x90',
      'pro-interview-3x90',
      'pro-interview-5x60',
    ]);
    expect(report.canRunShadowReads).toBe(false);
    expect(report.canPilotWixBookings).toBe(false);
    expect(report.canRouteSubscriptionCheckout).toBe(false);
    expect(report.blockers.map((blocker) => blocker.code)).toEqual([
      'unmapped-packages',
      'catalog-drift',
      'unresolved-subscription-plans',
    ]);
  });

  it('blocks a Bookings pilot when services are not tied to one physical capacity pool', () => {
    const report = assessWixReadiness({
      wixConfigured: true,
      unmappedPackageIds: [],
      catalogMismatches: [],
      sharedCapacityResourceTypeIds: [],
      expectedSubscriptionPassIds: PASS_IDS,
      resolvedSubscriptionPassIds: PASS_IDS,
    });

    expect(report.blockers.map((blocker) => blocker.code)).toEqual(['no-shared-capacity-resource']);
    expect(report.capacityPoolAligned).toBe(false);
    expect(report.canRunShadowReads).toBe(false);
    expect(report.canPilotWixBookings).toBe(false);
    expect(report.canRouteSubscriptionCheckout).toBe(true);
    expect(report.canRouteGiftCardCheckout).toBe(true);
  });

  it('blocks gift card checkout routing when Wix Gift Card preset variants drift', () => {
    const report = assessWixReadiness({
      wixConfigured: true,
      unmappedPackageIds: [],
      catalogMismatches: [],
      sharedCapacityResourceTypeIds: ['boeing-737-resource-type'],
      expectedSubscriptionPassIds: PASS_IDS,
      resolvedSubscriptionPassIds: PASS_IDS,
      giftCardMismatches: [
        {
          designId: 'skyline',
          amountIls: 50,
          field: 'variant_missing',
          expected: '1110f759-2c10-48d0-8642-6440a873479a',
          actual: 'missing',
        },
      ],
    });

    expect(report.giftCardsAligned).toBe(false);
    expect(report.canRouteGiftCardCheckout).toBe(false);
    expect(report.canPilotWixBookings).toBe(true);
    expect(report.blockers.map((blocker) => blocker.code)).toEqual(['gift-card-drift']);
  });
});
