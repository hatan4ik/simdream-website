'use client';

import React, { use } from 'react';
import { loadRulesCoreIntl, loadRulesExtraIntl } from '@/lib/legal/loaders-intl';
import type { LegalIntlLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { RulesSections } from './RulesSections';

/**
 * The rules clause text in English, Russian, French, Arabic or Spanish. CLIENT-ONLY: loaded through
 * `next/dynamic` with `ssr: false` from `RulesBody`, so none of it is in the Wix worker. Clauses 1 to
 * 12 are the English original for every one of these languages; clauses 13 to 15 are in the page
 * language. `LegalHashScroll` mounts with the text, so a deep link such as `/rules#media-release`
 * scrolls once the lazy body has arrived.
 */
export default function RulesBodyIntl({ language }: { language: LegalIntlLanguage }) {
  // Start both loads before reading either, so they run in parallel.
  const corePromise = loadRulesCoreIntl();
  const extraPromise = loadRulesExtraIntl(language);
  const core = use(corePromise);
  const extra = use(extraPromise);

  return (
    <>
      <RulesSections language={language} core={core} coreLanguage="en" extra={extra} />
      <LegalHashScroll />
    </>
  );
}
