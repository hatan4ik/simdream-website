import React from 'react';
import { Info } from 'lucide-react';
import { BIRTHDAY_DISCOUNT_PERCENT, BIRTHDAY_LOOKBACK_DAYS } from '@/lib/discounts/birthday';
import type { SupportedLanguage } from '@/lib/i18n/translations';
import { formatIls } from '@/lib/offers/format';
import { fillOffersTemplate, type OffersCopy } from '@/lib/offers/offers-copy';
import { getBirthdayExample } from '@/lib/offers/offers-data';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { BirthdayCalculator } from './BirthdayCalculator';
import { BirthdaySteps } from './BirthdaySteps';

interface BirthdaySectionProps {
  copy: OffersCopy;
  language: SupportedLanguage;
  /** False only when the live checkout definitely cannot apply the discount. */
  enforceable: boolean | null;
}

/** `#birthday`: the headline offer, its steps, a worked example from the registry and the calculator. */
export function BirthdaySection({ copy, language, enforceable }: BirthdaySectionProps) {
  const values = { percent: BIRTHDAY_DISCOUNT_PERCENT, days: BIRTHDAY_LOOKBACK_DAYS };
  const example = getBirthdayExample();
  const flightTitle = getLocalizedPackages(language).find((pkg) => pkg.id === example.packageId)?.title ?? '';

  return (
    <section id="birthday" aria-labelledby="birthday-title" className="scroll-mt-28 space-y-8" data-offers-birthday>
      <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-slate-900/80 to-slate-950 p-6 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
          <p
            aria-hidden="true"
            dir="ltr"
            className="text-center text-7xl sm:text-8xl font-black leading-none tracking-tight text-orange-400"
          >
            {BIRTHDAY_DISCOUNT_PERCENT}%
          </p>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">{copy.birthdayEyebrow}</p>
            <h2 id="birthday-title" className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {fillOffersTemplate(copy.birthdayTitle, values)}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-slate-300">
              {fillOffersTemplate(copy.birthdayLead, values)}
            </p>
            {enforceable === false && (
              <p
                role="note"
                data-offers-birthday-unavailable
                className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{copy.birthdayUnavailable}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <BirthdaySteps copy={copy} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2" data-offers-example>
          <h3 className="text-lg font-bold text-white">{copy.exampleTitle}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            {fillOffersTemplate(copy.exampleBody, {
              flight: flightTitle,
              regular: formatIls(example.price.subtotalIls),
              total: formatIls(example.price.totalIls),
              saving: formatIls(example.price.discountIls),
              percent: BIRTHDAY_DISCOUNT_PERCENT,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <h3 className="text-lg font-bold text-white">{copy.whenTitle}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{fillOffersTemplate(copy.whenBody, values)}</p>
        </div>
      </div>

      <BirthdayCalculator copy={copy} language={language} />
    </section>
  );
}
