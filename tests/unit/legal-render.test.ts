import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LegalContactBox } from '@/components/legal/shared/LegalContactBox';
import { PrivacyHeader } from '@/components/legal/privacy/PrivacyHeader';
import { PrivacySections } from '@/components/legal/privacy/PrivacySections';
import { RulesHeader } from '@/components/legal/rules/RulesHeader';
import { RulesHighlights } from '@/components/legal/rules/RulesHighlights';
import { RulesNotice } from '@/components/legal/rules/RulesNotice';
import { RulesSections } from '@/components/legal/rules/RulesSections';
import { RulesToc } from '@/components/legal/rules/RulesToc';
import { RULES_SECTIONS } from '@/lib/legal/anchors';
import { PRIVACY_PAGE_COPY, RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import { rulesCoreLanguageFor } from '@/lib/legal/loaders';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import type { LegalLanguage } from '@/lib/legal/types';
import { ARABIC, FORBIDDEN_SCRIPTS, HEBREW, LANGUAGES, PRIVACY, RULES_CORE, RULES_EXTRA } from './_support/legal-fixtures';

const rulesHtml = (language: LegalLanguage) => {
  const coreLanguage = rulesCoreLanguageFor(language);
  return renderToStaticMarkup(
    React.createElement(RulesSections, { language, core: RULES_CORE[coreLanguage], coreLanguage, extra: RULES_EXTRA[language] })
  );
};
const privacyHtml = (language: LegalLanguage) =>
  renderToStaticMarkup(React.createElement(PrivacySections, { language, body: PRIVACY[language], tocLabel: PRIVACY_PAGE_COPY[language].tocLabel }));
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ');

describe('rules page rendering', () => {
  it.each(LANGUAGES)('renders all sixteen sections with their anchors in %s', (language) => {
    const html = rulesHtml(language);
    for (const { id } of RULES_SECTIONS) expect(html).toContain(`id="${id}"`);
    // Clause deep links: new clauses and the original ones that were dropped before.
    for (const clauseId of ['clause-3-2', 'clause-4-6', 'clause-6-4', 'clause-7-8', 'clause-9-3', 'clause-13-1', 'clause-14-1', 'clause-15-2']) {
      expect(html).toContain(`id="${clauseId}"`);
    }
  });

  it.each(LANGUAGES)('renders the new clauses 13 to 15 in the page language %s and the refund form link', (language) => {
    const html = rulesHtml(language);
    expect(html).toContain('href="/refund"');
    expect(html).toContain(RULES_EXTRA[language].sections[0].clauses[0].action!.label);
    expect(html).toContain('data-button-variant="outline"');
    // Clause 14.1 text is present in the page language.
    const grant = RULES_EXTRA[language].sections[1].clauses[0].text;
    expect(html).toContain(grant.slice(0, 40).replace(/&/g, '&amp;'));
  });

  it('shows Hebrew text only for Hebrew, and the English body (marked lang=en dir=ltr) for ru, fr, ar and es', () => {
    expect(rulesHtml('he')).not.toContain('lang="en"');
    for (const language of ['ru', 'fr', 'ar', 'es'] as const) {
      const html = rulesHtml(language);
      // Core sections (1 to 12 and the appendix) carry the English language and direction.
      expect(html).toContain('lang="en" dir="ltr"');
      // 1.1 of the English body is present.
      expect(html).toContain('Simulation Systems (Israel) Sim Dream LTD');
    }
    expect(rulesHtml('en')).not.toContain('lang="en"');
  });

  it.each(LANGUAGES)('keeps %s pages free of foreign-script letters in the rendered text', (language) => {
    const text = textOf(rulesHtml(language) + renderToStaticMarkup(React.createElement(RulesToc, { language, label: 'x' })));
    for (const { pattern, name } of FORBIDDEN_SCRIPTS[language]) {
      expect({ language, name, found: pattern.test(text) }).toEqual({ language, name, found: false });
    }
  });

  it('renders the table of contents with an anchor link for every section, titled in the page language', () => {
    for (const language of LANGUAGES) {
      const html = renderToStaticMarkup(React.createElement(RulesToc, { language, label: RULES_PAGE_COPY[language].tocLabel }));
      for (const { id } of RULES_SECTIONS) expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`aria-label="${RULES_PAGE_COPY[language].tocLabel}"`);
    }
    const hebrewToc = renderToStaticMarkup(React.createElement(RulesToc, { language: 'he', label: 'x' }));
    expect(hebrewToc).toMatch(HEBREW);
    const arabicToc = renderToStaticMarkup(React.createElement(RulesToc, { language: 'ar', label: 'x' }));
    expect(arabicToc).toMatch(ARABIC);
    expect(arabicToc).not.toMatch(HEBREW);
  });

  it('puts clause numbers in left-to-right spans so RTL pages keep them readable', () => {
    expect(rulesHtml('ar')).toContain('<span dir="ltr" class="inline-block font-mono font-semibold text-sky-400">14.1</span>');
  });

  it.each(LANGUAGES)('shows the document version in the %s header', (language) => {
    const html = renderToStaticMarkup(React.createElement(RulesHeader, { copy: RULES_PAGE_COPY[language] }));
    expect(html).toContain(`data-legal-version="${LEGAL_DOCUMENT_VERSION}"`);
    expect(html).toContain(RULES_PAGE_COPY[language].title.replace(/&/g, '&amp;'));
    expect(html).toContain(RULES_PAGE_COPY[language].versionLabel);
  });

  it.each(LANGUAGES)('keeps the %s header in the script of its language (the Hebrew company name only on the Hebrew page)', (language) => {
    const text = textOf(renderToStaticMarkup(React.createElement(RulesHeader, { copy: RULES_PAGE_COPY[language] })));
    for (const { pattern, name } of FORBIDDEN_SCRIPTS[language]) {
      expect({ language, name, found: pattern.test(text) }).toEqual({ language, name, found: false });
    }
    expect(HEBREW.test(text)).toBe(language === 'he');
    expect(text).toContain('516651031');
  });

  it('keeps the English page title that the navigation tests expect', () => {
    expect(RULES_PAGE_COPY.en.title).toMatch(/^Facility Rules, Terms & Conditions/);
    expect(PRIVACY_PAGE_COPY.en.title).toMatch(/^Privacy & Cookie Policy/);
  });

  it('shows the translation notice only for the four languages without a full rules translation', () => {
    expect(RULES_PAGE_COPY.he.translationNotice).toBeNull();
    expect(RULES_PAGE_COPY.en.translationNotice).toBeNull();
    for (const language of ['ru', 'fr', 'ar', 'es'] as const) {
      const notice = RULES_PAGE_COPY[language].translationNotice;
      expect(notice).toBeTruthy();
      expect(renderToStaticMarkup(React.createElement(RulesNotice, { text: notice! }))).toContain('role="note"');
    }
  });

  it.each(LANGUAGES)('renders the highlight cards and the contact box in %s', (language) => {
    const cards = renderToStaticMarkup(React.createElement(RulesHighlights, { copy: RULES_PAGE_COPY[language] }));
    expect(cards).toContain(RULES_PAGE_COPY[language].ageTitle);
    const contact = renderToStaticMarkup(
      React.createElement(LegalContactBox, { question: 'q', crossLinkHref: '/privacy-policy', crossLinkLabel: RULES_PAGE_COPY[language].privacyLink })
    );
    expect(contact).toContain('href="/privacy-policy"');
    expect(contact).toContain('desk@simdream.co.il');
  });
});

describe('privacy policy rendering', () => {
  it.each(LANGUAGES)('renders every section, its anchor and the table of contents in %s', (language) => {
    const html = privacyHtml(language);
    for (const section of PRIVACY[language].sections) {
      expect(html).toContain(`id="${section.id}"`);
      expect(html).toContain(`href="#${section.id}"`);
      expect(html).toContain(`${section.number}. ${section.title.replace(/&/g, '&amp;')}`);
    }
  });

  it.each(LANGUAGES)('renders the additions (checkout data, photos, cookies, version) in %s', (language) => {
    const html = privacyHtml(language);
    for (const id of ['checkout-data', 'photos-and-video', 'cookies', 'version']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('desk@simdream.co.il');
  });

  it.each(LANGUAGES)('renders %s without foreign-script letters', (language) => {
    const text = textOf(privacyHtml(language));
    for (const { pattern, name } of FORBIDDEN_SCRIPTS[language]) {
      expect({ language, name, found: pattern.test(text) }).toEqual({ language, name, found: false });
    }
  });

  it.each(LANGUAGES)('shows the document version in the %s header, in the script of its language', (language) => {
    const html = renderToStaticMarkup(React.createElement(PrivacyHeader, { copy: PRIVACY_PAGE_COPY[language] }));
    expect(html).toContain(`data-legal-version="${LEGAL_DOCUMENT_VERSION}"`);
    for (const { pattern, name } of FORBIDDEN_SCRIPTS[language]) {
      expect({ language, name, found: pattern.test(textOf(html)) }).toEqual({ language, name, found: false });
    }
  });
});
