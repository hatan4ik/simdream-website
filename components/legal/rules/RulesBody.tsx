'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/language-context';
import { loadRulesCoreHe, loadRulesExtraHe } from '@/lib/legal/loaders';
import { RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { LegalLoadingFallback } from '../shared/LegalLoadingFallback';
import { RulesSections } from './RulesSections';

/** Placeholder for the clause text of another language while its client-only chunk arrives. */
function RulesBodyLoading() {
  const { language } = useLanguage();
  const copy = RULES_PAGE_COPY[language] || RULES_PAGE_COPY.en;
  return <LegalLoadingFallback label={copy.loading} />;
}

// The server renders Hebrew only, so the other five languages' clause text is client-only: this
// import stays out of the server graph and so out of the Wix worker (docs/modules/wix-bundle-diet.md).
const RulesBodyIntl = dynamic(() => import('./RulesBodyIntl'), { ssr: false, loading: RulesBodyLoading });

/** Hebrew clause text, loaded by dynamic import and server-rendered into the HTML. */
function RulesBodyHebrew() {
  // Start both loads before reading either, so they run in parallel.
  const corePromise = loadRulesCoreHe();
  const extraPromise = loadRulesExtraHe();
  const core = use(corePromise);
  const extra = use(extraPromise);

  return (
    <>
      <RulesSections language="he" core={core} coreLanguage="he" extra={extra} />
      <LegalHashScroll />
    </>
  );
}

/**
 * The clause text for the visitor's language. Reading the promises with `use()` suspends the body,
 * so the page keeps its own `<Suspense>` boundary above it and the server renders the Hebrew text
 * into the HTML. Any other language is loaded in the browser only (`RulesBodyIntl`).
 */
export function RulesBody({ language }: { language: LegalLanguage }) {
  if (language === 'he') return <RulesBodyHebrew />;
  return <RulesBodyIntl language={language} />;
}
