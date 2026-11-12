'use client';

import { useMemo } from 'react';
import type { FlightAddon, FlightSlot, SimulatorPackage } from '@/types';
import { calculateMissionManifest } from '@/lib/scheduler/mission-calculator';

interface UseBookingManifestArgs {
  activePackage: SimulatorPackage;
  selectedSlot: FlightSlot | null;
  selectedAddons: string[];
  scopedAddons: FlightAddon[];
}

/**
 * The canonical single-source-of-truth mission manifest (duration, window, itemized add-ons and
 * price) for every step of the page. A voucher discount only changes `discountIls` and `totalIls`,
 * never `subtotalIls`, so call it with 0 to get the amount a voucher is verified against.
 */
export function useBookingManifest(
  { activePackage, selectedSlot, selectedAddons, scopedAddons }: UseBookingManifestArgs,
  voucherDiscountIls: number
) {
  return useMemo(
    () =>
      calculateMissionManifest({
        pkg: activePackage,
        slot: selectedSlot,
        selectedAddonIds: selectedAddons,
        availableAddons: scopedAddons,
        voucherDiscountIls,
      }),
    [activePackage, selectedSlot, selectedAddons, scopedAddons, voucherDiscountIls]
  );
}
