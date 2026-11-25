import type { PackageCategory } from '@/types';

/**
 * Birthday discount policy, in named constants so the owner can veto each decision on its own.
 * Nothing else in the module (or in the UI that reads it) may retype these numbers.
 * Decisions and open questions: docs/modules/birthday-offers.md.
 */

/** Maximum percentage taken off the booking subtotal (package plus add-ons) for 90m+ missions. */
export const BIRTHDAY_DISCOUNT_PERCENT = 15;

/** Standard percentage taken off the booking subtotal for 60-minute Captain's Command flights. */
export const BIRTHDAY_60M_DISCOUNT_PERCENT = 10;

/**
 * Minimum flight duration that qualifies for the birthday discount (minutes).
 * Entry 30-minute discovery flights are excluded so slots are reserved for full captain missions (60m+).
 */
export const BIRTHDAY_MIN_DURATION_MINUTES = 60;

/**
 * Returns the birthday discount percentage for a given package duration or package id:
 * - 60 minutes ('pkg-captain-60'): 10%
 * - 90 & 120 minutes ('pkg-ultimate-90', 'pkg-grand-120'): 15%
 * - Below 60 minutes (e.g. 30m, 45m promo): 0%
 */
export function getBirthdayDiscountPercent(packageIdOrDuration: string | number): number {
  if (typeof packageIdOrDuration === 'number') {
    if (packageIdOrDuration < BIRTHDAY_MIN_DURATION_MINUTES) return 0;
    if (packageIdOrDuration === 60) return BIRTHDAY_60M_DISCOUNT_PERCENT;
    return BIRTHDAY_DISCOUNT_PERCENT;
  }
  if (packageIdOrDuration === 'pkg-captain-60') return BIRTHDAY_60M_DISCOUNT_PERCENT;
  if (packageIdOrDuration === 'pkg-ultimate-90' || packageIdOrDuration === 'pkg-grand-120') return BIRTHDAY_DISCOUNT_PERCENT;
  return 0;
}

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
