'use client';

import { useEffect } from 'react';
import type { FlightAddon, FlightSlot } from '@/types';
import { pruneAddonsExceedingSlot } from '@/lib/scheduler/mission-calculator';
import { resolveAddonToggle } from '@/lib/booking/client';

interface UseAddonControlsArgs {
  selectedAddons: string[];
  setSelectedAddons: (ids: string[]) => void;
  localizedAddons: FlightAddon[];
  scopedAddons: FlightAddon[];
  selectedSlot: FlightSlot | null;
  baseDurationMinutes: number;
  totalDurationMinutes: number;
  maxSlotMinutes: number;
  wixBookingsAuthoritative: boolean;
  isWixSubscriptionRedemption: boolean;
  /** Shown as the booking error when a live Wix calendar blocks adding an add-on. */
  onWixAuthorityRequired: () => void;
}

/**
 * Add-on actions shared by the wizard's add-ons step and the storefront. Also guards the selection:
 * when the visitor moves to a tighter departure, add-ons that no longer fit its continuous window
 * are dropped (Smart Window Guard).
 */
export function useAddonControls(args: UseAddonControlsArgs) {
  const {
    selectedAddons,
    setSelectedAddons,
    localizedAddons,
    scopedAddons,
    selectedSlot,
    baseDurationMinutes,
    totalDurationMinutes,
    maxSlotMinutes,
    wixBookingsAuthoritative,
    isWixSubscriptionRedemption,
    onWixAuthorityRequired,
  } = args;

  useEffect(() => {
    if (!selectedSlot) return;
    const pruned = pruneAddonsExceedingSlot(
      selectedAddons,
      scopedAddons,
      baseDurationMinutes,
      selectedSlot.maxAvailableMinutes ?? 180
    );
    if (pruned.length !== selectedAddons.length) {
      setSelectedAddons(pruned);
    }
  }, [selectedSlot, baseDurationMinutes, scopedAddons]);

  const toggleAddon = (addonId: string) => {
    const result = resolveAddonToggle({
      addonId,
      selectedAddonIds: selectedAddons,
      addons: localizedAddons,
      wixBookingsAuthoritative,
      isWixSubscriptionRedemption,
      totalDurationMinutes,
      maxSlotMinutes,
    });
    if (result.kind === 'set') setSelectedAddons(result.ids);
    else if (result.kind === 'wix-authority-required') onWixAuthorityRequired();
    // 'no-fit': the add-on would overflow the selected slot window, so nothing changes.
  };

  /** Replaces the selection, dropping whatever the selected departure's window cannot hold. */
  const setAddons = (ids: string[]) =>
    setSelectedAddons(pruneAddonsExceedingSlot(ids, scopedAddons, baseDurationMinutes, maxSlotMinutes));

  return { toggleAddon, setAddons };
}

export type AddonControls = ReturnType<typeof useAddonControls>;
