import 'server-only';

import type { FlightSlot } from '@/types';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  generateKantorovichSlots,
  getDayOperatingConfig,
  getReservedMinutesForFlight,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';

/**
 * The one rule that binds a Wix-created booking to the local zero-waste grid (AGENTS.md §4).
 *
 * The browser creates Wix bookings itself, so a caller can ask Wix for any start Wix offers.
 * `resolveWixBookingCheckout` (before the browser books, `isOnStrictWixGrid`) and the Wix Bookings
 * Pricing provider (when Wix prices the booking, `strictWixGridDepartureFor`) both read the same
 * open grid departure, so the two can never drift.
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

function openStrictGridSlot(packageId: string, flightDate: string, startTime: string): FlightSlot | undefined {
  return strictWixGridSlots(packageId, flightDate).find((slot) => slot.available && slot.startTime === startTime);
}

/** True when `startTime` (HH:MM, Israel wall clock) is an open departure of that grid on `flightDate`. */
export function isOnStrictWixGrid(packageId: string, flightDate: string, startTime: string): boolean {
  return openStrictGridSlot(packageId, flightDate, startTime) !== undefined;
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

/** An open departure of the strict grid, placed on the Israel wall clock. */
export interface StrictWixGridDeparture {
  flightDate: string;
  startTime: string;
  /** The scheduler's own tariff decision for this departure: Saturday, or 18:00 onward. */
  isPrimeTime: boolean;
}

/** Shorter recreational base packages that can promote into a higher Wix tier via mission add-ons. */
const PROMO_UPGRADE_SOURCE_IDS: Readonly<Record<string, readonly string[]>> = {
  'pkg-captain-60': ['pkg-discovery-30'],
  'pkg-ultimate-90': ['pkg-promo-45', 'pkg-captain-60'],
  'pkg-grand-120': ['pkg-discovery-30', 'pkg-promo-45', 'pkg-captain-60', 'pkg-ultimate-90'],
};

function openPromoUpgradeSourceSlot(
  packageId: string,
  flightDate: string,
  startTime: string
): FlightSlot | undefined {
  const sourceIds = PROMO_UPGRADE_SOURCE_IDS[packageId];
  if (!sourceIds) return undefined;
  const targetPkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!targetPkg) return undefined;
  const { closeMinutes } = getDayOperatingConfig(flightDate);
  if (timeToMinutes(startTime) + getReservedMinutesForFlight(targetPkg.durationMinutes) > closeMinutes) {
    return undefined;
  }
  for (const sourceId of sourceIds) {
    const match = openStrictGridSlot(sourceId, flightDate, startTime);
    if (match) return match;
  }
  return undefined;
}

/**
 * The pricing provider's reading of a Wix slot `startDate` (an RFC 3339 instant): the open grid
 * departure it lands on, or null when it lands on none. The Israel date and time, and so the flight
 * date and the tariff, come from the instant itself, never from the booking's `timezone` label,
 * which the browser sets. Accepts both the package's own strict grid and any shorter recreational
 * promo-upgrade origin whose upgraded reservation still fits before closing time.
 */
export function strictWixGridDepartureFor(packageId: string, startDate: string | undefined): StrictWixGridDeparture | null {
  const departure = startDate ? israelDepartureOf(startDate) : null;
  const slot = departure
    ? openStrictGridSlot(packageId, departure.flightDate, departure.startTime) ??
      openPromoUpgradeSourceSlot(packageId, departure.flightDate, departure.startTime)
    : undefined;
  return departure && slot ? { ...departure, isPrimeTime: slot.isPrimeTime } : null;
}
