import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NOT_FOUND_COPY, NotFoundView, notFoundCopyFor } from '@/components/not-found';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { translations, type Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;

function render(language: Language): string {
  return renderToStaticMarkup(
    React.createElement(LanguageProvider, { initialLanguage: language, children: React.createElement(NotFoundView) })
  );
}

/** React escapes these in markup (the French copy has apostrophes). */
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/** The inner text of the first element matching `tag` (attributes ignored). */
function textOf(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g'))].map((match) => match[1]);
}

/** The `href` of the link whose visible label is `label`. */
function hrefOfLink(html: string, label: string): string | undefined {
  const match = new RegExp(`<a[^>]*href="([^"]*)"[^>]*>${escapeHtml(label)}</a>`).exec(html);
  return match?.[1];
}

describe('the not-found page copy', () => {
  it.each(LANGUAGES)('is written in %s with no empty text', (language) => {
    const copy = notFoundCopyFor(language);
    expect(copy.title.trim()).not.toBe('');
    expect(copy.intro.trim()).not.toBe('');
    expect(copy.home.trim()).not.toBe('');
  });

  it.each(LANGUAGES.filter((language) => language !== 'en'))('is translated for %s, not the English fallback', (language) => {
    const copy = notFoundCopyFor(language);
    expect(copy.title).not.toBe(NOT_FOUND_COPY.en.title);
    expect(copy.intro).not.toBe(NOT_FOUND_COPY.en.intro);
    expect(copy.home).not.toBe(NOT_FOUND_COPY.en.home);
  });

  it.each(LANGUAGES)('keeps %s free of the other right-to-left script (AGENTS.md section 5)', (language) => {
    const text = Object.values(notFoundCopyFor(language)).join(' ');
    if (language !== 'he') expect(text).not.toMatch(HEBREW);
    if (language !== 'ar') expect(text).not.toMatch(ARABIC);
    // And each right-to-left language really is written in its own script.
    if (language === 'he') expect(text).toMatch(HEBREW);
    if (language === 'ar') expect(text).toMatch(ARABIC);
  });

  it('falls back to English for a language it does not know', () => {
    expect(notFoundCopyFor('xx' as Language)).toBe(NOT_FOUND_COPY.en);
  });
});

describe('the not-found page', () => {
  it.each(LANGUAGES)('renders one heading that explains the problem in %s', (language) => {
    const html = render(language);
    expect(textOf(html, 'h1')).toEqual([escapeHtml(notFoundCopyFor(language).title)]);
    expect(html).toContain(escapeHtml(notFoundCopyFor(language).intro));
  });

  it.each(LANGUAGES)('shows the 404 code left-to-right and hides it from screen readers in %s', (language) => {
    const html = render(language);
    expect(html).toMatch(/<p[^>]*dir="ltr"[^>]*>404<\/p>/);
    expect(html).toMatch(/<p[^>]*aria-hidden="true"[^>]*>404<\/p>/);
  });

  it.each(LANGUAGES)('offers the way back to booking, home and contact in %s, with the header labels', (language) => {
    const html = render(language);
    const copy = notFoundCopyFor(language);
    // Hebrew owns the root URL space; every other language keeps its Wix prefix (/ru, /ru/book, ...).
    const prefix = language === 'he' ? '' : `/${language}`;
    expect(hrefOfLink(html, translations[language].nav.bookFlight)).toBe(`${prefix}/book`);
    expect(hrefOfLink(html, copy.home)).toBe(prefix || '/');
    expect(hrefOfLink(html, translations[language].nav.contact)).toBe(`${prefix}/contact`);
  });

  it.each(LANGUAGES)('carries the hook the end-to-end and security suites look for in %s', (language) => {
    expect(render(language)).toMatch(/<section[^>]*data-not-found[^>]*>/);
  });

  it.each(LANGUAGES)('uses the shared action-button contract for every link in %s', (language) => {
    const html = render(language);
    const buttons = [...html.matchAll(/<a[^>]*data-ui-control="button"[^>]*data-button-variant="(\w+)"/g)].map((match) => match[1]);
    expect(buttons).toEqual(['primary', 'outline', 'ghost']);
  });
});
