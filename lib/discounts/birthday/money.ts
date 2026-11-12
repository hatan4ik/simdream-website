import { BIRTHDAY_DISCOUNT_PERCENT } from './constants';

export interface BirthdayPrice {
  percent: number;
  subtotalIls: number;
  /** Whole shekels taken off, rounded half up. */
  discountIls: number;
  /** What is left to pay, whole shekels, never negative. */
  totalIls: number;
  /** The same two amounts in agorot, the unit Stripe charges in. */
  discountAgorot: number;
  totalAgorot: number;
}

function assertWholeShekels(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative whole number of shekels, received ${value}.`);
  }
}

/**
 * The discount on a subtotal, in whole shekels, rounded half up (₪450 at 15% is 67.5, so ₪68).
 * Integer arithmetic only, so no floating point can leak into a price.
 */
export function calculateBirthdayDiscountIls(subtotalIls: number, percent: number = BIRTHDAY_DISCOUNT_PERCENT): number {
  assertWholeShekels(subtotalIls, 'subtotalIls');
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`percent must be a whole number from 0 to 100, received ${percent}.`);
  }
  return Math.floor((subtotalIls * percent + 50) / 100);
}

/**
 * Applies the birthday discount to the booking subtotal (package plus add-ons, whole shekels from the
 * registries). The result never goes negative or fractional and carries the agorot amounts for Stripe.
 */
export function applyBirthdayDiscount(subtotalIls: number, percent: number = BIRTHDAY_DISCOUNT_PERCENT): BirthdayPrice {
  const discountIls = calculateBirthdayDiscountIls(subtotalIls, percent);
  const totalIls = subtotalIls - discountIls;
  return {
    percent,
    subtotalIls,
    discountIls,
    totalIls,
    discountAgorot: discountIls * 100,
    totalAgorot: totalIls * 100,
  };
}
