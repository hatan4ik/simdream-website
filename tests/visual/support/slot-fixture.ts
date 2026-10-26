import type { FlightSlot } from '@/types';

/**
 * Fixed /api/slots payload for screenshots. The browser-test server's availability
 * depends on its real clock and on whatever other suites did to the shared store, and
 * the number of slot rows changes page height, so visual tests always render this one.
 */
const SCHEDULE: ReadonlyArray<{ start: string; maxMinutes: number; booked?: boolean; recommended?: boolean }> = [
  { start: '10:00', maxMinutes: 60 },
  { start: '11:15', maxMinutes: 210, recommended: true },
  { start: '12:30', maxMinutes: 135 },
  { start: '13:45', maxMinutes: 60 },
  { start: '15:00', maxMinutes: 0, booked: true },
  { start: '16:00', maxMinutes: 105 },
  { start: '18:45', maxMinutes: 240 },
  { start: '20:30', maxMinutes: 135 },
];

const PRICE_BY_DURATION: Record<number, number> = { 20: 250, 30: 399, 45: 490, 60: 690, 90: 950, 120: 1590 };

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function blockPeriodOf(start: string): FlightSlot['blockPeriod'] {
  const hour = Number(start.slice(0, 2));
  return hour < 15 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

export function fixedSlotsResponse(date: string, durationMinutes: number) {
  const price = PRICE_BY_DURATION[durationMinutes] ?? 690;
  const slots: FlightSlot[] = SCHEDULE.map(({ start, maxMinutes, booked, recommended }) => ({
    id: `visual-${date}-${start}-${durationMinutes}`,
    date,
    startTime: start,
    endTime: addMinutes(start, durationMinutes),
    reservedEndTime: addMinutes(start, durationMinutes + 15),
    durationMinutes,
    totalReservedMinutes: durationMinutes + 15,
    available: !booked && maxMinutes >= durationMinutes,
    blockPeriod: blockPeriodOf(start),
    blockLabel: blockPeriodOf(start),
    isPrimeTime: Number(start.slice(0, 2)) >= 18,
    dynamicPriceIls: price,
    basePriceIls: price,
    yieldPerMinIls: Math.round(price / durationMinutes),
    smartRecommendation: recommended ? 'optimal_150_pair' : null,
    disabledReason: booked ? 'booked' : null,
    disabledNote: booked ? 'Booked' : undefined,
    maxAvailableMinutes: maxMinutes,
  }));
  const durationAvailability = Object.fromEntries(
    Object.entries(PRICE_BY_DURATION).map(([minutes, minPriceIls]) => [
      minutes,
      { availableCount: SCHEDULE.filter((slot) => !slot.booked && slot.maxMinutes >= Number(minutes)).length, minPriceIls },
    ])
  );
  return { slots, durationAvailability };
}
