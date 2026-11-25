'use client';

import React, { type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import { LegalContactBox } from './shared/LegalContactBox';
import { RulesBody } from './rules/RulesBody';
import { RulesHeader } from './rules/RulesHeader';
import { RulesHighlights } from './rules/RulesHighlights';
import { RulesNotice } from './rules/RulesNotice';
import { RulesToc } from './rules/RulesToc';

/**
 * `/rules`: header, highlights, language notice, table of contents, the clause text for the
 * visitor's language and the contact box. Each part is its own component under `./rules`; the
 * clause text itself lives in `lib/legal/content`. The Hebrew text arrives as the server-rendered
 * `hebrewBody` slot (`RulesBodyHebrew`), every other language is loaded in the browser.
 */
export function RulesContentView({ hebrewBody }: { hebrewBody: ReactNode }) {
  const { language } = useLanguage();
  const copy = RULES_PAGE_COPY[language] || RULES_PAGE_COPY.en;

  return (
    <div className="flex-1 w-full min-w-0 py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      <RulesHeader copy={copy} />
      <RulesHighlights copy={copy} />
      {copy.translationNotice ? <RulesNotice text={copy.translationNotice} /> : null}
      <RulesToc language={language} label={copy.tocLabel} />
      <RulesBody language={language} hebrewBody={hebrewBody} />
      <LegalContactBox question={copy.contactQuestion} crossLinkHref="/privacy-policy" crossLinkLabel={copy.privacyLink} />
    </div>
  );
}
