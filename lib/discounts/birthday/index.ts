/**
 * Birthday discount module: the pure engine (no React, no I/O). Public entry point.
 *
 *   evaluateBirthdayDiscount({ birthDate, flightDate })  -> eligibility, reason, window
 *   getBirthdayPackageEligibility(packageId, context)    -> which purchases may carry it (no stacking)
 *   applyBirthdayDiscount(subtotalIls)                   -> whole-shekel price and agorot for Stripe
 *   toBirthdayMonthDay(birthDate)                        -> the only part of a birth date to persist
 *   isBirthdayDiscountEnforceableOnActivePath(options)   -> may the UI advertise it on this checkout path
 *
 * Handoff and decisions: docs/modules/birthday-offers.md.
 */
export * from './constants';
export * from './capability';
export * from './copy';
export * from './eligibility';
export * from './evaluate';
export * from './minimise';
export * from './money';
export { addDays, daysInMonth, formatIsoDate, isLeapYear, parseIsoDate, type CivilDate } from './civil-date';
