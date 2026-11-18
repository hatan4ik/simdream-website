import type { FlightAddon, MissionUpgradePromo, PackageCategory, SimulatorPackage } from '@/types';

/** Maximum time-extending mission upgrades / World Trios allowed in one recreational session. */
export const MAX_MISSION_ADDONS = 2;

export const CAPTAIN_60_PACKAGE_ID = 'pkg-captain-60';
export const CAPTAIN_60_PRICE_ILS = 690;

export const ULTIMATE_90_PACKAGE_ID = 'pkg-ultimate-90';
export const ULTIMATE_90_PRICE_ILS = 850;

export const GRAND_120_PACKAGE_ID = 'pkg-grand-120';
export const GRAND_120_PRICE_ILS = 1200;
/** 15% OFF promotional anchor for the 120-minute Grand Odyssey tier (₪1,412 → ₪1,200). */
export const GRAND_120_ANCHOR_ILS = 1412;

export type MissionPromoPackageInput = Pick<
  SimulatorPackage,
  'title' | 'durationMinutes' | 'priceIls' | 'primeTimePriceIls'
> &
  Partial<Pick<SimulatorPackage, 'id' | 'category'>>;

export interface ResolveMissionUpgradePromoInput {
  pkg: MissionPromoPackageInput;
  isPrimeTime?: boolean;
  selectedAddonIds: readonly string[];
  availableAddons: readonly FlightAddon[];
}

export interface AddonUpgradePreview {
  isMission: boolean;
  isChecked: boolean;
  wouldExceedCap: boolean;
  effectiveDurationAfterAdd: number;
  fitsSlot: boolean;
  previewPromo: MissionUpgradePromo;
}

export type DurationAvailabilitySummary = Readonly<Record<number, { availableCount: number }>>;

/**
 * Checks whether an upgraded recreational duration can be booked on the selected date.
 * When `durationAvailability` reports the upgraded duration's own grid count, that day-level
 * availability decides (the schedule switches to the upgraded duration's grid); otherwise it
 * falls back to the selected departure's continuous `maxSlotMinutes` window.
 */
export function canUpgradedDurationFit(
  nextDurationMinutes: number,
  maxSlotMinutes: number,
  durationAvailability?: DurationAvailabilitySummary
): boolean {
  if (durationAvailability && Object.prototype.hasOwnProperty.call(durationAvailability, nextDurationMinutes)) {
    return (durationAvailability[nextDurationMinutes]?.availableCount ?? 0) > 0;
  }
  return nextDurationMinutes <= maxSlotMinutes;
}

/** True for cockpit/weather/World Trio upgrades that extend flight time; false for Extra Seat (0m). */
export function isMissionAddon(addon: Pick<FlightAddon, 'durationMinutes'>): boolean {
  return (addon.durationMinutes || 0) > 0;
}

/** Counts unique selected time-extending mission add-ons present in the catalog. */
export function countSelectedMissionAddons(
  selectedAddonIds: readonly string[],
  availableAddons: readonly Pick<FlightAddon, 'id' | 'durationMinutes'>[]
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const id of selectedAddonIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const addon = availableAddons.find((candidate) => candidate.id === id);
    if (addon && isMissionAddon(addon)) count += 1;
  }
  return count;
}

/** True once the customer has selected the maximum number of mission upgrades (2). */
export function isMissionAddonCapReached(
  selectedAddonIds: readonly string[],
  availableAddons: readonly Pick<FlightAddon, 'id' | 'durationMinutes'>[]
): boolean {
  return countSelectedMissionAddons(selectedAddonIds, availableAddons) >= MAX_MISSION_ADDONS;
}

/**
 * Pure duration ladder for recreational bookings:
 * - 0 mission add-ons -> base duration
 * - 1 mission add-on  -> 30m -> 60m, 45m/60m -> 90m, 90m/120m -> 120m
 * - 2 mission add-ons -> 120m from any consumer base
 */
export function resolveUpgradedDurationMinutes(
  baseDurationMinutes: number,
  missionAddonCount: number
): number {
  if (missionAddonCount <= 0) return baseDurationMinutes;
  if (missionAddonCount >= 2) return 120;
  if (baseDurationMinutes <= 30) return 60;
  if (baseDurationMinutes <= 60) return 90;
  return 120;
}

/**
 * Computes effective mission duration in minutes. Recreational bookings follow the
 * promotional tier ladder (60m / 90m / 120m); non-recreational or generic callers
 * retain additive math.
 */
export function computeEffectiveMissionDuration(
  baseDurationMinutes: number,
  selectedAddonIds: readonly string[],
  availableAddons: readonly Pick<FlightAddon, 'id' | 'durationMinutes'>[],
  category?: PackageCategory
): number {
  if (category === 'recreational') {
    const missionCount = Math.min(
      MAX_MISSION_ADDONS,
      countSelectedMissionAddons(selectedAddonIds, availableAddons)
    );
    return resolveUpgradedDurationMinutes(baseDurationMinutes, missionCount);
  }
  return (
    baseDurationMinutes +
    selectedAddonIds.reduce(
      (total, addonId) =>
        total + (availableAddons.find((addon) => addon.id === addonId)?.durationMinutes ?? 0),
      0
    )
  );
}

/**
 * Single source of truth for the Smart Promotional Tier Bump-Up pricing & duration engine.
 * Shared across `calculateMissionManifest`, server checkout, Wix cart checkout, Guided Wizard,
 * and Express Shop so displayed totals, anchors, and charged amounts always agree 1:1.
 */
export function resolveMissionUpgradePromo(
  input: ResolveMissionUpgradePromoInput
): MissionUpgradePromo {
  const { pkg, isPrimeTime = false, selectedAddonIds, availableAddons } = input;
  const basePriceIls = isPrimeTime && pkg.primeTimePriceIls ? pkg.primeTimePriceIls : pkg.priceIls;

  const seen = new Set<string>();
  const missionAddons: FlightAddon[] = [];
  const nonMissionAddons: FlightAddon[] = [];

  for (const id of selectedAddonIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const addon = availableAddons.find((candidate) => candidate.id === id);
    if (!addon) continue;
    if (isMissionAddon(addon)) missionAddons.push(addon);
    else nonMissionAddons.push(addon);
  }

  const nonMissionAddonsPriceIls = nonMissionAddons.reduce((sum, addon) => sum + addon.priceIls, 0);
  const standalonePaidAddonIds = nonMissionAddons.map((addon) => addon.id);

  if (pkg.category !== 'recreational' || missionAddons.length === 0) {
    const missionSumPrice = missionAddons.reduce((sum, addon) => sum + addon.priceIls, 0);
    const missionSumMin = missionAddons.reduce((sum, addon) => sum + (addon.durationMinutes || 0), 0);
    const subtotal = basePriceIls + missionSumPrice + nonMissionAddonsPriceIls;
    return {
      isPromoActive: false,
      missionAddonCount: missionAddons.length,
      effectivePackageId: pkg.id ?? '',
      effectiveDurationMinutes: pkg.durationMinutes + missionSumMin,
      effectiveTierPriceIls: basePriceIls + missionSumPrice,
      nonMissionAddonsPriceIls,
      promoSubtotalIls: subtotal,
      strikeOutAnchorSubtotalIls: subtotal,
      savingsIls: 0,
      discountPercent: 0,
      bundledMissionAddonIds: [],
      standalonePaidAddonIds: [...missionAddons.map((a) => a.id), ...standalonePaidAddonIds],
    };
  }

  const effectiveMissionAddons = missionAddons.slice(0, MAX_MISSION_ADDONS);
  const bundledMissionAddonIds = effectiveMissionAddons.map((addon) => addon.id);

  let effectivePackageId: string;
  let effectiveDurationMinutes: number;
  let effectiveTierPriceIls: number;
  let tierAnchorIls: number;

  if (effectiveMissionAddons.length === 1) {
    const addonPrice = effectiveMissionAddons[0].priceIls;
    if (pkg.durationMinutes <= 30) {
      effectivePackageId = CAPTAIN_60_PACKAGE_ID;
      effectiveDurationMinutes = 60;
      effectiveTierPriceIls = CAPTAIN_60_PRICE_ILS;
      tierAnchorIls = Math.max(basePriceIls + addonPrice, CAPTAIN_60_PRICE_ILS + addonPrice);
    } else if (pkg.durationMinutes === 45) {
      effectivePackageId = ULTIMATE_90_PACKAGE_ID;
      effectiveDurationMinutes = 90;
      effectiveTierPriceIls = ULTIMATE_90_PRICE_ILS;
      tierAnchorIls = ULTIMATE_90_PRICE_ILS + addonPrice;
    } else if (pkg.durationMinutes === 60) {
      effectivePackageId = ULTIMATE_90_PACKAGE_ID;
      effectiveDurationMinutes = 90;
      effectiveTierPriceIls = ULTIMATE_90_PRICE_ILS;
      tierAnchorIls = basePriceIls + addonPrice;
    } else {
      effectivePackageId = GRAND_120_PACKAGE_ID;
      effectiveDurationMinutes = 120;
      effectiveTierPriceIls = GRAND_120_PRICE_ILS;
      tierAnchorIls = Math.max(GRAND_120_ANCHOR_ILS, basePriceIls + addonPrice);
    }
  } else {
    const sumMissionPrice = effectiveMissionAddons.reduce((sum, addon) => sum + addon.priceIls, 0);
    effectivePackageId = GRAND_120_PACKAGE_ID;
    effectiveDurationMinutes = 120;
    effectiveTierPriceIls = GRAND_120_PRICE_ILS;
    tierAnchorIls = Math.max(GRAND_120_ANCHOR_ILS, basePriceIls + sumMissionPrice);
  }

  const promoSubtotalIls = effectiveTierPriceIls + nonMissionAddonsPriceIls;
  const strikeOutAnchorSubtotalIls = tierAnchorIls + nonMissionAddonsPriceIls;
  const savingsIls = Math.max(0, tierAnchorIls - effectiveTierPriceIls);
  const discountPercent = tierAnchorIls > 0 ? Math.round((savingsIls / tierAnchorIls) * 100) : 0;

  return {
    isPromoActive: true,
    missionAddonCount: effectiveMissionAddons.length,
    effectivePackageId,
    effectiveDurationMinutes,
    effectiveTierPriceIls,
    nonMissionAddonsPriceIls,
    promoSubtotalIls,
    strikeOutAnchorSubtotalIls,
    savingsIls,
    discountPercent,
    bundledMissionAddonIds,
    standalonePaidAddonIds,
  };
}

/**
 * Evaluates what selecting `candidateAddon` will do for a given package, current selection,
 * and departure slot window (`maxSlotMinutes`). Powers add-on card badges and disable states.
 */
export function previewAddonUpgrade(input: {
  pkg: MissionPromoPackageInput;
  isPrimeTime?: boolean;
  selectedAddonIds: readonly string[];
  candidateAddon: FlightAddon;
  availableAddons: readonly FlightAddon[];
  maxSlotMinutes: number;
  durationAvailability?: DurationAvailabilitySummary;
}): AddonUpgradePreview {
  const { pkg, isPrimeTime, selectedAddonIds, candidateAddon, availableAddons, maxSlotMinutes, durationAvailability } =
    input;
  const isMission = isMissionAddon(candidateAddon);
  const isChecked = selectedAddonIds.includes(candidateAddon.id);
  const currentMissionCount = countSelectedMissionAddons(selectedAddonIds, availableAddons);
  const wouldExceedCap = !isChecked && isMission && currentMissionCount >= MAX_MISSION_ADDONS;

  const nextAddonIds = isChecked ? selectedAddonIds : [...selectedAddonIds, candidateAddon.id];
  const previewPromo = resolveMissionUpgradePromo({
    pkg,
    isPrimeTime,
    selectedAddonIds: nextAddonIds,
    availableAddons,
  });

  const effectiveDurationAfterAdd = previewPromo.effectiveDurationMinutes;
  const fitsSlot =
    isChecked ||
    !isMission ||
    (pkg.category === 'recreational'
      ? canUpgradedDurationFit(effectiveDurationAfterAdd, maxSlotMinutes, durationAvailability)
      : effectiveDurationAfterAdd <= maxSlotMinutes);

  return {
    isMission,
    isChecked,
    wouldExceedCap,
    effectiveDurationAfterAdd,
    fitsSlot,
    previewPromo,
  };
}
