'use client';

import { useEffect } from 'react';
import type { FlightAddon, FlightSlot, PackageCategory } from '@/types';
import { pruneAddonsExceedingSlot } from '@/lib/scheduler/mission-calculator';
import type { DurationAvailabilitySummary } from '@/lib/scheduler/mission-upgrade-promo';
import { resolveAddonToggle } from '@/lib/booking/client';

interface UseAddonControlsArgs {
  selectedAddons: string[];
  setSelectedAddons: (ids: string[]) => void;
  localizedAddons: FlightAddon[];
  scopedAddons: FlightAddon[];
  selectedSlot: FlightSlot | null;
  packageCategory: PackageCategory;
  baseDurationMinutes: number;
  totalDurationMinutes: number;
  maxSlotMinutes: number;
  durationAvailability?: DurationAvailabilitySummary;
  isSwitchingGrid?: boolean;
  wixBookingsAuthoritative: boolean;
  isWixSubscriptionRedemption: boolean;
}

/**
 * Add-on actions shared by the wizard's add-ons step and the storefront. Also guards the selection:
 * when the visitor moves to a tighter departure (or a date where an upgraded tier has no open
 * departures), add-ons that no longer fit or exceed the 2-mission-addon cap are dropped.
 */
export function useAddonControls(args: UseAddonControlsArgs) {
  const {
    selectedAddons,
    setSelectedAddons,
    localizedAddons,
    scopedAddons,
    selectedSlot,
    packageCategory,
    baseDurationMinutes,
    totalDurationMinutes,
    maxSlotMinutes,
    durationAvailability,
    isSwitchingGrid = false,
    wixBookingsAuthoritative,
    isWixSubscriptionRedemption,
  } = args;

  useEffect(() => {
    if (!selectedSlot || isSwitchingGrid) return;
    const pruned = pruneAddonsExceedingSlot(
      selectedAddons,
      scopedAddons,
      baseDurationMinutes,
      selectedSlot.maxAvailableMinutes ?? 180,
      packageCategory,
      durationAvailability
    );
    if (pruned.length !== selectedAddons.length) {
      setSelectedAddons(pruned);
    }
  }, [selectedSlot, isSwitchingGrid, baseDurationMinutes, packageCategory, scopedAddons, durationAvailability]);

  const toggleAddon = (addonId: string) => {
    const result = resolveAddonToggle({
      addonId,
      selectedAddonIds: selectedAddons,
      addons: localizedAddons,
      wixBookingsAuthoritative,
      isWixSubscriptionRedemption,
      baseDurationMinutes,
      packageCategory,
      totalDurationMinutes,
      maxSlotMinutes,
      durationAvailability,
    });
    if (result.kind === 'set') setSelectedAddons(result.ids);
    // 'no-fit' / 'max-mission-addons': nothing changes.
  };

  /** Replaces the selection, dropping whatever exceeds the 2-mission cap or selected departure window. */
  const setAddons = (ids: string[]) =>
    setSelectedAddons(
      pruneAddonsExceedingSlot(
        ids,
        scopedAddons,
        baseDurationMinutes,
        maxSlotMinutes,
        packageCategory,
        durationAvailability
      )
    );

  return { toggleAddon, setAddons };
}

export type AddonControls = ReturnType<typeof useAddonControls>;
