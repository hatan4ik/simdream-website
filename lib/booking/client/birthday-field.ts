import {
  BIRTHDAY_MAX_PILOT_AGE_YEARS,
  BIRTHDAY_MIN_PILOT_AGE_YEARS,
  addDays,
  daysInMonth,
  formatIsoDate,
  parseIsoDate,
  resolveBookingBirthday,
  type BirthdayDateError,
  type BirthdayMonthDay,
  type BirthdayReason,
  type BookingBirthdayBlock,
  type CivilDate,
} from '@/lib/discounts/birthday';
import { israelToday } from '@/lib/scheduler/israel-clock';

/**
 * The mandatory "Pilot in Command" birth date of the booking page, as pure rules (no React, no I/O):
 * which checkout path the booking takes, the bounds of the date control and what the date earns.
 * The browser previews with the same `resolveBookingBirthday` the server decides with; the server
 * stays authoritative (`POST /api/checkout`).
 */

/**
 * - `local`: Supabase + Stripe checkout; the server can apply and enforce the discount.
 * - `wix`: Wix-hosted checkout; the discount cannot be enforced there (docs/modules/birthday-offers.md, section 4).
 * - `wix-pricing`: an active Wix Bookings Pricing provider verifies a server-signed claim at checkout.
 * - `subscription`: redemption of a prepaid flight-track session through Wix; no discount, nothing stored.
 */
export type BirthdayPathMode = 'local' | 'wix' | 'wix-pricing' | 'subscription';

export function resolveBirthdayPathMode(inputs: {
  wixAuthoritative: boolean;
  wixBirthdayPricingProviderEnabled?: boolean;
  isWixSubscriptionRedemption: boolean;
}): BirthdayPathMode {
  if (inputs.isWixSubscriptionRedemption) return 'subscription';
  if (!inputs.wixAuthoritative) return 'local';
  return inputs.wixBirthdayPricingProviderEnabled ? 'wix-pricing' : 'wix';
}

function shiftYears(date: CivilDate, years: number): CivilDate {
  const year = date.year + years;
  return { year, month: date.month, day: Math.min(date.day, daysInMonth(year, date.month)) };
}

/**
 * `min` and `max` for the date control, from the engine's age bounds on the flight date (at least
 * `BIRTHDAY_MIN_PILOT_AGE_YEARS`, at most `BIRTHDAY_MAX_PILOT_AGE_YEARS`) and never after today.
 * Both are loosened by a day so the native control never blocks a date the engine accepts (29 February);
 * the engine's verdict, with its localized message, is the one that counts.
 */
export function birthdayDateBounds(
  flightDate: string,
  today: string = israelToday()
): { min: string; max: string } | null {
  const flight = parseIsoDate(flightDate);
  if (!flight) return null;
  const youngest = formatIsoDate(addDays(shiftYears(flight, -BIRTHDAY_MIN_PILOT_AGE_YEARS), 1));
  return {
    min: formatIsoDate(shiftYears(flight, -(BIRTHDAY_MAX_PILOT_AGE_YEARS + 1))),
    max: youngest < today ? youngest : today,
  };
}

export type BirthdayFieldErrorKey = 'required' | BirthdayDateError;

export interface BirthdayFieldState {
  mode: BirthdayPathMode;
  status: 'empty' | 'invalid' | 'valid';
  error?: BirthdayFieldErrorKey;
  /** True only when the discount is taken off (local path, qualifying date, eligible package). */
  applied: boolean;
  /** Whole shekels the preview takes off; 0 unless `applied`. */
  discountIls: number;
  reason: BirthdayReason | null;
  blockedBy?: BookingBirthdayBlock;
  /** The only part of the date that is ever stored or sent to staff. */
  birthday: BirthdayMonthDay | null;
}

export interface BirthdayFieldInputs {
  /** The control's value: `YYYY-MM-DD` or an empty string. */
  value: string;
  packageId: string;
  /** The flight date of the chosen slot. */
  flightDate: string;
  /** Registry subtotal in whole shekels, before any voucher. */
  subtotalIls: number;
  mode: BirthdayPathMode;
  today?: string;
}

const EMPTY: Omit<BirthdayFieldState, 'mode' | 'status'> = {
  applied: false,
  discountIls: 0,
  reason: null,
  birthday: null,
};

/** What the entered date means for this booking right now. Recomputed whenever the date, package or flight date changes. */
export function evaluateBirthdayField(inputs: BirthdayFieldInputs): BirthdayFieldState {
  const { mode } = inputs;
  if (!inputs.value) return { ...EMPTY, mode, status: 'empty', error: 'required' };

  const result = resolveBookingBirthday({
    birthDate: inputs.value,
    flightDate: inputs.flightDate,
    packageId: inputs.packageId,
    subtotalIls: Math.round(inputs.subtotalIls),
    isSubscriptionRedemption: mode === 'subscription',
    wixAuthoritative: mode === 'wix',
    today: inputs.today,
  });
  if (!result.ok) return { ...EMPTY, mode, status: 'invalid', error: result.error };
  return {
    mode,
    status: 'valid',
    applied: result.applied,
    discountIls: result.discountIls,
    reason: result.reason,
    blockedBy: result.blockedBy,
    birthday: result.birthday,
  };
}

/**
 * Which message sits under the date control. `banner` is the congratulations with the discount. On the
 * Wix-hosted checkout without the pricing provider the notice is always shown (nothing appears or disappears with the date), and for a
 * flight-track redemption the field's own hint already says the date is not stored.
 */
export type BirthdayStatusKind = 'none' | 'banner' | 'not_eligible' | 'not_applicable' | 'wix_notice';

export function birthdayStatusKind(state: BirthdayFieldState): BirthdayStatusKind {
  if (state.mode === 'wix') return 'wix_notice';
  if (state.mode === 'subscription' || state.status !== 'valid') return 'none';
  if (state.applied) return 'banner';
  return state.reason === 'none' ? 'not_eligible' : 'not_applicable';
}
