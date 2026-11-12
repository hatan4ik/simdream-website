'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { OFFERS_COPY } from '@/lib/offers/offers-copy';
import { BirthdaySection } from './BirthdaySection';
import { FinePrintSection } from './FinePrintSection';
import { MoreOffersSection } from './MoreOffersSection';
import { OffersHero } from './OffersHero';
import { useBirthdayCapability } from './use-birthday-capability';

/** The whole /offers page. Copy resolves by language code, never by text direction. */
export function OffersPageContent() {
  const { language } = useLanguage();
  const copy = OFFERS_COPY[language] || OFFERS_COPY.en;
  const enforceable = useBirthdayCapability();

  return (
    <div className="flex-1 w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      <OffersHero copy={copy} />
      <BirthdaySection copy={copy} language={language} enforceable={enforceable} />
      <MoreOffersSection copy={copy} language={language} />
      <FinePrintSection copy={copy} />
    </div>
  );
}
