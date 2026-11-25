'use client';

import React, { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/language-context';
import { PRIVACY_PAGE_COPY } from '@/lib/legal/page-copy';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalLoadingFallback } from '../shared/LegalLoadingFallback';

/** Placeholder for the policy text of another language while its client-only chunk arrives. */
function PrivacyBodyLoading() {
  const { language } = useLanguage();
  const copy = PRIVACY_PAGE_COPY[language] || PRIVACY_PAGE_COPY.en;
  return <LegalLoadingFallback label={copy.loading} />;
}

// The server renders Hebrew only, so the other five languages' policy text is client-only (see RulesBody).
const PrivacyBodyIntl = dynamic(() => import('./PrivacyBodyIntl'), { ssr: false, loading: PrivacyBodyLoading });

/**
 * The privacy policy text for the visitor's language: the server-rendered `hebrewBody` slot for
 * Hebrew (no Suspense boundary, see `RulesBody`), the client-only chunk for every other language.
 */
export function PrivacyBody({
  language,
  tocLabel,
  hebrewBody,
}: {
  language: LegalLanguage;
  tocLabel: string;
  hebrewBody: ReactNode;
}) {
  const copy = PRIVACY_PAGE_COPY[language] || PRIVACY_PAGE_COPY.en;
  if (language === 'he') return <>{hebrewBody}</>;
  return (
    <Suspense fallback={<LegalLoadingFallback label={copy.loading} />}>
      <PrivacyBodyIntl language={language} tocLabel={tocLabel} />
    </Suspense>
  );
}
