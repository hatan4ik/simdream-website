import { describe, expect, it } from 'vitest';
import { FLIGHT_ADDONS } from '@/lib/db/seed-data';
import { WIX_SERVICE_IDS } from '@/lib/wix/catalog';
import {
  WIX_NATIVE_ADDON_ENTRIES,
  WIX_NATIVE_ADDON_PACKAGE_IDS,
  wixAvailabilityAddOnIds,
  wixBookedAddOnsFor,
  wixNativeAddonIdsFor,
} from '@/lib/wix/native-addons';

describe('native Wix Bookings add-ons', () => {
  it('maps every flight add-on of the registry, and no other id', () => {
    expect(Object.keys(WIX_NATIVE_ADDON_ENTRIES).sort()).toEqual(FLIGHT_ADDONS.map((addon) => addon.id).sort());
  });

  it('flags an add-on as duration based exactly when the registry gives it minutes', () => {
    for (const addon of FLIGHT_ADDONS) {
      expect(WIX_NATIVE_ADDON_ENTRIES[addon.id].durationBased, addon.id).toBe((addon.durationMinutes ?? 0) > 0);
    }
  });

  it('only covers packages that exist as Wix services', () => {
    for (const packageId of WIX_NATIVE_ADDON_PACKAGE_IDS) {
      expect(WIX_SERVICE_IDS[packageId], packageId).toBeTruthy();
    }
  });

  it('builds the bookedAddOns Wix expects: id and groupId, a quantity only for a quantity add-on', () => {
    expect(wixBookedAddOnsFor('pkg-captain-60', ['addon-cold-dark', 'addon-extra-seat'])).toEqual([
      { id: '3f25e6d1-1c6b-4f6a-825e-10daf5603a02', groupId: 'eda87110-b97d-4381-95af-0f703a463a3f' },
      { id: 'fc135398-ed27-49e0-9505-3b7efa7f2502', groupId: '98af09e5-e535-4f3d-b67e-9480627e43c7', quantity: 1 },
    ]);
  });

  it('uses the group of the booked service, not another service', () => {
    const [cold30] = wixBookedAddOnsFor('pkg-discovery-30', ['addon-cold-dark']);
    const [cold90] = wixBookedAddOnsFor('pkg-ultimate-90', ['addon-cold-dark']);
    expect(cold30.id).toBe(cold90.id);
    expect(cold30.groupId).toBe('8b1f7a06-b0bf-4bdc-992a-4bc42dacdb0c');
    expect(cold90.groupId).toBe('c13692ba-a2cd-41bb-8a86-03894d3d65f1');
  });

  it('puts a World Trio in the trios group', () => {
    const [trio] = wixBookedAddOnsFor('pkg-promo-45', ['addon-classical-eu']);
    expect(trio).toEqual({ id: '8791f47e-1c3d-47fa-9e11-b365a3f5ff8d', groupId: '797ca687-478f-4343-aa3f-41d98475a1d1' });
  });

  it('ignores duplicates, unknown ids and packages without native add-ons', () => {
    expect(wixBookedAddOnsFor('pkg-captain-60', ['addon-cold-dark', 'addon-cold-dark', 'addon-nope'])).toHaveLength(1);
    expect(wixBookedAddOnsFor('pkg-pro-60', ['addon-cold-dark'])).toEqual([]);
    expect(wixBookedAddOnsFor('pkg-captain-60', undefined)).toEqual([]);
  });

  it('asks the availability query only about duration add-ons, never the seat', () => {
    expect(wixAvailabilityAddOnIds('pkg-captain-60', ['addon-cold-dark', 'addon-extra-seat', 'addon-classical-eu'])).toEqual([
      '3f25e6d1-1c6b-4f6a-825e-10daf5603a02',
      '8791f47e-1c3d-47fa-9e11-b365a3f5ff8d',
    ]);
    expect(wixAvailabilityAddOnIds('pkg-captain-60', ['addon-extra-seat'])).toEqual([]);
  });

  it('lists the SimDream add-on ids that Wix now books natively, so the cart skips their Stores product', () => {
    expect(wixNativeAddonIdsFor('pkg-captain-60', ['addon-cold-dark', 'addon-extra-seat', 'addon-nope'])).toEqual([
      'addon-cold-dark',
      'addon-extra-seat',
    ]);
    expect(wixNativeAddonIdsFor('pkg-pro-90', ['addon-cold-dark'])).toEqual([]);
  });
});
