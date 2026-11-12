import React from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { BIRTHDAY_MIN_PILOT_AGE_YEARS } from '@/lib/discounts/birthday';
import { fillOffersTemplate, type OffersCopy } from '@/lib/offers/offers-copy';

/** `#terms`: the no-stacking rule, the age note and the fair-use fine print, then the booking call to action. */
export function FinePrintSection({ copy }: { copy: OffersCopy }) {
  return (
    <>
      <section id="terms" aria-labelledby="terms-title" className="scroll-mt-28 space-y-5" data-offers-terms>
        <h2 id="terms-title" className="text-2xl sm:text-3xl font-bold text-white">
          {copy.termsTitle}
        </h2>
        <ul className="space-y-3">
          {copy.terms.map((term) => (
            <li key={term} className="flex gap-3 text-sm sm:text-base leading-relaxed text-slate-300">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>{fillOffersTemplate(term, { minAge: BIRTHDAY_MIN_PILOT_AGE_YEARS })}</span>
            </li>
          ))}
        </ul>
        <Link href="/rules" data-ui-control="button" data-button-variant="ghost" className={buttonClassName('ghost', 'md')}>
          {copy.termsLink}
        </Link>
      </section>

      <section
        aria-labelledby="offers-cta-title"
        className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-slate-900/80 to-slate-950 p-8 text-center space-y-4"
        data-offers-cta
      >
        <h2 id="offers-cta-title" className="text-2xl sm:text-3xl font-bold text-white">
          {copy.ctaTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-300">{copy.ctaBody}</p>
        <Link href="/book" data-ui-control="button" data-button-variant="primary" className={buttonClassName('primary', 'lg')}>
          {copy.ctaButton}
        </Link>
      </section>
    </>
  );
}
