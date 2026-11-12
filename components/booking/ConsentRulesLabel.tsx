'use client';

import { CONSENT_LINKS, splitConsentLabel, type ConsentCopy } from '@/lib/legal';

interface ConsentRulesLabelProps {
  copy: ConsentCopy['rules'];
  /** Screen-reader suffix of each link ("opens in a new tab"). */
  newTabHint: string;
}

/**
 * The rules checkbox label with its real links (rules, refund-by-form rule, privacy policy). Each link
 * opens in a new tab, so the booking draft stays in this tab, and says so to screen readers.
 */
export function ConsentRulesLabel({ copy, newTabHint }: ConsentRulesLabelProps) {
  return (
    <>
      {splitConsentLabel(copy).map((part, index) =>
        part.type === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : (
          <a
            key={index}
            href={CONSENT_LINKS[part.key]}
            target="_blank"
            rel="noopener noreferrer"
            data-consent-link={part.key}
            className="font-semibold text-sky-400 underline underline-offset-2 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-sm"
          >
            {part.text}
            <span className="sr-only"> ({newTabHint})</span>
          </a>
        )
      )}
    </>
  );
}
