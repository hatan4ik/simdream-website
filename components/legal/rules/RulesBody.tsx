'use client';

import React, { use } from 'react';
import { loadRulesCore, loadRulesExtra, rulesCoreLanguageFor } from '@/lib/legal/loaders';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { RulesSections } from './RulesSections';

/**
 * Loads the clause text for the visitor's language (dynamic import, memoised) and renders it.
 * Reading the promises with `use()` suspends this component, so the page keeps its own
 * `<Suspense>` boundary above it and the server renders the text into the HTML.
 */
export function RulesBody({ language }: { language: LegalLanguage }) {
  const coreLanguage = rulesCoreLanguageFor(language);
  // Start both loads before reading either, so they run in parallel.
  const corePromise = loadRulesCore(coreLanguage);
  const extraPromise = loadRulesExtra(language);
  const core = use(corePromise);
  const extra = use(extraPromise);

  return (
    <>
      <RulesSections language={language} core={core} coreLanguage={coreLanguage} extra={extra} />
      <LegalHashScroll />
    </>
  );
}
