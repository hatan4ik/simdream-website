'use client';

import { useId, useState } from 'react';
import { getConsentCopy } from '@/lib/legal';
import { useLanguage } from '@/lib/i18n/language-context';
import { buildConsentPayload, firstMissingConsent, type ConsentField } from '@/lib/booking/client';

/**
 * The two mandatory checkout confirmations (rules, refund-by-form rule and privacy policy; media release
 * and waiver of claims). Both start unchecked. Errors stay hidden until the visitor tries to submit; a
 * failed `validate()` shows them, moves focus to the first missing box and returns the localized message
 * for the page's live region. The server rejects a booking without both anyway (`POST /api/checkout`).
 */
export function useBookingConsent() {
  const { language } = useLanguage();
  const baseId = useId();
  const ids: Record<ConsentField, string> = { rules: `${baseId}-consent-rules`, media: `${baseId}-consent-media` };
  const [choices, setChoices] = useState({ rules: false, media: false });
  const [showErrors, setShowErrors] = useState(false);
  const copy = getConsentCopy(language);

  const errors: Record<ConsentField, string> = {
    rules: showErrors && !choices.rules ? copy.rules.error : '',
    media: showErrors && !choices.media ? copy.media.error : '',
  };

  /** Returns the message of the first missing confirmation, or null when both are given. */
  const validate = (moveFocus: boolean): string | null => {
    const missing = firstMissingConsent(choices);
    if (!missing) return null;
    setShowErrors(true);
    if (moveFocus) document.getElementById(ids[missing])?.focus();
    return missing === 'rules' ? copy.rules.error : copy.media.error;
  };

  return {
    ids,
    choices,
    errors,
    setRules: (value: boolean) => setChoices((current) => ({ ...current, rules: value })),
    setMedia: (value: boolean) => setChoices((current) => ({ ...current, media: value })),
    validate,
    payload: buildConsentPayload(choices, language),
  };
}

export type BookingConsent = ReturnType<typeof useBookingConsent>;
