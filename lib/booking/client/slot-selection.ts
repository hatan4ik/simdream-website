import type { FlightAddon, FlightSlot, PackageCategory, PublicCapacityReport } from '@/types';
import { timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import { computeEffectiveMissionDuration } from '@/lib/scheduler/mission-upgrade-promo';

const SUPPORTED_SCHEDULE_DURATIONS = new Set([30, 45, 60, 90, 120]);

/** Recorded when switching to an upgraded duration's schedule shifts the visitor to a nearby start. */
export interface SlotAdjustment {
  fromStartTime: string;
  toStartTime: string;
  durationMinutes: number;
}

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

/** Effective mission minutes for the package and selected add-ons (tiered for recreational bookings). */
export function computeRequiredMissionMinutes(
  baseDurationMinutes: number,
  selectedAddonIds: readonly string[],
  addons: readonly Pick<FlightAddon, 'id' | 'durationMinutes'>[],
  category?: PackageCategory
): number {
  return computeEffectiveMissionDuration(baseDurationMinutes, selectedAddonIds, addons, category);
}

/**
 * The duration grid `/api/slots` should query. When a recreational mission add-on promotes a
 * shorter base flight to a higher tier (e.g. 60m -> 90m or 120m), switch to the upgraded tier's
 * own zero-waste grid so upgraded bookings never fragment shorter grids.
 */
export function resolveScheduleDurationMinutes(
  baseDurationMinutes: number,
  requiredMissionMinutes: number,
  category?: PackageCategory
): number {
  if (
    category === 'recreational' &&
    requiredMissionMinutes > baseDurationMinutes &&
    SUPPORTED_SCHEDULE_DURATIONS.has(requiredMissionMinutes)
  ) {
    return requiredMissionMinutes;
  }
  return baseDurationMinutes;
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
 * Picks the compatible departure closest in wall-clock minutes to `targetStartTime`.
 * Ties break toward the later departure so the visitor is never pulled earlier unexpectedly.
 */
export function findNearestCompatibleSlot(
  compatibleSlots: readonly FlightSlot[],
  targetStartTime: string
): FlightSlot | null {
  if (compatibleSlots.length === 0) return null;
  const targetMinutes = timeToMinutes(targetStartTime);
  let best = compatibleSlots[0]!;
  let bestDelta = Math.abs(timeToMinutes(best.startTime) - targetMinutes);

  for (let i = 1; i < compatibleSlots.length; i += 1) {
    const candidate = compatibleSlots[i]!;
    const candidateMinutes = timeToMinutes(candidate.startTime);
    const delta = Math.abs(candidateMinutes - targetMinutes);
    const bestMinutes = timeToMinutes(best.startTime);
    if (delta < bestDelta || (delta === bestDelta && candidateMinutes > bestMinutes)) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * The departure to select after a (re)load. Keeps the visitor's current departure while it is still
 * compatible on the same date (matching by id or wall-clock startTime across grid switches); when
 * switching duration grids on the same date (`preferNearestOnSameDate` or `preferredStartTime`),
 * snaps to the nearest compatible departure; otherwise prefers a smart pairing, then the first
 * compatible departure.
 */
export function selectDepartureAfterLoad(
  slotList: readonly FlightSlot[],
  options: {
    selectedDate: string;
    previous: FlightSlot | null;
    requiredMissionMinutes: number;
    preferNearestOnSameDate?: boolean;
    preferredStartTime?: string;
  }
): FlightSlot | null {
  const compatibleSlots = filterMissionCompatibleSlots(slotList, options.requiredMissionMinutes);
  const smartMatch = compatibleSlots.find((slot) => slot.available && slot.smartRecommendation === 'optimal_150_pair');
  const firstAvailable = smartMatch || compatibleSlots[0] || null;
  const { previous, preferredStartTime, preferNearestOnSameDate } = options;

  if (preferredStartTime) {
    const exactPreferred = compatibleSlots.find((slot) => slot.startTime === preferredStartTime);
    if (exactPreferred) return exactPreferred;
    return findNearestCompatibleSlot(compatibleSlots, preferredStartTime) || firstAvailable;
  }

  if (previous && previous.date === options.selectedDate) {
    const exactById = compatibleSlots.find((slot) => slot.id === previous.id);
    if (exactById) return exactById;
    const exactByTime = compatibleSlots.find((slot) => slot.startTime === previous.startTime);
    if (exactByTime) return exactByTime;
    if (preferNearestOnSameDate) {
      return findNearestCompatibleSlot(compatibleSlots, previous.startTime) || firstAvailable;
    }
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
