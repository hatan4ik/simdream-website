'use client';

import { buildCheckoutExtraPayload, buildWixConsentNote } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';
import { useBookingBirthday } from './use-booking-birthday';
import { useBookingConsent } from './use-booking-consent';

interface UseBookingExtrasArgs {
  packageId: string;
  /** The flight date of the chosen slot. */
  flightDate: string;
  /** Registry subtotal in whole shekels, before any voucher or discount. */
  subtotalIls: number;
  wixAuthoritative: boolean;
  isWixSubscriptionRedemption: boolean;
}

/**
 * The mandatory extras of the booking checkout in one place: the two consent confirmations and the pilot's
 * birthday (with its discount preview). Both flows (the guided steps and the Express Shop) render the same
 * state, validate it on submit, and send it the same way:
 *  - local checkout: `payload` goes into `POST /api/checkout` (the server stamps and prices it);
 *  - Wix-hosted checkout: `wixCartNote()` records the stamp and the birthday day and month on the Wix cart;
 *  - Wix subscription redemption: required and checked here, nothing is stored (docs/modules/checkout-consent-birthday.md).
 */
export function useBookingExtras(args: UseBookingExtrasArgs) {
  const { language } = useLanguage();
  const birthday = useBookingBirthday(args);
  const consent = useBookingConsent();

  /** The first thing missing, as a localized message; the first invalid control takes focus, every error shows. */
  const validate = (): string | null => {
    const birthdayError = birthday.validate(true);
    const consentError = consent.validate(!birthdayError);
    return birthdayError ?? consentError;
  };

  return {
    birthday,
    consent,
    validate,
    /** Fields merged into the local `POST /api/checkout` body. */
    payload: buildCheckoutExtraPayload({ choices: consent.choices, language, pilotBirthDate: birthday.value }),
    /** The Wix cart note for the hosted checkout (the booker has just confirmed, so "now" is the stamp). */
    wixCartNote: (): string =>
      buildWixConsentNote({
        language,
        confirmedAtIso: new Date().toISOString(),
        birthday: birthday.state.birthday,
      }),
  };
}

export type BookingExtras = ReturnType<typeof useBookingExtras>;
