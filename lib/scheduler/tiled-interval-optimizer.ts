import { Booking } from '@/types';
import {
  canTileIntervalZeroWaste,
  getDayOperatingConfig,
  getReservedMinutesForFlight,
  minutesToTime,
  timeToMinutes,
} from './kantorovich-engine';

/**
 * A bounded, exact allocator for admin-only draft requests.
 *
 * This is deliberately separate from the live booking path. Checkout keeps the
 * deterministic availability check plus the database exclusion constraint. The
 * allocator evaluates a small queue of flexible requests and never persists or
 * moves an existing booking.
 */
export const OPTIMIZABLE_DURATIONS = [20, 45, 60, 90, 120, 240] as const;
export type OptimizableDuration = (typeof OPTIMIZABLE_DURATIONS)[number];

export interface CapacityDraftRequest {
  id: string;
  durationMinutes: OptimizableDuration;
  valueIls: number;
  candidateStartTimes: string[];
}

export interface CapacityOptimizationInput {
  date: string;
  existingBookings: Booking[];
  requests: CapacityDraftRequest[];
}

export interface CapacityRecommendation {
  requestId: string;
  startTime: string;
  endTime: string;
  reservedEndTime: string;
  durationMinutes: OptimizableDuration;
  valueIls: number;
}

export interface CapacityOptimizationPreview {
  mode: 'exact_dry_run';
  date: string;
  existingBookingCount: number;
  eligibleCandidateCount: number;
  exploredSchedules: number;
  baselineOrphanMinutes: number;
  recommendedOrphanMinutes: number;
  projectedValueIls: number;
  recommendations: CapacityRecommendation[];
  unallocatedRequestIds: string[];
  rationale: string;
}

interface ReservedInterval {
  start: number;
  end: number;
}

interface Candidate extends ReservedInterval {
  requestId: string;
  startTime: string;
  endTime: string;
  reservedEndTime: string;
  durationMinutes: OptimizableDuration;
  valueIls: number;
}

interface PreparedRequest {
  request: CapacityDraftRequest;
  candidates: Candidate[];
}

interface Solution {
  candidates: Candidate[];
  valueIls: number;
  orphanMinutes: number;
}

function intervalsOverlap(a: ReservedInterval, b: ReservedInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

function isPrimeTimeAt(minute: number, isSaturday: boolean): boolean {
  return isSaturday || minute >= 18 * 60;
}

function getOrphanMinutes(intervals: ReservedInterval[], date: string): number {
  const config = getDayOperatingConfig(date);
  const sorted = [...intervals]
    .filter((interval) => interval.end > config.openMinutes && interval.start < config.closeMinutes)
    .sort((a, b) => a.start - b.start);

  let cursor = config.openMinutes;
  let orphanMinutes = 0;

  for (const interval of sorted) {
    const start = Math.max(cursor, interval.start);
    if (start > cursor) {
      const gap = start - cursor;
      if (!canTileIntervalZeroWaste(gap, isPrimeTimeAt(cursor, config.isSaturday))) {
        orphanMinutes += gap;
      }
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < config.closeMinutes) {
    const gap = config.closeMinutes - cursor;
    if (!canTileIntervalZeroWaste(gap, isPrimeTimeAt(cursor, config.isSaturday))) {
      orphanMinutes += gap;
    }
  }

  return orphanMinutes;
}

function compareSolutions(left: Solution, right: Solution): number {
  if (left.valueIls !== right.valueIls) return left.valueIls - right.valueIls;
  if (left.orphanMinutes !== right.orphanMinutes) return right.orphanMinutes - left.orphanMinutes;
  if (left.candidates.length !== right.candidates.length) return left.candidates.length - right.candidates.length;

  const leftKey = left.candidates.map((candidate) => `${candidate.startTime}:${candidate.requestId}`).join('|');
  const rightKey = right.candidates.map((candidate) => `${candidate.startTime}:${candidate.requestId}`).join('|');
  return rightKey.localeCompare(leftKey);
}

function prepareCandidates(input: CapacityOptimizationInput, existing: ReservedInterval[]): PreparedRequest[] {
  const config = getDayOperatingConfig(input.date);

  return input.requests
    .map((request) => {
      const reservedMinutes = getReservedMinutesForFlight(request.durationMinutes);
      const candidates = Array.from(new Set(request.candidateStartTimes))
        .map((startTime) => {
          const start = timeToMinutes(startTime);
          const end = start + reservedMinutes;
          const endTime = minutesToTime(start + request.durationMinutes);

          return {
            requestId: request.id,
            start,
            end,
            startTime,
            endTime,
            reservedEndTime: minutesToTime(end),
            durationMinutes: request.durationMinutes,
            valueIls: request.valueIls,
          } satisfies Candidate;
        })
        .filter(
          (candidate) =>
            candidate.start >= config.openMinutes &&
            candidate.end <= config.closeMinutes &&
            !existing.some((interval) => intervalsOverlap(candidate, interval))
        )
        .sort((a, b) => a.start - b.start);

      return { request, candidates };
    })
    .sort((a, b) => {
      if (a.request.valueIls !== b.request.valueIls) return b.request.valueIls - a.request.valueIls;
      return a.candidates.length - b.candidates.length;
    });
}

/**
 * Selects the highest declared-value non-overlapping set of draft requests.
 * A recommendation is accepted only when it does not increase existing orphan
 * capacity. Input validation limits this exhaustive search to eight requests,
 * with four candidate starts each (at most 390,625 branches before pruning).
 */
export function optimizeTiledCapacity(input: CapacityOptimizationInput): CapacityOptimizationPreview {
  const existing = input.existingBookings
    .filter((booking) => booking.bookingDate === input.date && booking.status !== 'cancelled')
    .map((booking) => {
      const start = timeToMinutes(booking.startTime);
      return { start, end: start + getReservedMinutesForFlight(booking.durationMinutes) };
    });
  const baselineOrphanMinutes = getOrphanMinutes(existing, input.date);
  const requests = prepareCandidates(input, existing);
  const maximumRemainingValue = new Array<number>(requests.length + 1).fill(0);

  for (let index = requests.length - 1; index >= 0; index -= 1) {
    maximumRemainingValue[index] = maximumRemainingValue[index + 1] + requests[index].request.valueIls;
  }

  let exploredSchedules = 0;
  let best: Solution = { candidates: [], valueIls: 0, orphanMinutes: baselineOrphanMinutes };

  const search = (index: number, selected: Candidate[], valueIls: number): void => {
    if (valueIls + maximumRemainingValue[index] < best.valueIls) return;

    if (index === requests.length) {
      exploredSchedules += 1;
      const candidateSolution: Solution = {
        candidates: selected,
        valueIls,
        orphanMinutes: getOrphanMinutes([...existing, ...selected], input.date),
      };

      if (
        candidateSolution.orphanMinutes <= baselineOrphanMinutes &&
        compareSolutions(candidateSolution, best) > 0
      ) {
        best = candidateSolution;
      }
      return;
    }

    const request = requests[index];
    for (const candidate of request.candidates) {
      if (!selected.some((interval) => intervalsOverlap(candidate, interval))) {
        search(index + 1, [...selected, candidate], valueIls + candidate.valueIls);
      }
    }

    search(index + 1, selected, valueIls);
  };

  search(0, [], 0);

  const recommendations = [...best.candidates]
    .sort((a, b) => a.start - b.start)
    .map(({ start: _start, end: _end, ...recommendation }) => recommendation);
  const selectedRequestIds = new Set(recommendations.map((recommendation) => recommendation.requestId));

  return {
    mode: 'exact_dry_run',
    date: input.date,
    existingBookingCount: existing.length,
    eligibleCandidateCount: requests.reduce((total, request) => total + request.candidates.length, 0),
    exploredSchedules,
    baselineOrphanMinutes,
    recommendedOrphanMinutes: best.orphanMinutes,
    projectedValueIls: best.valueIls,
    recommendations,
    unallocatedRequestIds: input.requests
      .map((request) => request.id)
      .filter((requestId) => !selectedRequestIds.has(requestId)),
    rationale:
      'Exact dry run: maximizes declared request value while preserving all non-cancelled bookings and never increasing orphan capacity. No booking was created, moved, or cancelled.',
  };
}
