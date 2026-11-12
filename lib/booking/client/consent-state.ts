import type { SupportedLanguage } from '@/lib/i18n/translations';

/**
 * The two separate confirmations of the booking checkout (rules clause 15), as pure state rules.
 * Both start unchecked and both are mandatory; one never implies the other.
 */
export type ConsentField = 'rules' | 'media';

export interface ConsentChoices {
  rules: boolean;
  media: boolean;
}

/** The first confirmation still missing, in the order they appear on the page. */
export function firstMissingConsent(choices: ConsentChoices): ConsentField | null {
  if (!choices.rules) return 'rules';
  if (!choices.media) return 'media';
  return null;
}

export interface ConsentPayload {
  rulesRefundsAndPrivacy: boolean;
  mediaReleaseAndWaiver: boolean;
  /** The page language the booker read the wording in. The server adds the time and the versions. */
  language: SupportedLanguage;
}

export function buildConsentPayload(choices: ConsentChoices, language: SupportedLanguage): ConsentPayload {
  return { rulesRefundsAndPrivacy: choices.rules, mediaReleaseAndWaiver: choices.media, language };
}

/**
 * The extra fields of `POST /api/checkout` for the local checkout: the two confirmations and the typed
 * birth date. The client never sends a version, a timestamp or a discount; the server decides those.
 */
export function buildCheckoutExtraPayload(inputs: {
  choices: ConsentChoices;
  language: SupportedLanguage;
  pilotBirthDate: string;
}): { consent: ConsentPayload; pilotBirthDate: string } {
  return {
    consent: buildConsentPayload(inputs.choices, inputs.language),
    pilotBirthDate: inputs.pilotBirthDate,
  };
}
