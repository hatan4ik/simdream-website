import React from 'react';
import { Gift } from 'lucide-react';
import type { OffersCopy } from '@/lib/offers/offers-copy';

const chipClass =
  'inline-flex min-h-11 items-center rounded-full border border-slate-700 bg-slate-900/60 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-sky-400 hover:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';

export function OffersHero({ copy }: { copy: OffersCopy }) {
  return (
    <section className="text-center max-w-3xl mx-auto space-y-5" data-offers-hero>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs sm:text-sm font-semibold tracking-wide">
        <Gift className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{copy.heroEyebrow}</span>
      </div>
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">{copy.heroTitle}</h1>
      <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{copy.heroLead}</p>
      <ul className="flex flex-wrap justify-center gap-2 pt-1">
        <li>
          <a href="#birthday" className={chipClass}>
            {copy.jumpBirthday}
          </a>
        </li>
        <li>
          <a href="#more-offers" className={chipClass}>
            {copy.jumpMore}
          </a>
        </li>
        <li>
          <a href="#terms" className={chipClass}>
            {copy.jumpTerms}
          </a>
        </li>
      </ul>
    </section>
  );
}
