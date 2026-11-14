import type { FlightAddon } from '@/types';
import { canAddonFitInSlot } from '@/lib/scheduler/mission-calculator';

export type AddonToggleResult =
  /** Replace the selection with these ids. */
  | { kind: 'set'; ids: string[] }
  /** The add-on would overflow the selected departure window; nothing changes. */
  | { kind: 'no-fit' };

export interface AddonToggleInputs {
  addonId: string;
  selectedAddonIds: readonly string[];
  addons: readonly FlightAddon[];
  wixBookingsAuthoritative?: boolean;
  isWixSubscriptionRedemption?: boolean;
  totalDurationMinutes: number;
  maxSlotMinutes: number;
}

/** What toggling an add-on does. Removing is always allowed; adding must fit in the selected departure slot. */
export function resolveAddonToggle(inputs: AddonToggleInputs): AddonToggleResult {
  const { addonId, selectedAddonIds } = inputs;
  if (selectedAddonIds.includes(addonId)) {
    return { kind: 'set', ids: selectedAddonIds.filter((id) => id !== addonId) };
  }
  const addon = inputs.addons.find((candidate) => candidate.id === addonId);
  if (addon && !canAddonFitInSlot(addon, inputs.totalDurationMinutes, inputs.maxSlotMinutes)) {
    return { kind: 'no-fit' };
  }
  return { kind: 'set', ids: [...selectedAddonIds, addonId] };
}
