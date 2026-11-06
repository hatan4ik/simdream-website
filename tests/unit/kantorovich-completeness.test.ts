import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Booking } from '@/types';
import {
  evaluateDailyEfficiency,
  generateKantorovichSlots,
  getDayOperatingConfig,
  getKantorovichPricing,
  getReservedMinutesForFlight,
  is45MinutePromoDay,
  minutesToTime,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';
import {
  ENGINE_DURATIONS,
  WEEKDAY_DATES,
  bookEngineOfferedSlots,
  bookingStepsArb,
  dateArb,
  liveIntervals,
  makeBooking,
  overlaps,
} from './_support/scheduler';

/**
 * Completeness oracle for the slot engine.
 *
 * The engine is proven *sound* elsewhere (nothing it offers can break a day). This file asks the
 * opposite question: of all departures the business rules would accept, how many does the engine
 * actually sell? The oracle enumerates every 15-minute-aligned start that fits the operating
 * window, overlaps no live booking, respects the discounted-promotion rule and adds no orphan
 * capacity according to evaluateDailyEfficiency, the admin dashboard's zero-waste judge.
 *
 * Judging a gap by where it starts is exact for this catalog: every multiple of 15 minutes from
 * 75 upwards tiles with 45- and 75-minute blocks alone, so the discounted-promotion 60-minute block
 * is only ever needed for a 60-minute gap, and such a gap is tileable only on a Sun–Tue daytime.
 */
function safeStarts(date: string, duration: number, bookings: readonly Booking[]): number[] {
  const config = getDayOperatingConfig(date);
  const reserved = getReservedMinutesForFlight(duration);
  const baseline = evaluateDailyEfficiency(date, [...bookings]).orphanGapMinutes;
  const live = liveIntervals(bookings, date);
  const safe: number[] = [];
  for (let start = config.openMinutes; start + reserved <= config.closeMinutes; start += 15) {
    const interval = { start, end: start + reserved };
    if (live.some((booked) => overlaps(booked, interval))) continue;
    if (
      duration === 45 &&
      (!is45MinutePromoDay(date) || getKantorovichPricing(45, start, config.isSaturday).isPrimeTime)
    ) {
      continue;
    }
    const candidate = makeBooking({ bookingDate: date, startTime: minutesToTime(start), durationMinutes: duration });
    if (evaluateDailyEfficiency(date, [...bookings, candidate]).orphanGapMinutes > baseline) continue;
    safe.push(start);
  }
  return safe;
}

function offeredStarts(date: string, duration: number, bookings: readonly Booking[]): number[] {
  return generateKantorovichSlots(date, duration, [...bookings])
    .filter((slot) => slot.available)
    .map((slot) => timeToMinutes(slot.startTime));
}

/** Maximal free windows between live bookings and the operating-window edges. */
function freeWindows(date: string, bookings: readonly Booking[]): Array<{ start: number; end: number }> {
  const config = getDayOperatingConfig(date);
  const windows: Array<{ start: number; end: number }> = [];
  let cursor = config.openMinutes;
  for (const interval of liveIntervals(bookings, date).sort((a, b) => a.start - b.start)) {
    if (interval.start > cursor) windows.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < config.closeMinutes) windows.push({ start: cursor, end: config.closeMinutes });
  return windows;
}

const scenario = fc.record({ date: dateArb, steps: bookingStepsArb, duration: fc.constantFrom(...ENGINE_DURATIONS) });

describe('slot engine soundness against the exact zero-waste oracle', () => {
  it('offers only departures the oracle also accepts', () => {
    let checked = 0;
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const bookings = bookEngineOfferedSlots(date, steps);
        const safe = new Set(safeStarts(date, duration, bookings));
        const offered = offeredStarts(date, duration, bookings);
        checked += offered.length;
        expect(offered.filter((start) => !safe.has(start)).map(minutesToTime)).toEqual([]);
      }),
      { numRuns: 200 }
    );
    expect(checked).toBeGreaterThan(500);
  });

  it('offers every departure at most once and on the 15-minute raster', () => {
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const offered = offeredStarts(date, duration, bookEngineOfferedSlots(date, steps));
        expect(new Set(offered).size).toBe(offered.length);
        expect(offered.filter((start) => start % 15 !== 0)).toEqual([]);
      }),
      { numRuns: 200 }
    );
  });
});

describe('slot engine completeness: duration-aware cadence', () => {
  /**
   * The customer calendar follows each service's own reserved duration, not an
   * unrelated 75-minute constructor display grid. The zero-waste oracle remains
   * the safety guard: a newly visible cadence start must never create a dead gap.
   */
  const tuesday = WEEKDAY_DATES.tuesday;
  const fencedAfternoon = [
    makeBooking({ bookingDate: tuesday, startTime: '15:15', durationMinutes: 30 }), // reserved until 16:00
    makeBooking({ bookingDate: tuesday, startTime: '19:15', durationMinutes: 60 }), // reserved until 20:30
  ];
  const WINDOW = { start: 16 * 60, end: 19 * 60 + 15 };
  const inWindow = (starts: number[], duration: number) =>
    starts.filter((start) => start >= WINDOW.start && start + getReservedMinutesForFlight(duration) <= WINDOW.end).map(minutesToTime);

  it('exposes duration-valid 90-minute departures inside an otherwise free window', () => {
    expect(inWindow(safeStarts(tuesday, 90, fencedAfternoon), 90)).toEqual(['16:00', '16:45', '17:30']);
    expect(inWindow(offeredStarts(tuesday, 90, fencedAfternoon), 90)).toEqual(['16:00', '17:30']);
  });

  it('reconnects a 30-minute service on its 45-minute reserved cadence after a live booking', () => {
    const bookings = [makeBooking({ bookingDate: tuesday, startTime: '10:00', durationMinutes: 30 })];
    const starts = offeredStarts(tuesday, 30, bookings).map(minutesToTime);
    expect(starts.slice(0, 3)).toEqual(['10:45', '11:30', '12:15']);
  });

  it('keeps the share of dark (day, duration) pairs and dark windows within the measured bound', () => {
    // Fixed seed: this is a ratchet on the current trade-off, not a search for new failures.
    const sample = fc.sample(fc.record({ date: dateArb, steps: bookingStepsArb }), { numRuns: 600, seed: 7 });
    let pairs = 0;
    let darkPairs = 0;
    let windows = 0;
    let darkWindows = 0;
    for (const { date, steps } of sample) {
      const bookings = bookEngineOfferedSlots(date, steps);
      for (const duration of ENGINE_DURATIONS) {
        const safe = safeStarts(date, duration, bookings);
        const offered = offeredStarts(date, duration, bookings);
        pairs += 1;
        if (safe.length > 0 && offered.length === 0) darkPairs += 1;
        const reserved = getReservedMinutesForFlight(duration);
        for (const window of freeWindows(date, bookings)) {
          const fits = (start: number) => start >= window.start && start + reserved <= window.end;
          if (!safe.some(fits)) continue;
          windows += 1;
          if (!offered.some(fits)) darkWindows += 1;
        }
      }
    }
    const report = { pairs, darkPairs, darkPairShare: darkPairs / pairs, windows, darkWindows, darkWindowShare: darkWindows / windows };
    console.log(`completeness ratchet: ${JSON.stringify(report)}`);
    expect(pairs).toBe(600 * ENGINE_DURATIONS.length);
    expect(report.darkPairShare).toBe(0);
    expect(report.darkWindowShare).toBe(0);
  });
});
