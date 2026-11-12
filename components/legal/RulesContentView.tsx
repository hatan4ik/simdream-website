'use client';

import React, { Suspense, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import { LegalContactBox } from './shared/LegalContactBox';
import { LegalLoadingFallback } from './shared/LegalLoadingFallback';
import { RulesBody } from './rules/RulesBody';
import { RulesHeader } from './rules/RulesHeader';
import { RulesHighlights } from './rules/RulesHighlights';
import { RulesNotice } from './rules/RulesNotice';
import { RulesToc } from './rules/RulesToc';

/**
 * `/rules`: header, highlights, language notice, table of contents, the clause text for the
 * visitor's language and the contact box. Each part is its own component under `./rules`; the
 * clause text itself lives in `lib/legal/content` and is loaded per language.
 */
export function RulesContentView() {
  const { language } = useLanguage();
  const copy = RULES_PAGE_COPY[language] || RULES_PAGE_COPY.en;

  // Keep the boundary's element identity stable across unrelated context updates (the saved
  // language resolving after mount). A new element would make React throw away the server HTML of
  // the clause text and show the fallback until the per-language chunk arrives.
  const body = useMemo(
    () => (
      <Suspense fallback={<LegalLoadingFallback label={copy.loading} />}>
        <RulesBody language={language} />
      </Suspense>
    ),
    [language, copy.loading]
  );

  return (
    <div className="flex-1 w-full min-w-0 py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      <RulesHeader copy={copy} />
      <RulesHighlights copy={copy} />
      {copy.translationNotice ? <RulesNotice text={copy.translationNotice} /> : null}
      <RulesToc language={language} label={copy.tocLabel} />
      {body}
      <LegalContactBox question={copy.contactQuestion} crossLinkHref="/privacy-policy" crossLinkLabel={copy.privacyLink} />
    </div>
  );
}
