import type { FlightAddon, FlightSlot, PublicCapacityReport } from '@/types';

/** What `GET /api/slots` answers (an older shape was a bare array of slots). */
export interface SlotsApiPayload {
  slots?: FlightSlot[];
  durationAvailability?: Record<number, { availableCount: number; minPriceIls: number }>;
  wixBookingsAuthoritative?: boolean;
  efficiency?: PublicCapacityReport;
}

/** The slot list of a `/api/slots` response, whichever shape it has. */
export function extractSlotList(data: SlotsApiPayload | FlightSlot[] | null | undefined): FlightSlot[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.slots) ? data.slots : [];
}

/** Base flight minutes plus the minutes of every selected add-on that the catalog knows. */
export function computeRequiredMissionMinutes(
  baseDurationMinutes: number,
  selectedAddonIds: readonly string[],
  addons: readonly Pick<FlightAddon, 'id' | 'durationMinutes'>[]
): number {
  return (
    baseDurationMinutes +
    selectedAddonIds.reduce(
      (total, addonId) => total + (addons.find((addon) => addon.id === addonId)?.durationMinutes ?? 0),
      0
    )
  );
}

/**
 * Departures that can hold the whole mission (base flight plus every chosen add-on). A selected
 * route or add-on stays visible rather than offering a departure that would invalidate it.
 */
export function filterMissionCompatibleSlots(
  slots: readonly FlightSlot[],
  requiredMissionMinutes: number
): FlightSlot[] {
  return slots.filter((slot) => slot.available && (slot.maxAvailableMinutes ?? 0) >= requiredMissionMinutes);
}

/**
 * The departure to select after a (re)load. Keeps the visitor's current departure while it is still
 * compatible on the same date; otherwise prefers a smart pairing, then the first compatible
 * departure. Selecting a short base-flight slot and then pruning a URL-selected World Trio would
 * lose explicit customer intent.
 */
export function selectDepartureAfterLoad(
  slotList: readonly FlightSlot[],
  options: { selectedDate: string; previous: FlightSlot | null; requiredMissionMinutes: number }
): FlightSlot | null {
  const compatibleSlots = filterMissionCompatibleSlots(slotList, options.requiredMissionMinutes);
  const smartMatch = compatibleSlots.find((slot) => slot.available && slot.smartRecommendation === 'optimal_150_pair');
  const firstAvailable = smartMatch || compatibleSlots[0] || null;
  const { previous } = options;
  if (previous && previous.date === options.selectedDate && compatibleSlots.some((slot) => slot.id === previous.id)) {
    return slotList.find((slot) => slot.id === previous.id) || firstAvailable;
  }
  return firstAvailable;
}

export type SlotsState = 'idle' | 'loading' | 'failed' | 'ready';

/** Reported as `data-slots-state` so journeys and tests know the availability request's phase. */
export function resolveSlotsState(flags: {
  loadingSlots: boolean;
  slotsLoadFailed: boolean;
  slotsRequested: boolean;
}): SlotsState {
  if (flags.loadingSlots) return 'loading';
  if (flags.slotsLoadFailed) return 'failed';
  return flags.slotsRequested ? 'ready' : 'idle';
}
