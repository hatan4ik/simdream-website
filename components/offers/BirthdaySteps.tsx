import React from 'react';
import type { OffersCopy } from '@/lib/offers/offers-copy';
import { fillOffersTemplate } from '@/lib/offers/offers-copy';
import { BIRTHDAY_DISCOUNT_PERCENT, BIRTHDAY_LOOKBACK_DAYS } from '@/lib/discounts/birthday';

const VALUES = { percent: BIRTHDAY_DISCOUNT_PERCENT, days: BIRTHDAY_LOOKBACK_DAYS };

/** The three plain steps of the birthday offer. */
export function BirthdaySteps({ copy }: { copy: OffersCopy }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">{copy.stepsTitle}</h3>
      <ol className="grid gap-4 md:grid-cols-3">
        {copy.steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-sm font-bold text-sky-400"
            >
              {index + 1}
            </span>
            <p className="text-base font-bold text-white">{step.title}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{fillOffersTemplate(step.body, VALUES)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
