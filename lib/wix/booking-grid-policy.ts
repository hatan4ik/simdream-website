import 'server-only';

import type { FlightSlot } from '@/types';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { generateKantorovichSlots } from '@/lib/scheduler/kantorovich-engine';

/**
 * The one rule that binds a Wix-created booking to the local zero-waste grid (AGENTS.md §4).
 *
 * The browser creates Wix bookings itself, so a caller can ask Wix for any start Wix offers.
 * `resolveWixBookingCheckout` (before the browser books) and the Wix Bookings Pricing provider
 * (when Wix prices the booking) both call `isOnStrictWixGrid`, so the two can never drift.
 * The grid is the empty-day grid: no bookings and no clock. Wix guards its own capacity, and
 * the resolver alone closes departures that have already left.
 */

// The simulator runs on the Israel wall clock (lib/scheduler/israel-clock.ts).
const ISRAEL_TIME_ZONE = 'Asia/Jerusalem';
// RFC 3339 with an explicit offset: without one an instant cannot be placed on the Israel clock.
const RFC3339_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/** Every departure the zero-waste engine plans for the package on an empty Israel day; none for an unknown package. */
export function strictWixGridSlots(packageId: string, flightDate: string): FlightSlot[] {
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  return pkg ? generateKantorovichSlots(flightDate, pkg.durationMinutes, []) : [];
}

/** True when `startTime` (HH:MM, Israel wall clock) is an open departure of that grid on `flightDate`. */
export function isOnStrictWixGrid(packageId: string, flightDate: string, startTime: string): boolean {
  return strictWixGridSlots(packageId, flightDate).some((slot) => slot.available && slot.startTime === startTime);
}

/** The Israel flight date and HH:MM of an RFC 3339 instant; null without an explicit offset or off a whole minute. */
function israelDepartureOf(instant: string): { flightDate: string; startTime: string } | null {
  if (!RFC3339_INSTANT.test(instant)) return null;
  const time = new Date(instant);
  if (!Number.isFinite(time.getTime()) || time.getTime() % 60_000 !== 0) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(time);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value;
  return {
    flightDate: `${part('year')}-${part('month')}-${part('day')}`,
    startTime: `${part('hour')}:${part('minute')}`,
  };
}

/**
 * The pricing provider's check for a Wix slot `startDate` (an RFC 3339 instant). The Israel time
 * comes from the instant itself, never from the booking's `timezone` label, which the browser sets.
 */
export function isWixSlotStartOnStrictGrid(packageId: string, startDate: string | undefined): boolean {
  const departure = startDate ? israelDepartureOf(startDate) : null;
  return departure !== null && isOnStrictWixGrid(packageId, departure.flightDate, departure.startTime);
}
