import type { FlightAddon, PackageCategory } from '@/types';
import { canAddonFitInSlot } from '@/lib/scheduler/mission-calculator';
import {
  MAX_MISSION_ADDONS,
  countSelectedMissionAddons,
  isMissionAddon,
  resolveUpgradedDurationMinutes,
} from '@/lib/scheduler/mission-upgrade-promo';

export type AddonToggleResult =
  /** Replace the selection with these ids. */
  | { kind: 'set'; ids: string[] }
  /** The add-on would overflow the selected departure window; nothing changes. */
  | { kind: 'no-fit' }
  /** Customer already reached the 2-mission-addon cap; remove one before swapping. */
  | { kind: 'max-mission-addons' };

export interface AddonToggleInputs {
  addonId: string;
  selectedAddonIds: readonly string[];
  addons: readonly FlightAddon[];
  wixBookingsAuthoritative?: boolean;
  isWixSubscriptionRedemption?: boolean;
  baseDurationMinutes?: number;
  packageCategory?: PackageCategory;
  totalDurationMinutes: number;
  maxSlotMinutes: number;
}

/** What toggling an add-on does. Removing is always allowed; adding respects the 2-mission cap and departure window. */
export function resolveAddonToggle(inputs: AddonToggleInputs): AddonToggleResult {
  const { addonId, selectedAddonIds, addons } = inputs;
  if (selectedAddonIds.includes(addonId)) {
    return { kind: 'set', ids: selectedAddonIds.filter((id) => id !== addonId) };
  }
  const addon = addons.find((candidate) => candidate.id === addonId);
  if (addon && isMissionAddon(addon)) {
    const currentMissionCount = countSelectedMissionAddons(selectedAddonIds, addons);
    if (currentMissionCount >= MAX_MISSION_ADDONS) {
      return { kind: 'max-mission-addons' };
    }
    if (inputs.packageCategory === 'recreational' && inputs.baseDurationMinutes !== undefined) {
      const nextDuration = resolveUpgradedDurationMinutes(inputs.baseDurationMinutes, currentMissionCount + 1);
      if (nextDuration > inputs.maxSlotMinutes) {
        return { kind: 'no-fit' };
      }
      return { kind: 'set', ids: [...selectedAddonIds, addonId] };
    }
    if (!canAddonFitInSlot(addon, inputs.totalDurationMinutes, inputs.maxSlotMinutes)) {
      return { kind: 'no-fit' };
    }
  }
  return { kind: 'set', ids: [...selectedAddonIds, addonId] };
}
