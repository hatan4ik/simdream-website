'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/language-context';
import { loadPrivacyHe } from '@/lib/legal/loaders';
import { PRIVACY_PAGE_COPY } from '@/lib/legal/page-copy';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { LegalLoadingFallback } from '../shared/LegalLoadingFallback';
import { PrivacySections } from './PrivacySections';

/** Placeholder for the policy text of another language while its client-only chunk arrives. */
function PrivacyBodyLoading() {
  const { language } = useLanguage();
  const copy = PRIVACY_PAGE_COPY[language] || PRIVACY_PAGE_COPY.en;
  return <LegalLoadingFallback label={copy.loading} />;
}

// The server renders Hebrew only, so the other five languages' policy text is client-only (see RulesBody).
const PrivacyBodyIntl = dynamic(() => import('./PrivacyBodyIntl'), { ssr: false, loading: PrivacyBodyLoading });

/** Hebrew policy text, loaded by dynamic import and server-rendered into the HTML. */
function PrivacyBodyHebrew({ tocLabel }: { tocLabel: string }) {
  const body = use(loadPrivacyHe());
  return (
    <>
      <PrivacySections language="he" body={body} tocLabel={tocLabel} />
      <LegalHashScroll />
    </>
  );
}

/** The privacy policy text for the visitor's language (see `RulesBody`). */
export function PrivacyBody({ language, tocLabel }: { language: LegalLanguage; tocLabel: string }) {
  if (language === 'he') return <PrivacyBodyHebrew tocLabel={tocLabel} />;
  return <PrivacyBodyIntl language={language} tocLabel={tocLabel} />;
}
