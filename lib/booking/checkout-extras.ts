import { getBirthdayErrorText, resolveBookingBirthday, type BookingBirthdayResult } from '@/lib/discounts/birthday';
import { buildConsentRecord, type ConsentRecord } from '@/lib/legal/consent-record';
import type { SupportedLanguage } from '@/lib/i18n/translations';

/**
 * The server's decision on the two checkout extras of a local booking: the consent record and the
 * pilot's birthday discount. Pure, so the arithmetic and the rules are unit-tested without a server.
 * The client sends the two confirmations, the page language and the typed birth date; everything else
 * (time, versions, eligibility, amounts) is decided here.
 */
export interface CheckoutExtrasInput {
  packageId: string;
  /** The booked flight's date (Israel calendar date). */
  bookingDate: string;
  /** Registry subtotal in whole shekels (package plus add-ons). */
  subtotalIls: number;
  pilotBirthDate: string;
  consent: { rulesRefundsAndPrivacy: boolean; mediaReleaseAndWaiver: boolean; language: SupportedLanguage };
  /** Server clock. */
  now: Date;
  /** Israel today, for the "birth date in the future" check. */
  today: string;
}

export type CheckoutExtras =
  | { ok: false; message: string }
  | {
      ok: true;
      consentRecord: ConsentRecord;
      birthday: Extract<BookingBirthdayResult, { ok: true }>;
    };

export function resolveCheckoutExtras(input: CheckoutExtrasInput): CheckoutExtras {
  const consent = buildConsentRecord({ ...input.consent, now: input.now });
  if (!consent.ok) {
    return {
      ok: false,
      message: `Both confirmations are required to complete the booking (${consent.missing.join(', ')}).`,
    };
  }

  const birthday = resolveBookingBirthday({
    birthDate: input.pilotBirthDate,
    flightDate: input.bookingDate,
    packageId: input.packageId,
    subtotalIls: input.subtotalIls,
    today: input.today,
  });
  if (!birthday.ok) {
    return { ok: false, message: getBirthdayErrorText(input.consent.language, birthday.error) };
  }
  return { ok: true, consentRecord: consent.record, birthday };
}
