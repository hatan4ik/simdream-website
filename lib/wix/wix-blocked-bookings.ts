import { getDayOperatingConfig, getReservedMinutesForFlight, minutesToTime, timeToMinutes, type ReservedBooking } from '@/lib/scheduler/kantorovich-engine';

/**
 * Wix owns the bookings in a Wix deployment, and the app cannot read them. It does not need to: for one
 * service, Wix lists every start whose flight and 15-minute turnaround clear every existing booking, so
 * the holes in that list ARE the bookings. This turns each hole back into the reserved interval the
 * Kantorovich engine understands, and the engine then re-anchors on it exactly as it does for a local
 * booking: the first start after a hole is that booking's end plus the turnaround (14:05 + 15 = 14:20),
 * and the latest start before it is the one that still clears its start.
 */

/** A flight length whose reservation (flight plus turnaround, by the tier map) is exactly `reservedMinutes`. */
function flightMinutesReserving(reservedMinutes: number): number | null {
  for (let flight = reservedMinutes; flight >= 1; flight--) {
    if (getReservedMinutesForFlight(flight) === reservedMinutes) return flight;
  }
  return null;
}

function blockedInterval(date: string, startMin: number, reservedMinutes: number): ReservedBooking | null {
  const flight = flightMinutesReserving(reservedMinutes);
  if (flight === null) return null;
  return {
    bookingDate: date,
    startTime: minutesToTime(startMin),
    endTime: minutesToTime(startMin + flight),
    durationMinutes: flight,
    status: 'confirmed',
  };
}

/**
 * `wixStartTimes` are the HH:MM starts Wix reports as bookable for `durationMinutes`. Returns the reserved
 * intervals between them; none when Wix offers an unbroken run (a day with nothing booked).
 */
export function wixBlockedBookings(
  date: string,
  durationMinutes: number,
  wixStartTimes: readonly string[]
): ReservedBooking[] {
  const config = getDayOperatingConfig(date);
  const starts = [...new Set(wixStartTimes.map(timeToMinutes))].sort((a, b) => a - b);
  const reserved = getReservedMinutesForFlight(durationMinutes);
  if (starts.length === 0) return [blockedInterval(date, config.openMinutes, config.closeMinutes - config.openMinutes)].filter(Boolean) as ReservedBooking[];

  const raster = starts.slice(1).reduce((smallest, start, i) => Math.min(smallest, start - starts[i]), Infinity);
  const blocks: Array<ReservedBooking | null> = [];

  // Before the first start Wix offers, something holds the simulator from the opening.
  if (starts[0] > config.openMinutes) {
    blocks.push(blockedInterval(date, config.openMinutes, starts[0] - config.openMinutes));
  }
  // A jump bigger than the raster is a booking: it starts where the last free departure's reservation ends
  // and ends at the next free departure.
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] - starts[i - 1] > raster) {
      const blockStart = starts[i - 1] + reserved;
      if (starts[i] > blockStart) blocks.push(blockedInterval(date, blockStart, starts[i] - blockStart));
    }
  }
  return blocks.filter((block): block is ReservedBooking => block !== null);
}
