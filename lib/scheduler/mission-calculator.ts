import {
  FlightAddon,
  FlightSlot,
  MissionManifestAddonItem,
  MissionManifestCalculation,
  SimulatorPackage,
} from '@/types';
import { minutesToTime, timeToMinutes } from './kantorovich-engine';

const DEFAULT_MAX_SLOT_MINUTES = 180;
const DURATION_SUFFIX_REGEX = /\s*\(\d+m(?:\s+Promo)?\)/gi;

/**
 * Strips hardcoded duration suffixes such as "(20m)", "(60m)", or "(45m Promo)"
 * from package titles so the displayed title never contradicts the dynamically
 * expanded total session duration when mission add-ons are selected.
 */
export function sanitizePackageTitle(rawTitle: string): string {
  return rawTitle.replace(DURATION_SUFFIX_REGEX, '').trim();
}

/**
 * Pure helper to add `minutesToAdd` to an `HH:mm` time string.
 */
export function addMinutesToTime(startTime: string, minutesToAdd: number): string {
  if (!startTime || !startTime.includes(':')) return startTime;
  const startMin = timeToMinutes(startTime);
  return minutesToTime(startMin + Math.max(0, minutesToAdd));
}

/**
 * Determines whether a time-extending add-on can fit inside the selected slot's
 * continuous available window (`maxSlotMinutes`) without colliding with the next
 * pilot's booking or facility closing time.
 */
export function canAddonFitInSlot(
  addon: Pick<FlightAddon, 'durationMinutes'>,
  currentTotalDurationMinutes: number,
  maxSlotMinutes: number = DEFAULT_MAX_SLOT_MINUTES
): boolean {
  const addonMinutes = addon.durationMinutes || 0;
  if (addonMinutes <= 0) return true;
  return currentTotalDurationMinutes + addonMinutes <= maxSlotMinutes;
}

/**
 * Prunes any selected time-extending add-ons that would overflow `maxSlotMinutes`
 * when a customer switches to a tighter time slot in Step 1.
 */
export function pruneAddonsExceedingSlot(
  selectedAddonIds: readonly string[],
  allAddons: readonly FlightAddon[],
  baseDurationMinutes: number,
  maxSlotMinutes: number = DEFAULT_MAX_SLOT_MINUTES
): string[] {
  let runningDuration = baseDurationMinutes;
  const validIds: string[] = [];

  for (const id of selectedAddonIds) {
    const addon = allAddons.find((a) => a.id === id);
    const addonMinutes = addon?.durationMinutes || 0;
    if (runningDuration + addonMinutes <= maxSlotMinutes) {
      runningDuration += addonMinutes;
      validIds.push(id);
    }
  }

  return validIds;
}

export interface CalculateMissionManifestInput {
  pkg: Pick<SimulatorPackage, 'title' | 'durationMinutes' | 'priceIls'>;
  slot?: Pick<FlightSlot, 'startTime' | 'endTime' | 'dynamicPriceIls' | 'maxAvailableMinutes'> | null;
  selectedAddonIds: readonly string[];
  availableAddons: readonly FlightAddon[];
  voucherDiscountIls?: number;
  fallbackStartTime?: string;
}

/**
 * Canonical Single-Source-of-Truth calculation for Flight Mission duration,
 * start/end time window, itemized add-ons, and pricing across Step 1, Step 2,
 * Step 3 Order Summary, `POST /api/bookings`, and `/book/success` Boarding Pass.
 */
export function calculateMissionManifest(
  input: CalculateMissionManifestInput
): MissionManifestCalculation {
  const {
    pkg,
    slot,
    selectedAddonIds,
    availableAddons,
    voucherDiscountIls = 0,
    fallbackStartTime = '10:00',
  } = input;

  const cleanPackageTitle = sanitizePackageTitle(pkg.title);
  const baseDurationMinutes = pkg.durationMinutes;
  const basePriceIls = slot?.dynamicPriceIls || pkg.priceIls;
  const maxAvailableMinutes = slot?.maxAvailableMinutes ?? DEFAULT_MAX_SLOT_MINUTES;

  const selectedAddonItems: MissionManifestAddonItem[] = [];
  let addonsDurationMinutes = 0;
  let addonsPriceIls = 0;

  for (const id of selectedAddonIds) {
    const addon = availableAddons.find((a) => a.id === id);
    if (!addon) continue;
    const dur = addon.durationMinutes || 0;
    addonsDurationMinutes += dur;
    addonsPriceIls += addon.priceIls;
    selectedAddonItems.push({
      addon,
      durationMinutes: dur,
      priceIls: addon.priceIls,
    });
  }

  const totalDurationMinutes = baseDurationMinutes + addonsDurationMinutes;
  const startTime = slot?.startTime || fallbackStartTime;
  const effectiveEndTime = addMinutesToTime(startTime, totalDurationMinutes);

  const subtotalIls = basePriceIls + addonsPriceIls;
  const boundedDiscountIls = Math.min(Math.max(0, voucherDiscountIls), subtotalIls);
  const totalIls = Math.max(0, subtotalIls - boundedDiscountIls);

  return {
    cleanPackageTitle,
    baseDurationMinutes,
    addonsDurationMinutes,
    totalDurationMinutes,
    startTime,
    effectiveEndTime,
    maxAvailableMinutes,
    basePriceIls,
    addonsPriceIls,
    subtotalIls,
    discountIls: boundedDiscountIls,
    totalIls,
    selectedAddonItems,
  };
}

