import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import type { BirthdayMonthDay } from '@/lib/discounts/birthday';
import type { SupportedLanguage } from '@/lib/i18n/translations';

/**
 * The Wix cart `note` ("Optional message left by the customer ... intended for the merchant", at most
 * 1000 characters; Cart V2 Update Cart) that carries the consent stamp and the pilot's birthday month and
 * day to the team on the Wix-hosted checkout, where no server of ours sees the booking. Written for staff,
 * so it is English whatever the page language. The time is the browser's clock: the authoritative time is
 * Wix's own cart and order timestamp. Pure: the caller supplies the time.
 */
export const WIX_CART_NOTE_MAX_LENGTH = 1000;

export interface WixConsentNoteInput {
  language: SupportedLanguage;
  /** ISO 8601 time from the browser at the moment the booker confirmed. */
  confirmedAtIso: string;
  /** Day and month only (data minimisation); omitted when there is nothing to pass on. */
  birthday: BirthdayMonthDay | null;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function buildWixConsentNote(input: WixConsentNoteInput): string {
  const parts = [
    'Sim Dream checkout confirmations:',
    'rules, refund-by-form rule and privacy policy = accepted;',
    'media release and waiver of claims = accepted;',
    `consent version ${CONSENT_VERSION}, legal documents ${LEGAL_DOCUMENT_VERSION};`,
    `page language ${input.language};`,
    `confirmed in the browser at ${input.confirmedAtIso} (Wix cart time is authoritative).`,
  ];
  if (input.birthday) {
    parts.push(
      `Pilot in Command birthday (day/month only): ${pad(input.birthday.day)}/${pad(input.birthday.month)}.`,
      'No birthday discount was applied automatically in this checkout.'
    );
  }
  return parts.join(' ').slice(0, WIX_CART_NOTE_MAX_LENGTH);
}
