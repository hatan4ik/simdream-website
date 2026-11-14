import 'server-only';

import type { FlightSlot } from '@/types';
import {
  closeDepartedSlots,
  generateKantorovichSlots,
  longestMissionWithin,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';
import { wixServiceIdFor } from './catalog';
import { listWixAvailability, type WixTimeSlot } from './bookings';

const AVAILABILITY_PACKAGE_BY_DURATION: Readonly<Record<number, string>> = {
  30: 'pkg-discovery-30',
  45: 'pkg-promo-45',
  60: 'pkg-captain-60',
  90: 'pkg-ultimate-90',
  120: 'pkg-assessment-prep-120',
};

function wixSlotStartTime(localStartDate: string): string | null {
  const matched = /T(\d{2}:\d{2})(?::\d{2})?/.exec(localStartDate);
  return matched?.[1] ?? null;
}

function nativeBookableStartTimes(timeSlots: readonly WixTimeSlot[]): Set<string> {
  const starts = new Set<string>();
  for (const timeSlot of timeSlots) {
    if (timeSlot.bookable === false) continue;
    const startTime = wixSlotStartTime(timeSlot.localStartDate);
    if (startTime) starts.add(startTime);
  }
  return starts;
}

/**
 * Keeps SimDream's stricter fixed Kantorovich rhythm while allowing Wix to
 * veto any departure it has already allocated. This is deliberately an
 * intersection, never a replacement: Wix's rolling availability alone is
 * broader than the zero-waste booking grid.
 */
export function intersectKantorovichSlotsWithWix(
  kantorovichSlots: readonly FlightSlot[],
  wixTimeSlots: readonly WixTimeSlot[]
): FlightSlot[] {
  const wixStarts = nativeBookableStartTimes(wixTimeSlots);
  return kantorovichSlots.map((slot, i) => {
    const available = slot.available && wixStarts.has(slot.startTime);
    if (!available) {
      return { ...slot, available };
    }

    let maxAvailableMinutes = slot.maxAvailableMinutes;
    for (let j = i + 1; j < kantorovichSlots.length; j++) {
      const laterSlot = kantorovichSlots[j];
      if (!wixStarts.has(laterSlot.startTime)) {
        const gapMinutes = timeToMinutes(laterSlot.startTime) - timeToMinutes(slot.startTime);
        const wixMaxMinutes = longestMissionWithin(gapMinutes, slot.durationMinutes);
        maxAvailableMinutes = Math.min(maxAvailableMinutes ?? wixMaxMinutes, wixMaxMinutes);
        break;
      }
    }

    return {
      ...slot,
      available,
      maxAvailableMinutes,
    };
  });
}

function localDayBounds(date: string): { fromLocalDate: string; toLocalDate: string } {
  return {
    fromLocalDate: `${date}T00:00:00`,
    toLocalDate: `${date}T23:59:59`,
  };
}

export async function listWixBookableSlotsForDuration(date: string, durationMinutes: number): Promise<WixTimeSlot[]> {
  const packageId = AVAILABILITY_PACKAGE_BY_DURATION[durationMinutes];
  const serviceId = packageId ? wixServiceIdFor(packageId) : null;
  if (!serviceId) {
    throw new Error(`No Wix availability service maps to ${durationMinutes} minutes.`);
  }

  const response = await listWixAvailability({ serviceId, ...localDayBounds(date) });
  return response.timeSlots;
}

/**
 * Wix-only fallback used by the managed staging host when local persistence
 * is intentionally unavailable. It still renders the canonical local grid,
 * then limits it to Wix's current bookable starts.
 */
export async function getWixBackedKantorovichSlots(
  date: string,
  durationMinutes: number,
  wixTimeSlots?: readonly WixTimeSlot[]
): Promise<FlightSlot[]> {
  const resolvedWixTimeSlots = wixTimeSlots ?? (await listWixBookableSlotsForDuration(date, durationMinutes));
  const generated = closeDepartedSlots(generateKantorovichSlots(date, durationMinutes, []), new Date());
  return intersectKantorovichSlotsWithWix(generated, resolvedWixTimeSlots);
}
