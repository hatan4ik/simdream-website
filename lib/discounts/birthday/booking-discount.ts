import { DEFAULT_BIRTHDAY_POLICY, type BirthdayPolicy } from './constants';
import { isBirthdayDiscountEnforceableOnActivePath } from './capability';
import { getBirthdayPackageEligibility, type BirthdayPackageBlockReason } from './eligibility';
import { evaluateBirthdayDiscount, type BirthdayDateError, type BirthdayReason } from './evaluate';
import { applyBirthdayDiscount } from './money';
import { toBirthdayMonthDay, type BirthdayMonthDay } from './minimise';

/**
 * Why a valid, in-range birthday earned nothing on this booking, other than the date itself:
 * the purchase may not carry the offer (no stacking, category) or the live checkout cannot enforce it.
 */
export type BookingBirthdayBlock = BirthdayPackageBlockReason | 'checkout_path';

export interface BookingBirthdayInput {
  /** The pilot's date of birth, strict YYYY-MM-DD. The only place the full date is used. */
  birthDate: string;
  /** The FLIGHT date of the chosen slot (Israel calendar date), never the booking date. */
  flightDate: string;
  packageId: string;
  /** Booking subtotal in whole shekels (package plus add-ons, before any voucher). */
  subtotalIls: number;
  isSubscriptionRedemption?: boolean;
  /** The live checkout is Wix-authoritative: the discount cannot be enforced there. */
  wixAuthoritative?: boolean;
  /** Israel today, injectable for tests. */
  today?: string;
  policy?: BirthdayPolicy;
}

export type BookingBirthdayResult =
  | { ok: false; error: BirthdayDateError }
  | {
      ok: true;
      /** True only when the discount is taken off the subtotal. */
      applied: boolean;
      /** What the date alone says (`same_month`, `grace_before`, `grace_after`, `none`). */
      reason: BirthdayReason;
      /** Set when the date qualifies but the purchase or checkout path may not carry the offer. */
      blockedBy?: BookingBirthdayBlock;
      /** The only part of the birth date that may be stored. */
      birthday: BirthdayMonthDay;
      percent: number;
      subtotalIls: number;
      discountIls: number;
      /** Subtotal minus the discount, whole shekels. */
      totalIls: number;
      discountAgorot: number;
      totalAgorot: number;
    };

/**
 * One decision for the whole booking: validates the pilot's birth date (always, in every flow),
 * then decides and prices the birthday discount. The server calls it with the slot's own date and
 * the registry subtotal; the browser calls the same function to preview. Pure: no I/O.
 *
 * Eligible only when the DATE qualifies (`evaluateBirthdayDiscount`), the PACKAGE may carry it
 * (`getBirthdayPackageEligibility`: no Discounted Promotion, no subscription, consumer flights only) and the
 * CHECKOUT PATH can enforce it (`isBirthdayDiscountEnforceableOnActivePath`).
 */
export function resolveBookingBirthday(input: BookingBirthdayInput): BookingBirthdayResult {
  const policy = input.policy ?? DEFAULT_BIRTHDAY_POLICY;
  const evaluation = evaluateBirthdayDiscount(
    { birthDate: input.birthDate, flightDate: input.flightDate, today: input.today },
    policy
  );
  const birthday = toBirthdayMonthDay(input.birthDate);
  if (!evaluation.valid || !birthday) {
    return { ok: false, error: evaluation.error ?? 'invalid_birth_date' };
  }

  const packageEligibility = getBirthdayPackageEligibility(input.packageId, {
    isSubscriptionRedemption: input.isSubscriptionRedemption,
  });
  const enforceable = isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: input.wixAuthoritative });

  let blockedBy: BookingBirthdayBlock | undefined;
  if (evaluation.eligible) {
    if (!packageEligibility.applicable && packageEligibility.reason !== 'ok') blockedBy = packageEligibility.reason;
    else if (!enforceable) blockedBy = 'checkout_path';
  }

  const applied = evaluation.eligible && blockedBy === undefined;
  const price = applyBirthdayDiscount(input.subtotalIls, applied ? evaluation.percent : 0);
  return {
    ok: true,
    applied,
    reason: evaluation.reason,
    blockedBy,
    birthday,
    percent: price.percent,
    subtotalIls: price.subtotalIls,
    discountIls: price.discountIls,
    totalIls: price.totalIls,
    discountAgorot: price.discountAgorot,
    totalAgorot: price.totalAgorot,
  };
}
