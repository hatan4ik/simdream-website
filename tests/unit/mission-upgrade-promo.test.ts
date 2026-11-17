import { describe, expect, it } from 'vitest';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { getLocalizedAddons, getLocalizedPackages, type Language } from '@/lib/i18n/translations';
import { getUpgradePromoCopy, resolveAddonToggle } from '@/lib/booking/client';
import { getKantorovichPricing, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import { calculateMissionManifest, pruneAddonsExceedingSlot } from '@/lib/scheduler/mission-calculator';
import {
  GRAND_120_ANCHOR_ILS,
  GRAND_120_PACKAGE_ID,
  GRAND_120_PRICE_ILS,
  MAX_MISSION_ADDONS,
  previewAddonUpgrade,
  resolveMissionUpgradePromo,
} from '@/lib/scheduler/mission-upgrade-promo';

const ALL_LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];
const pkgById = (id: string) => {
  const found = SIMULATOR_PACKAGES.find((p) => p.id === id);
  if (!found) throw new Error(`Missing package ${id}`);
  return found;
};
const addonById = (id: string) => {
  const found = FLIGHT_ADDONS.find((a) => a.id === id);
  if (!found) throw new Error(`Missing add-on ${id}`);
  return found;
};

describe('catalog & tariff updates', () => {
  it('updates Cold & Dark and X-Wind/IFR durations to 30 minutes while keeping standalone prices', () => {
    expect(addonById('addon-cold-dark')).toMatchObject({ durationMinutes: 30, priceIls: 200 });
    expect(addonById('addon-xwind-ifr')).toMatchObject({ durationMinutes: 30, priceIls: 250 });
  });

  it('unifies 90-minute consumer package to flat ₪850 all day (daytime, evening & Saturday)', () => {
    const ultimate90 = pkgById('pkg-ultimate-90');
    expect(ultimate90.priceIls).toBe(850);
    expect(ultimate90.primeTimePriceIls).toBeUndefined();
    expect(getKantorovichPricing(90, timeToMinutes('10:00'), false).dynamicPriceIls).toBe(850);
    expect(getKantorovichPricing(90, timeToMinutes('19:30'), false).dynamicPriceIls).toBe(850);
    expect(getKantorovichPricing(90, timeToMinutes('14:00'), true).dynamicPriceIls).toBe(850);
  });

  it('adds pkg-grand-120 at 120m / ₪1,200 while keeping pkg-assessment-prep-120 PRO untouched at ₪1,590', () => {
    const grand120 = pkgById(GRAND_120_PACKAGE_ID);
    const pro120 = pkgById('pkg-assessment-prep-120');
    expect(grand120).toMatchObject({
      slug: 'grand-odyssey-120',
      category: 'recreational',
      durationMinutes: 120,
      priceIls: GRAND_120_PRICE_ILS,
      priceUsd: 330,
      guestSeats: 2,
    });
    expect(grand120.kantorovichVar).toBeUndefined();
    expect(pro120).toMatchObject({ category: 'training', durationMinutes: 120, priceIls: 1590 });
  });
});

describe('Smart Promotional Tier Bump-Up engine', () => {
  it('keeps standard pricing when 0 mission add-ons are selected', () => {
    for (const id of ['pkg-discovery-30', 'pkg-promo-45', 'pkg-captain-60', 'pkg-ultimate-90', 'pkg-grand-120']) {
      const pkg = pkgById(id);
      const promo = resolveMissionUpgradePromo({ pkg, selectedAddonIds: [], availableAddons: FLIGHT_ADDONS });
      expect(promo.isPromoActive).toBe(false);
      expect(promo.effectiveDurationMinutes).toBe(pkg.durationMinutes);
      expect(promo.promoSubtotalIls).toBe(pkg.priceIls);
    }
  });

  it('never activates promo bump-up for Extra Seat alone and always adds +₪90 cleanly', () => {
    const pkg = pkgById('pkg-captain-60');
    const manifest = calculateMissionManifest({
      pkg,
      selectedAddonIds: ['addon-extra-seat'],
      availableAddons: FLIGHT_ADDONS,
    });
    expect(manifest.upgradePromo).toBeUndefined();
    expect(manifest.totalDurationMinutes).toBe(60);
    expect(manifest.subtotalIls).toBe(690 + 90);
  });

  it.each([
    ['pkg-discovery-30', 'addon-cold-dark', 'pkg-captain-60', 60, 690, 890, 200],
    ['pkg-discovery-30', 'addon-xwind-ifr', 'pkg-captain-60', 60, 690, 940, 250],
    ['pkg-discovery-30', 'addon-classical-eu', 'pkg-captain-60', 60, 690, 1140, 450],
    ['pkg-promo-45', 'addon-cold-dark', 'pkg-ultimate-90', 90, 850, 1050, 200],
    ['pkg-promo-45', 'addon-xwind-ifr', 'pkg-ultimate-90', 90, 850, 1100, 250],
    ['pkg-promo-45', 'addon-classical-eu', 'pkg-ultimate-90', 90, 850, 1300, 450],
    ['pkg-captain-60', 'addon-cold-dark', 'pkg-ultimate-90', 90, 850, 890, 40],
    ['pkg-captain-60', 'addon-xwind-ifr', 'pkg-ultimate-90', 90, 850, 940, 90],
    ['pkg-captain-60', 'addon-classical-eu', 'pkg-ultimate-90', 90, 850, 1140, 290],
    ['pkg-ultimate-90', 'addon-cold-dark', 'pkg-grand-120', 120, 1200, 1412, 212],
    ['pkg-ultimate-90', 'addon-xwind-ifr', 'pkg-grand-120', 120, 1200, 1412, 212],
    ['pkg-ultimate-90', 'addon-classical-eu', 'pkg-grand-120', 120, 1200, 1412, 212],
    ['pkg-grand-120', 'addon-cold-dark', 'pkg-grand-120', 120, 1200, 1412, 212],
    ['pkg-grand-120', 'addon-classical-eu', 'pkg-grand-120', 120, 1200, 1650, 450],
  ])(
    '1 mission add-on: %s + %s -> %s (%im, ₪%i, anchor ₪%i, save ₪%i)',
    (pkgId, addonId, expectedPkgId, expectedMin, expectedPrice, expectedAnchor, expectedSavings) => {
      const manifest = calculateMissionManifest({
        pkg: pkgById(pkgId),
        selectedAddonIds: [addonId],
        availableAddons: FLIGHT_ADDONS,
      });
      expect(manifest.totalDurationMinutes).toBe(expectedMin);
      expect(manifest.subtotalIls).toBe(expectedPrice);
      expect(manifest.upgradePromo).toMatchObject({
        isPromoActive: true,
        missionAddonCount: 1,
        effectivePackageId: expectedPkgId,
        effectiveDurationMinutes: expectedMin,
        effectiveTierPriceIls: expectedPrice,
        promoSubtotalIls: expectedPrice,
        strikeOutAnchorSubtotalIls: expectedAnchor,
        savingsIls: expectedSavings,
        bundledMissionAddonIds: [addonId],
        standalonePaidAddonIds: [],
      });
    }
  );

  it.each([
    ['pkg-discovery-30', ['addon-cold-dark', 'addon-xwind-ifr'], 1412, 15],
    ['pkg-promo-45', ['addon-cold-dark', 'addon-classical-eu'], 1412, 15],
    ['pkg-captain-60', ['addon-classical-eu', 'addon-med-islands'], 1590, 25],
    ['pkg-ultimate-90', ['addon-classical-eu', 'addon-med-islands'], 1750, 31],
    ['pkg-grand-120', ['addon-classical-eu', 'addon-med-islands'], 2100, 43],
  ])(
    '2 mission add-ons from %s -> pkg-grand-120 (120m, ₪1,200, anchor ₪%i, %i%% OFF)',
    (pkgId, addonIds, expectedAnchor, expectedPercent) => {
      const manifest = calculateMissionManifest({
        pkg: pkgById(pkgId),
        selectedAddonIds: addonIds,
        availableAddons: FLIGHT_ADDONS,
      });
      expect(manifest.totalDurationMinutes).toBe(120);
      expect(manifest.subtotalIls).toBe(GRAND_120_PRICE_ILS);
      expect(manifest.upgradePromo).toMatchObject({
        isPromoActive: true,
        missionAddonCount: MAX_MISSION_ADDONS,
        effectivePackageId: GRAND_120_PACKAGE_ID,
        effectiveDurationMinutes: 120,
        promoSubtotalIls: GRAND_120_PRICE_ILS,
        strikeOutAnchorSubtotalIls: expectedAnchor,
        discountPercent: expectedPercent,
      });
      expect(manifest.upgradePromo?.discountPercent).toBeGreaterThanOrEqual(15);
    }
  );

  it('adds Extra Seat (+₪90) cleanly on top of a 120m promo pack without diluting 15% OFF', () => {
    const manifest = calculateMissionManifest({
      pkg: pkgById('pkg-discovery-30'),
      selectedAddonIds: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extra-seat'],
      availableAddons: FLIGHT_ADDONS,
    });
    expect(manifest.totalDurationMinutes).toBe(120);
    expect(manifest.subtotalIls).toBe(GRAND_120_PRICE_ILS + 90);
    expect(manifest.upgradePromo).toMatchObject({
      effectiveTierPriceIls: GRAND_120_PRICE_ILS,
      nonMissionAddonsPriceIls: 90,
      promoSubtotalIls: GRAND_120_PRICE_ILS + 90,
      strikeOutAnchorSubtotalIls: GRAND_120_ANCHOR_ILS + 90,
      discountPercent: 15,
      standalonePaidAddonIds: ['addon-extra-seat'],
    });
  });

  it('enforces the Max 2 Mission Add-Ons cap while keeping Extra Seat selectable and fitting 2 Trios in 120m', () => {
    const twoTrios = ['addon-classical-eu', 'addon-med-islands'];

    // Adding 2nd Trio on 60m package fits cleanly inside a 120m slot (120m, NOT 140m).
    expect(
      resolveAddonToggle({
        addonId: 'addon-med-islands',
        selectedAddonIds: ['addon-classical-eu'],
        addons: FLIGHT_ADDONS,
        baseDurationMinutes: 60,
        packageCategory: 'recreational',
        totalDurationMinutes: 90,
        maxSlotMinutes: 120,
      })
    ).toEqual({ kind: 'set', ids: twoTrios });

    // Adding a 3rd mission add-on is blocked by the 2-upgrade cap.
    expect(
      resolveAddonToggle({
        addonId: 'addon-cold-dark',
        selectedAddonIds: twoTrios,
        addons: FLIGHT_ADDONS,
        baseDurationMinutes: 60,
        packageCategory: 'recreational',
        totalDurationMinutes: 120,
        maxSlotMinutes: 180,
      })
    ).toEqual({ kind: 'max-mission-addons' });

    // Extra Seat remains selectable even when 2 mission add-ons are already active.
    expect(
      resolveAddonToggle({
        addonId: 'addon-extra-seat',
        selectedAddonIds: twoTrios,
        addons: FLIGHT_ADDONS,
        baseDurationMinutes: 60,
        packageCategory: 'recreational',
        totalDurationMinutes: 120,
        maxSlotMinutes: 120,
      })
    ).toEqual({ kind: 'set', ids: [...twoTrios, 'addon-extra-seat'] });

    // Pruning enforces the 2-mission cap while preserving Extra Seat.
    expect(
      pruneAddonsExceedingSlot(
        ['addon-classical-eu', 'addon-med-islands', 'addon-cold-dark', 'addon-extra-seat'],
        FLIGHT_ADDONS,
        60,
        120,
        'recreational'
      )
    ).toEqual(['addon-classical-eu', 'addon-med-islands', 'addon-extra-seat']);

    // Card preview marks 3rd mission add-on as capped, while Extra Seat is not capped.
    expect(
      previewAddonUpgrade({
        pkg: pkgById('pkg-captain-60'),
        selectedAddonIds: twoTrios,
        candidateAddon: addonById('addon-cold-dark'),
        availableAddons: FLIGHT_ADDONS,
        maxSlotMinutes: 180,
      }).wouldExceedCap
    ).toBe(true);
    expect(
      previewAddonUpgrade({
        pkg: pkgById('pkg-captain-60'),
        selectedAddonIds: twoTrios,
        candidateAddon: addonById('addon-extra-seat'),
        availableAddons: FLIGHT_ADDONS,
        maxSlotMinutes: 120,
      }).wouldExceedCap
    ).toBe(false);
  });
});

describe('7-language copy friction removal & promo copy completeness', () => {
  it.each(ALL_LANGUAGES)('removes prep/turnaround jargon, flight certificates, and ₪950 split in %s', (lang) => {
    const packages = getLocalizedPackages(lang);
    const promo45 = packages.find((p) => p.id === 'pkg-promo-45')!;
    const fof = packages.find((p) => p.id === 'pkg-fear-of-flying-90')!;
    const ultimate90 = packages.find((p) => p.id === 'pkg-ultimate-90')!;
    const grand120 = packages.find((p) => p.id === 'pkg-grand-120')!;

    const promo45Text = `${promo45.description} ${promo45.features.join(' ')}`;
    expect(promo45Text).not.toMatch(/15m Prep|60m Slot|15-minute technical|התארגנות|пауза|prép\.|تحضير|Vorbereitung|turnaround/i);

    expect(fof.features.join(' ')).not.toMatch(/15m Prep|\(60m \+/i);

    const ultimateText = `${ultimate90.description} ${ultimate90.features.join(' ')}`;
    expect(ultimateText).not.toContain('950');

    for (const pkg of packages) {
      const joined = pkg.features.join(' ');
      expect(joined).not.toMatch(/Flight Certificate|תעודת טיסה|תעודת קברניט|сертификат|Certificat de vol|شهادة طيران|شهادة كابتن|Flugurkunde/i);
    }

    expect(grand120.title.trim().length).toBeGreaterThan(5);
    expect(grand120.features.length).toBe(6);

    const addons = getLocalizedAddons(lang);
    expect(addons.find((a) => a.id === 'addon-cold-dark')?.description).toContain('30');
    expect(addons.find((a) => a.id === 'addon-xwind-ifr')?.description).toContain('30');

    const copy = getUpgradePromoCopy(lang);
    expect(copy.promoUpgradeBadge(90).trim().length).toBeGreaterThan(0);
    expect(copy.percentOffTierBadge(15, 120).trim().length).toBeGreaterThan(0);
    expect(copy.maxUpgradesReached.trim().length).toBeGreaterThan(0);
    expect(copy.includedInPromo.trim().length).toBeGreaterThan(0);
    expect(copy.grandOdysseyBanner(15).trim().length).toBeGreaterThan(0);
  });
});
