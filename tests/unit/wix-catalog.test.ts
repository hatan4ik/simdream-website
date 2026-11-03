import { afterEach, describe, expect, it } from 'vitest';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { WIX_SERVICE_IDS, packageIdForWixService, unmappedPackageIds, wixServiceIdFor } from '@/lib/wix/catalog';
import { reconcileCatalog, type WixService } from '@/lib/wix/bookings';
import { isWixConfigured } from '@/lib/wix/config';
import { getWixClient, resetWixClientForTests, WixNotConfiguredError } from '@/lib/wix/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A service shaped like the live Query Services response, built from a catalog package. */
function liveService(packageId: string, overrides: Partial<WixService> = {}): WixService {
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId)!;
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

describe('Wix service map', () => {
  it('maps every catalog package to exactly one Wix service id', () => {
    expect(unmappedPackageIds()).toEqual([]);
    const ids = Object.values(WIX_SERVICE_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it('resolves ids in both directions and rejects unknown ones', () => {
    const serviceId = wixServiceIdFor('pkg-captain-60');
    expect(serviceId).toMatch(UUID);
    expect(packageIdForWixService(serviceId!)).toBe('pkg-captain-60');
    expect(wixServiceIdFor('pkg-does-not-exist')).toBeNull();
    expect(packageIdForWixService('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('reconcileCatalog', () => {
  it('reports nothing when the live services match the catalog', () => {
    const services = Object.keys(WIX_SERVICE_IDS).map((packageId) => liveService(packageId));
    expect(reconcileCatalog(services)).toEqual([]);
  });

  it('accepts a varied price whose minimum equals the catalog price', () => {
    const services = Object.keys(WIX_SERVICE_IDS).map((packageId) =>
      packageId === 'pkg-ultimate-90'
        ? liveService(packageId, {
            payment: { rateType: 'VARIED', varied: { minPrice: { value: '850' }, maxPrice: { value: '950' } } },
          })
        : liveService(packageId)
    );
    expect(reconcileCatalog(services)).toEqual([]);
  });

  it('flags a missing service and a drifted name, duration, price or visibility', () => {
    const services = Object.keys(WIX_SERVICE_IDS)
      .filter((packageId) => packageId !== 'pkg-corporate-crm')
      .map((packageId) =>
        packageId === 'pkg-pro-60'
          ? liveService(packageId, {
              name: 'Airline Interview Prep 60',
              hidden: true,
              schedule: { availabilityConstraints: { sessionDurations: [75] } },
              payment: { rateType: 'FIXED', fixed: { price: { value: '990' } } },
            })
          : liveService(packageId)
      );

    const fields = reconcileCatalog(services).map((m) => `${m.packageId}:${m.field}`);
    expect(fields).toEqual(
      expect.arrayContaining([
        'pkg-pro-60:name',
        'pkg-pro-60:hidden',
        'pkg-pro-60:duration',
        'pkg-pro-60:price',
        'pkg-corporate-crm:missing',
      ])
    );
    expect(fields).toHaveLength(5);
  });
});

describe('Wix client configuration', () => {
  const original = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
    else process.env.NEXT_PUBLIC_WIX_CLIENT_ID = original;
    resetWixClientForTests();
  });

  it('is off, and the client refuses to build, without a client id', () => {
    delete process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
    expect(isWixConfigured()).toBe(false);
    expect(() => getWixClient()).toThrow(WixNotConfiguredError);
  });

  it('builds one reusable client once a client id is set', () => {
    process.env.NEXT_PUBLIC_WIX_CLIENT_ID = 'a7828197-5f0a-4580-9535-55fa889b5f9a';
    resetWixClientForTests();
    expect(isWixConfigured()).toBe(true);
    const client = getWixClient();
    expect(typeof client.fetchWithAuth).toBe('function');
    expect(getWixClient()).toBe(client);
  });
});
