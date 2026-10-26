import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Booking } from '@/types';
import { evaluateDailyEfficiency, getDayOperatingConfig, minutesToTime } from '@/lib/scheduler/kantorovich-engine';
import {
  OPTIMIZABLE_DURATIONS,
  optimizeTiledCapacity,
  type CapacityDraftRequest,
  type CapacityOptimizationInput,
} from '@/lib/scheduler/tiled-interval-optimizer';
import {
  WEEKDAY_DATES,
  bookEngineOfferedSlots,
  bookingStepsArb,
  dateArb,
  liveIntervals,
  makeBooking,
  overlaps,
  reservedInterval,
  type ReservedInterval,
} from './_support/scheduler';

const RUNS = { numRuns: 150 };

/** Small inputs (≤ 4 requests × ≤ 3 starts) so an exhaustive oracle stays cheap. */
const scenarioArb: fc.Arbitrary<CapacityOptimizationInput> = dateArb.chain((date) => {
  const { openMinutes, closeMinutes } = getDayOperatingConfig(date);
  // Starts range slightly outside the window so the optimizer's own window filter is exercised.
  const startArb = fc
    .integer({ min: Math.floor((openMinutes - 60) / 15), max: Math.floor(closeMinutes / 15) })
    .map((quarter) => minutesToTime(quarter * 15));
  const requestArb = (id: string) =>
    fc.record({
      id: fc.constant(id),
      durationMinutes: fc.constantFrom(...OPTIMIZABLE_DURATIONS),
      valueIls: fc.integer({ min: 1, max: 2_000 }),
      candidateStartTimes: fc.array(startArb, { minLength: 1, maxLength: 3 }),
    });
  return fc.record({
    date: fc.constant(date),
    existingBookings: bookingStepsArb.map((steps) => bookEngineOfferedSlots(date, steps.slice(0, 4))),
    requests: fc
      .integer({ min: 1, max: 4 })
      .chain((count) => fc.tuple(...Array.from({ length: count }, (_, index) => requestArb(`req-${index}`)))),
  });
});

const orphanMinutes = (date: string, bookings: Booking[]) => evaluateDailyEfficiency(date, bookings).orphanGapMinutes;

interface Choice extends ReservedInterval {
  request: CapacityDraftRequest;
  startTime: string;
}

/**
 * Independent reference: enumerates every assignment (each request skipped or
 * placed at one of its starts) and returns the best declared value among those
 * that fit the window, overlap nothing and do not add orphan minutes, as
 * measured by the admin dashboard's own efficiency report.
 */
function bestCompatibleValue({ date, existingBookings, requests }: CapacityOptimizationInput): number {
  const { openMinutes, closeMinutes } = getDayOperatingConfig(date);
  const existing = liveIntervals(existingBookings, date);
  const baseline = orphanMinutes(date, existingBookings);
  const options: Array<Array<Choice | null>> = requests.map((request) => [
    null,
    ...[...new Set(request.candidateStartTimes)].map((startTime) => ({
      ...reservedInterval(startTime, request.durationMinutes),
      request,
      startTime,
    })),
  ]);

  let best = 0;
  const visit = (index: number, chosen: Choice[]): void => {
    if (index === options.length) {
      const fits = chosen.every(
        (choice, i) =>
          choice.start >= openMinutes &&
          choice.end <= closeMinutes &&
          !existing.some((interval) => overlaps(interval, choice)) &&
          !chosen.slice(i + 1).some((other) => overlaps(other, choice))
      );
      if (!fits) return;
      const placed = chosen.map((choice) =>
        makeBooking({ bookingDate: date, startTime: choice.startTime, durationMinutes: choice.request.durationMinutes })
      );
      if (orphanMinutes(date, [...existingBookings, ...placed]) > baseline) return;
      best = Math.max(best, chosen.reduce((sum, choice) => sum + choice.request.valueIls, 0));
      return;
    }
    for (const option of options[index]) visit(index + 1, option ? [...chosen, option] : chosen);
  };
  visit(0, []);
  return best;
}

describe('optimizeTiledCapacity properties', () => {
  it('finds the maximum declared value among all compatible choices', () => {
    let allocating = 0;
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const best = bestCompatibleValue(input);
        if (best > 0) allocating += 1;
        expect(optimizeTiledCapacity(input).projectedValueIls).toBe(best);
      }),
      RUNS
    );
    expect(allocating).toBeGreaterThan(RUNS.numRuns / 4);
  });

  it('never recommends overlapping placements or placements over live bookings', () => {
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const existing = liveIntervals(input.existingBookings, input.date);
        const placed = optimizeTiledCapacity(input).recommendations.map((recommendation) =>
          reservedInterval(recommendation.startTime, recommendation.durationMinutes)
        );
        const clashes = placed.flatMap((interval, index) =>
          [...existing, ...placed.slice(index + 1)].filter((other) => overlaps(interval, other))
        );
        expect(clashes).toEqual([]);
      }),
      RUNS
    );
  });

  it('places every recommendation inside the operating window at one of its requested starts', () => {
    let checked = 0;
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const { openMinutes, closeMinutes } = getDayOperatingConfig(input.date);
        const { recommendations } = optimizeTiledCapacity(input);
        checked += recommendations.length;
        for (const recommendation of recommendations) {
          const request = input.requests.find((candidate) => candidate.id === recommendation.requestId);
          const interval = reservedInterval(recommendation.startTime, recommendation.durationMinutes);
          expect(request?.candidateStartTimes).toContain(recommendation.startTime);
          expect(recommendation).toMatchObject({
            durationMinutes: request?.durationMinutes,
            valueIls: request?.valueIls,
            reservedEndTime: minutesToTime(interval.end),
          });
          expect(interval.start).toBeGreaterThanOrEqual(openMinutes);
          expect(interval.end).toBeLessThanOrEqual(closeMinutes);
        }
      }),
      RUNS
    );
    expect(checked).toBeGreaterThan(RUNS.numRuns / 4);
  });

  it('accounts for every request exactly once and sums the recommended value', () => {
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const preview = optimizeTiledCapacity(input);
        const recommended = preview.recommendations.map((recommendation) => recommendation.requestId);
        expect(new Set(recommended).size).toBe(recommended.length);
        expect([...recommended, ...preview.unallocatedRequestIds].sort()).toEqual(
          input.requests.map((request) => request.id).sort()
        );
        expect(preview.projectedValueIls).toBe(
          preview.recommendations.reduce((sum, recommendation) => sum + recommendation.valueIls, 0)
        );
      }),
      RUNS
    );
  });

  it('never increases orphan capacity beyond the baseline', () => {
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const preview = optimizeTiledCapacity(input);
        const recommended = preview.recommendations.map((recommendation) =>
          makeBooking({
            bookingDate: input.date,
            startTime: recommendation.startTime,
            durationMinutes: recommendation.durationMinutes,
          })
        );
        expect(preview.baselineOrphanMinutes).toBe(orphanMinutes(input.date, input.existingBookings));
        // The reported figure must describe the recommended schedule, measured independently.
        expect(preview.recommendedOrphanMinutes).toBe(orphanMinutes(input.date, [...input.existingBookings, ...recommended]));
        expect(preview.recommendedOrphanMinutes).toBeLessThanOrEqual(preview.baselineOrphanMinutes);
      }),
      RUNS
    );
  });

  it('never moves, cancels or otherwise mutates existing bookings or requests', () => {
    fc.assert(
      fc.property(scenarioArb, (input) => {
        const snapshot = structuredClone(input);
        const preview = optimizeTiledCapacity(input);
        expect(input).toEqual(snapshot);
        expect(preview).toMatchObject({
          mode: 'exact_dry_run',
          date: input.date,
          existingBookingCount: liveIntervals(input.existingBookings, input.date).length,
        });
      }),
      RUNS
    );
  });
});

describe('optimizeTiledCapacity examples', () => {
  it('ignores cancelled bookings and bookings on other dates', () => {
    const date = WEEKDAY_DATES.monday;
    const preview = optimizeTiledCapacity({
      date,
      existingBookings: [
        makeBooking({ bookingDate: date, startTime: '10:00', durationMinutes: 60, status: 'cancelled' }),
        makeBooking({ bookingDate: WEEKDAY_DATES.tuesday, startTime: '10:00', durationMinutes: 60 }),
      ],
      requests: [{ id: 'morning', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }],
    });
    expect(preview).toMatchObject({ existingBookingCount: 0, projectedValueIls: 690, unallocatedRequestIds: [] });
  });

  it('rejects starts outside the Saturday prime-time window', () => {
    const preview = optimizeTiledCapacity({
      date: WEEKDAY_DATES.saturday,
      existingBookings: [],
      requests: [
        { id: 'too-early', durationMinutes: 60, valueIls: 900, candidateStartTimes: ['18:45'] },
        { id: 'too-late', durationMinutes: 120, valueIls: 1_590, candidateStartTimes: ['22:45'] },
      ],
    });
    expect(preview).toMatchObject({ eligibleCandidateCount: 0, projectedValueIls: 0 });
    expect(preview.unallocatedRequestIds).toEqual(['too-early', 'too-late']);
  });

  it('solves the largest accepted batch (8 requests × 4 starts) within the documented search bound', () => {
    const starts = ['10:00', '11:15', '12:30', '13:45', '15:00', '18:00', '19:15', '20:30'];
    const requests = Array.from({ length: 8 }, (_, index) => ({
      id: `batch-${index}`,
      durationMinutes: 60 as const,
      valueIls: 600 + index,
      candidateStartTimes: [0, 1, 2, 3].map((offset) => starts[(index + offset) % starts.length]),
    }));
    const preview = optimizeTiledCapacity({ date: WEEKDAY_DATES.wednesday, existingBookings: [], requests });
    expect(preview.exploredSchedules).toBeGreaterThan(0);
    expect(preview.exploredSchedules).toBeLessThanOrEqual(5 ** 8);
    expect(preview.recommendations).toHaveLength(8);
    expect(preview.projectedValueIls).toBe(requests.reduce((sum, request) => sum + request.valueIls, 0));
  });
});
