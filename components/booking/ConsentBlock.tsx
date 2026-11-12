'use client';

import { getConsentCopy } from '@/lib/legal';
import { getCheckoutExtrasCopy } from '@/lib/booking/client';
import { useLanguage } from '@/lib/i18n/language-context';
import { ConsentAgreement } from './ConsentAgreement';
import { ConsentRulesLabel } from './ConsentRulesLabel';
import { MediaReleaseDisclosure } from './MediaReleaseDisclosure';
import type { BookingConsent } from './hooks';

interface ConsentBlockProps {
  consent: BookingConsent;
}

/**
 * The two mandatory, separate confirmations before payment (rules clause 15): (1) the rules, the
 * refund-by-form rule and the privacy policy; (2) the media release and waiver of claims, with a plain
 * sentence, the booker's 18+ declaration and the full clause on demand. Both start unchecked. The copy is
 * the owner-reviewed `CONSENT_COPY` of `lib/legal`; nothing is retyped here.
 */
export function ConsentBlock({ consent }: ConsentBlockProps) {
  const { language } = useLanguage();
  const copy = getConsentCopy(language);
  const { opensInNewTab } = getCheckoutExtrasCopy(language);
  const guardianId = `${consent.ids.media}-guardian`;

  return (
    <fieldset data-consent-block className="min-w-0 space-y-3 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-bold text-white">{copy.heading}</legend>
      <p className="text-xs leading-relaxed text-slate-300">{copy.intro}</p>

      <ConsentAgreement
        kind="rules"
        id={consent.ids.rules}
        checked={consent.choices.rules}
        onChange={consent.setRules}
        label={<ConsentRulesLabel copy={copy.rules} newTabHint={opensInNewTab} />}
        ariaLabel={copy.rules.ariaLabel}
        summary={copy.rules.summary}
        error={consent.errors.rules}
      />

      <ConsentAgreement
        kind="media"
        id={consent.ids.media}
        checked={consent.choices.media}
        onChange={consent.setMedia}
        label={copy.media.label}
        ariaLabel={copy.media.ariaLabel}
        summary={copy.media.summary}
        error={consent.errors.media}
        describedBy={guardianId}
      >
        <p id={guardianId} className="ps-9 text-xs leading-relaxed text-slate-400">
          {copy.media.guardianNote}
        </p>
        <p className="ps-9 text-xs leading-relaxed text-slate-400">{copy.media.optOutNote}</p>
        <MediaReleaseDisclosure copy={copy.media} language={language} newTabHint={opensInNewTab} />
      </ConsentAgreement>

      <p className="text-[11px] leading-relaxed text-slate-400">{copy.recordNote}</p>
    </fieldset>
  );
}
