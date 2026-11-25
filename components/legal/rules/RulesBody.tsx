'use client';

import React, { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/language-context';
import { RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalLoadingFallback } from '../shared/LegalLoadingFallback';

/** Placeholder for the clause text of another language while its client-only chunk arrives. */
function RulesBodyLoading() {
  const { language } = useLanguage();
  const copy = RULES_PAGE_COPY[language] || RULES_PAGE_COPY.en;
  return <LegalLoadingFallback label={copy.loading} />;
}

// The server renders Hebrew only, so the other five languages' clause text is client-only: this
// import stays out of the server graph and so out of the Wix worker (docs/modules/wix-bundle-diet.md).
const RulesBodyIntl = dynamic(() => import('./RulesBodyIntl'), { ssr: false, loading: RulesBodyLoading });

/**
 * The clause text for the visitor's language. Hebrew is the server-rendered `hebrewBody` slot
 * (`RulesBodyHebrew`), shown without a Suspense boundary: a boundary around text this large is
 * streamed and, hydrated early, left a second copy of every clause id in the DOM. Any other
 * language is loaded in the browser only (`RulesBodyIntl`), behind its own boundary.
 */
export function RulesBody({ language, hebrewBody }: { language: LegalLanguage; hebrewBody: ReactNode }) {
  const copy = RULES_PAGE_COPY[language] || RULES_PAGE_COPY.en;
  if (language === 'he') return <>{hebrewBody}</>;
  return (
    <Suspense fallback={<LegalLoadingFallback label={copy.loading} />}>
      <RulesBodyIntl language={language} />
    </Suspense>
  );
}
