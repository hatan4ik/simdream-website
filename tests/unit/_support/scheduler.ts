import fc from 'fast-check';
import type { Booking, BookingStatus } from '@/types';
import {
  generateKantorovichSlots,
  getDayOperatingConfig,
  getReservedMinutesForFlight,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';

/** Durations the slots API accepts (30 is legacy/internal, still supported by the engine). */
export const ENGINE_DURATIONS = [20, 30, 45, 60, 90, 120] as const;
export type EngineDuration = (typeof ENGINE_DURATIONS)[number];

/** One calendar date per weekday (0 = Sunday … 6 = Saturday) in the week of DEFAULT_TEST_NOW. */
export const WEEKDAY_DATES = {
  sunday: '2026-11-01',
  monday: '2026-11-02',
  tuesday: '2026-11-03',
  wednesday: '2026-11-04',
  thursday: '2026-11-05',
  friday: '2026-11-06',
  saturday: '2026-11-07',
} as const;

const DAY_MS = 86_400_000;
const FIRST_SUNDAY_2026_UTC = Date.UTC(2026, 0, 4);

/** A YYYY-MM-DD calendar date together with the weekday it must fall on. */
export const dateWithWeekdayArb = fc
  .record({ week: fc.integer({ min: 0, max: 156 }), weekday: fc.integer({ min: 0, max: 6 }) })
  .map(({ week, weekday }) => ({
    weekday,
    date: new Date(FIRST_SUNDAY_2026_UTC + (week * 7 + weekday) * DAY_MS).toISOString().slice(0, 10),
  }));

export const dateArb = dateWithWeekdayArb.map(({ date }) => date);

let bookingSequence = 0;

/** A minimal, valid booking; only the scheduling fields matter to the engine. */
export function makeBooking(
  fields: Pick<Booking, 'bookingDate' | 'startTime' | 'durationMinutes'> & Partial<Booking>
): Booking {
  bookingSequence += 1;
  return {
    id: `unit-booking-${bookingSequence}`,
    bookingReference: `SD-737-UNIT${String(bookingSequence).padStart(12, '0')}`,
    packageId: 'pkg-captain-60',
    packageTitle: 'Unit test flight',
    endTime: fields.startTime,
    pilotName: 'Unit Pilot',
    pilotEmail: 'unit.pilot@example.test',
    pilotPhone: '+972500000000',
    experienceLevel: 'beginner',
    addons: [],
    subtotalIls: 690,
    discountIls: 0,
    totalIls: 690,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...fields,
  };
}

export interface BookingStep {
  duration: EngineDuration;
  pick: number;
  status: BookingStatus;
}

export const bookingStepsArb = fc.array(
  fc.record({
    duration: fc.constantFrom(...ENGINE_DURATIONS),
    pick: fc.nat(),
    status: fc.constantFrom<BookingStatus>('confirmed', 'confirmed', 'pending', 'completed', 'cancelled'),
  }),
  { maxLength: 8 }
);

/**
 * Builds a realistic day by repeatedly booking a slot the engine itself offers,
 * exactly as checkout does. Steps with no open slot are skipped.
 */
export function bookEngineOfferedSlots(date: string, steps: readonly BookingStep[]): Booking[] {
  const bookings: Booking[] = [];
  for (const step of steps) {
    const open = generateKantorovichSlots(date, step.duration, bookings).filter((slot) => slot.available);
    if (open.length === 0) continue;
    const slot = open[step.pick % open.length];
    bookings.push(
      makeBooking({
        bookingDate: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: step.duration,
        status: step.status,
      })
    );
  }
  return bookings;
}

export interface ReservedInterval {
  start: number;
  end: number;
}

export function reservedInterval(startTime: string, durationMinutes: number): ReservedInterval {
  const start = timeToMinutes(startTime);
  return { start, end: start + getReservedMinutesForFlight(durationMinutes) };
}

export function liveIntervals(bookings: readonly Booking[], date: string): ReservedInterval[] {
  return bookings
    .filter((booking) => booking.bookingDate === date && booking.status !== 'cancelled')
    .map((booking) => reservedInterval(booking.startTime, booking.durationMinutes));
}

export function overlaps(a: ReservedInterval, b: ReservedInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Start of the next live booking at or after `start`, or closing time. */
export function nextHardStop(bookings: readonly Booking[], date: string, start: number): number {
  return liveIntervals(bookings, date)
    .map((interval) => interval.start)
    .filter((bookingStart) => bookingStart >= start)
    .reduce((earliest, bookingStart) => Math.min(earliest, bookingStart), getDayOperatingConfig(date).closeMinutes);
}
