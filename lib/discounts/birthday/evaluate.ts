import { israelToday } from '@/lib/scheduler/israel-clock';
import { DEFAULT_BIRTHDAY_POLICY, type BirthdayPolicy } from './constants';
import {
  addDays,
  compareCivil,
  daysInMonth,
  formatIsoDate,
  parseIsoDate,
  toDayNumber,
  type CivilDate,
} from './civil-date';

export type BirthdayReason = 'same_month' | 'grace_before' | 'grace_after' | 'none';

export type BirthdayDateError =
  | 'invalid_birth_date'
  | 'invalid_flight_date'
  | 'birth_date_in_future'
  | 'pilot_too_young'
  | 'pilot_too_old';

export interface BirthdayEvaluationInput {
  /** The pilot's date of birth, strict YYYY-MM-DD. */
  birthDate: string;
  /** The FLIGHT date (Israel calendar date), strict YYYY-MM-DD, never the booking date. */
  flightDate: string;
  /** Today's Israel date; injectable for tests. Defaults to the Israel clock. */
  today?: string;
}

export interface BirthdayEvaluation {
  /** False when an input is unusable; `error` then names the problem and nothing is eligible. */
  valid: boolean;
  error?: BirthdayDateError;
  eligible: boolean;
  reason: BirthdayReason;
  /** The percentage that applies: the policy percent when eligible, else 0. */
  percent: number;
  /**
   * The birthday occurrence the verdict is about (YYYY-MM-DD). It is the one in the flight's year,
   * except that a grace window crossing New Year uses the neighbouring year's occurrence
   * (flight 2027-01-03, birthday 12-28: 2026-12-28). A 29 February birthday counts as 28 February
   * in a year without one.
   */
  birthdayDate: string | null;
  /** First and last FLIGHT dates (inclusive) that qualify for `birthdayDate`. */
  windowStart: string | null;
  windowEnd: string | null;
  /** Flight date minus birthday, in days: positive when the birthday has passed, negative when it is ahead. */
  daysFromBirthday: number | null;
}

const NOT_VALID = (error: BirthdayDateError): BirthdayEvaluation => ({
  valid: false,
  error,
  eligible: false,
  reason: 'none',
  percent: 0,
  birthdayDate: null,
  windowStart: null,
  windowEnd: null,
  daysFromBirthday: null,
});

/** The birthday in `year`; 29 February becomes 28 February when the year has no 29th. */
function occurrenceIn(birth: CivilDate, year: number): CivilDate {
  const day = Math.min(birth.day, daysInMonth(year, birth.month));
  return { year, month: birth.month, day };
}

/** Flight dates that qualify for a birthday occurrence: its whole month plus the grace on either side. */
function qualifyingWindow(occurrence: CivilDate, policy: BirthdayPolicy): { start: CivilDate; end: CivilDate } {
  const firstOfMonth: CivilDate = { year: occurrence.year, month: occurrence.month, day: 1 };
  const lastOfMonth: CivilDate = {
    year: occurrence.year,
    month: occurrence.month,
    day: daysInMonth(occurrence.year, occurrence.month),
  };
  const graceStart = addDays(occurrence, -policy.lookaheadDays);
  const graceEnd = addDays(occurrence, policy.lookbackDays);
  return {
    start: compareCivil(graceStart, firstOfMonth) < 0 ? graceStart : firstOfMonth,
    end: compareCivil(graceEnd, lastOfMonth) > 0 ? graceEnd : lastOfMonth,
  };
}

function verdictFor(
  birth: CivilDate,
  flight: CivilDate,
  policy: BirthdayPolicy
): { reason: BirthdayReason; occurrence: CivilDate } {
  const inFlightYear = occurrenceIn(birth, flight.year);
  if (inFlightYear.month === flight.month) return { reason: 'same_month', occurrence: inFlightYear };

  // A grace window can reach into the neighbouring year (December birthday, January flight).
  const flightDay = toDayNumber(flight);
  const neighbours = [flight.year - 1, flight.year, flight.year + 1].map((year) => occurrenceIn(birth, year));

  let before: { occurrence: CivilDate; days: number } | null = null;
  let after: { occurrence: CivilDate; days: number } | null = null;
  for (const occurrence of neighbours) {
    const days = flightDay - toDayNumber(occurrence);
    if (days >= 1 && days <= policy.lookbackDays && (!before || days < before.days)) before = { occurrence, days };
    if (days <= -1 && -days <= policy.lookaheadDays && (!after || -days < after.days)) after = { occurrence, days: -days };
  }
  if (before) return { reason: 'grace_before', occurrence: before.occurrence };
  if (after) return { reason: 'grace_after', occurrence: after.occurrence };
  return { reason: 'none', occurrence: inFlightYear };
}

/**
 * Decides whether a pilot's birthday earns the discount on a given flight date.
 *
 * Eligible when, in the flight's calendar month, the birthday falls (`same_month`), or the birthday
 * happened 1 to `lookbackDays` days before the flight (`grace_before`), or is 1 to `lookaheadDays`
 * days ahead (`grace_after`, off by default). The verdict depends on the flight date only, so
 * booking a year ahead during a birthday month earns nothing. Pure: no I/O, no time zone (the
 * Israel calendar dates are compared as plain dates; only the default for `today` reads the clock).
 */
export function evaluateBirthdayDiscount(
  input: BirthdayEvaluationInput,
  policy: BirthdayPolicy = DEFAULT_BIRTHDAY_POLICY
): BirthdayEvaluation {
  const birth = parseIsoDate(input.birthDate);
  if (!birth) return NOT_VALID('invalid_birth_date');
  const flight = parseIsoDate(input.flightDate);
  if (!flight) return NOT_VALID('invalid_flight_date');
  const today = parseIsoDate(input.today ?? israelToday());
  if (today && compareCivil(birth, today) > 0) return NOT_VALID('birth_date_in_future');

  // Age on the flight date, counting a 29 February birthday from 28 February in a common year.
  const birthdayInFlightYear = occurrenceIn(birth, flight.year);
  const flightBeforeBirthday = compareCivil(flight, birthdayInFlightYear) < 0;
  const age = flight.year - birth.year - (flightBeforeBirthday ? 1 : 0);
  if (age < policy.minAgeYears) return NOT_VALID('pilot_too_young');
  if (age > policy.maxAgeYears) return NOT_VALID('pilot_too_old');

  const { reason, occurrence } = verdictFor(birth, flight, policy);
  const window = qualifyingWindow(occurrence, policy);
  const eligible = reason !== 'none';
  return {
    valid: true,
    eligible,
    reason,
    percent: eligible ? policy.percent : 0,
    birthdayDate: formatIsoDate(occurrence),
    windowStart: formatIsoDate(window.start),
    windowEnd: formatIsoDate(window.end),
    daysFromBirthday: toDayNumber(flight) - toDayNumber(occurrence),
  };
}

/** Convenience for the server: true only for a valid, eligible evaluation. */
export function isBirthdayDiscountEarned(input: BirthdayEvaluationInput, policy?: BirthdayPolicy): boolean {
  const result = evaluateBirthdayDiscount(input, policy);
  return result.valid && result.eligible;
}
