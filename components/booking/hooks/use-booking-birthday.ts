'use client';

import { useId, useMemo, useState } from 'react';
import { getBirthdayCheckoutCopy, getBirthdayErrorText, getBirthdayPackageEligibility } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  birthdayDateBounds,
  birthdayStatusKind,
  evaluateBirthdayField,
  resolveBirthdayPathMode,
} from '@/lib/booking/client';

interface UseBookingBirthdayArgs {
  packageId: string;
  /** The flight date of the chosen slot: it, not the booking date, decides the offer. */
  flightDate: string;
  /** Registry subtotal in whole shekels, before any voucher. */
  subtotalIls: number;
  /** `/api/slots` reported a live Wix Bookings calendar: the Wix-hosted checkout cannot enforce the offer. */
  wixAuthoritative: boolean;
  isWixSubscriptionRedemption: boolean;
}

/**
 * The mandatory Pilot in Command date of birth. It validates and previews the birthday offer with the same
 * engine the server decides with (`resolveBookingBirthday`); the discount shown here is a presentation
 * figure, the server recomputes it from the slot's date. The year of birth is never kept anywhere but this
 * state, and never leaves it except in the checkout request.
 */
export function useBookingBirthday(args: UseBookingBirthdayArgs) {
  const { packageId, flightDate, subtotalIls, wixAuthoritative, isWixSubscriptionRedemption } = args;
  const { language } = useLanguage();
  const id = `${useId()}-pilot-birthday`;
  const [value, setValue] = useState('');
  const [blurred, setBlurred] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mode = resolveBirthdayPathMode({ wixAuthoritative, isWixSubscriptionRedemption });
  const state = useMemo(
    () => evaluateBirthdayField({ value, packageId, flightDate, subtotalIls, mode }),
    [value, packageId, flightDate, subtotalIls, mode]
  );
  const bounds = useMemo(() => birthdayDateBounds(flightDate), [flightDate]);

  const copy = getBirthdayCheckoutCopy(language);
  const errorText =
    state.status === 'valid' || !state.error
      ? ''
      : state.error === 'required'
        ? copy.required
        : getBirthdayErrorText(language, state.error);
  // A wrong date is reported once the visitor leaves the field; a missing one only after a submit attempt.
  const visibleError = (state.error === 'required' ? submitted : blurred || submitted) ? errorText : '';

  /** Returns the message while the date is missing or unusable, or null. */
  const validate = (moveFocus: boolean): string | null => {
    if (state.status === 'valid') return null;
    setSubmitted(true);
    if (moveFocus) document.getElementById(id)?.focus();
    return errorText;
  };

  return {
    id,
    value,
    setValue,
    onBlur: () => setBlurred(true),
    mode,
    state,
    statusKind: birthdayStatusKind(state),
    bounds,
    /** Whole shekels taken off in the preview: 0 unless the local checkout applies the offer. */
    discountIls: state.applied ? state.discountIls : 0,
    /** This booking could earn the discount (local checkout, package that may carry it), whatever the date. */
    discountPossible: mode === 'local' && getBirthdayPackageEligibility(packageId).applicable,
    errorText: visibleError,
    validate,
  };
}

export type BookingBirthday = ReturnType<typeof useBookingBirthday>;
