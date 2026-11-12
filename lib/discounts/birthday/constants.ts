import type { PackageCategory } from '@/types';

/**
 * Birthday discount policy, in named constants so the owner can veto each decision on its own.
 * Nothing else in the module (or in the UI that reads it) may retype these numbers.
 * Decisions and open questions: docs/modules/birthday-offers.md.
 */

/** Percentage taken off the booking subtotal (package plus add-ons). */
export const BIRTHDAY_DISCOUNT_PERCENT = 15;

/**
 * Backward grace: a birthday that happened up to this many days BEFORE the flight date still
 * qualifies even when it fell in the previous month, so a flight in the first days of a month
 * does not miss a birthday from the end of the month before.
 */
export const BIRTHDAY_LOOKBACK_DAYS = 14;

/**
 * Forward grace: a birthday up to this many days AFTER the flight date qualifies even when it falls
 * in the next month. OFF by default (0); the engine and the tests support it. Open question for the owner.
 */
export const BIRTHDAY_LOOKAHEAD_DAYS = 0;

/** Facility rule (Terms 3.6): entry from age 10. The birthday is the pilot's, not the booker's. */
export const BIRTHDAY_MIN_PILOT_AGE_YEARS = 10;

/** Plausibility ceiling for a typed date of birth. */
export const BIRTHDAY_MAX_PILOT_AGE_YEARS = 110;

/**
 * Package categories the birthday discount applies to. Consumer experience flights only: the
 * Discounted Promotion is excluded separately (no stacking, Terms 8.1), and the owner's current
 * live offer page limits the offer to consumer flights. PRO training, fear of flying and the
 * corporate workshop are open questions for the owner (one line to change).
 */
export const BIRTHDAY_ELIGIBLE_CATEGORIES: readonly PackageCategory[] = ['recreational'];

/** Everything the evaluation depends on, so tests and callers can inject a variant. */
export interface BirthdayPolicy {
  percent: number;
  lookbackDays: number;
  lookaheadDays: number;
  minAgeYears: number;
  maxAgeYears: number;
}

export const DEFAULT_BIRTHDAY_POLICY: BirthdayPolicy = {
  percent: BIRTHDAY_DISCOUNT_PERCENT,
  lookbackDays: BIRTHDAY_LOOKBACK_DAYS,
  lookaheadDays: BIRTHDAY_LOOKAHEAD_DAYS,
  minAgeYears: BIRTHDAY_MIN_PILOT_AGE_YEARS,
  maxAgeYears: BIRTHDAY_MAX_PILOT_AGE_YEARS,
};
