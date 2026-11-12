import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { ConsentDialog } from '@/components/consent/ConsentDialog';
import { CONSENT_COPY } from '@/components/consent/consent-copy';
import { CONSENT_LINK_LABEL } from '@/components/consent/link-label';
import { CONSENT_CATEGORIES_IN_USE, parseCategoriesInUse } from '@/lib/consent';
import { LanguageProvider } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;

function render(language: Language, element: React.ReactElement): string {
  return renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: language, children: element }));
}

const banner = (language: Language, inUse?: Parameters<typeof ConsentBanner>[0]['inUse']) =>
  render(language, React.createElement(ConsentBanner, { inUse }));
const dialog = (language: Language, inUse?: Parameters<typeof ConsentDialog>[0]['inUse']) =>
  render(language, React.createElement(ConsentDialog, { inUse }));

/** React escapes these in markup (the French copy has apostrophes). */
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/** The class attribute of the button whose label is `label`. */
function buttonClass(html: string, label: string): string {
  const match = new RegExp(`<button[^>]*class="([^"]*)"[^>]*>${label}</button>`).exec(html);
  if (!match) throw new Error(`No button labelled "${label}" in: ${html.slice(0, 300)}`);
  return match[1];
}

describe('categories in use', () => {
  it('uses nothing optional in the shipped configuration', () => {
    expect(CONSENT_CATEGORIES_IN_USE).toEqual(['necessary']);
  });

  it('reads a comma-separated list, always keeps necessary, ignores unknown names', () => {
    expect(parseCategoriesInUse(undefined)).toEqual(['necessary']);
    expect(parseCategoriesInUse('')).toEqual(['necessary']);
    expect(parseCategoriesInUse('analytics')).toEqual(['necessary', 'analytics']);
    expect(parseCategoriesInUse(' marketing , analytics ,bogus')).toEqual(['necessary', 'analytics', 'marketing']);
  });
});

describe('consent copy', () => {
  it.each(LANGUAGES)('is complete in %s', (language) => {
    const copy = CONSENT_COPY[language];
    const strings = [
      copy.bannerLabel,
      copy.noticeBody,
      copy.choiceTitle,
      copy.choiceBody,
      copy.gotIt,
      copy.acceptAll,
      copy.rejectNonEssential,
      copy.customize,
      copy.privacyPolicy,
      copy.dialogTitle,
      copy.dialogIntroNotice,
      copy.dialogIntroChoice,
      copy.close,
      copy.save,
      copy.alwaysOn,
      copy.on,
      copy.off,
      copy.notUsed,
      copy.storedHeading,
      CONSENT_LINK_LABEL[language],
      ...Object.values(copy.categories).flatMap((category) => [category.title, category.description]),
      ...copy.storedItems.flatMap((item) => [item.title, item.description]),
    ];
    expect(strings.every((text) => text.trim().length > 0)).toBe(true);
    expect(copy.storedItems).toHaveLength(CONSENT_COPY.en.storedItems.length);
  });

  it.each(LANGUAGES)('keeps %s free of the wrong script', (language) => {
    const copy = JSON.stringify([CONSENT_COPY[language], CONSENT_LINK_LABEL[language]]);
    if (language !== 'he') expect(HEBREW.test(copy)).toBe(false);
    if (language !== 'ar') expect(ARABIC.test(copy)).toBe(false);
  });

  it('says plainly that no advertising or analytics cookies are used, in every language', () => {
    // The truthful statement the informational notice rests on; it must follow CONSENT_CATEGORIES_IN_USE.
    expect(CONSENT_CATEGORIES_IN_USE.every((category) => category === 'necessary')).toBe(true);
    for (const language of LANGUAGES) expect(CONSENT_COPY[language].noticeBody.length).toBeGreaterThan(80);
  });
});

describe('informational notice (nothing optional in use)', () => {
  it.each(LANGUAGES)('renders one "Got it", a settings link and no toggles in %s', (language) => {
    const html = banner(language);
    const copy = CONSENT_COPY[language];
    expect(html).toContain('data-consent-mode="notice"');
    expect(html).toContain(`aria-label="${escapeHtml(copy.bannerLabel)}"`);
    expect(html).toContain(escapeHtml(copy.noticeBody));
    expect(html).toContain(`>${copy.gotIt}</button>`);
    expect(html).toContain(`>${CONSENT_LINK_LABEL[language]}</button>`);
    expect(html).toContain('href="/privacy-policy"');
    expect(html).not.toContain(copy.acceptAll);
    expect(html).not.toContain('role="switch"');
  });

  it('lists what is stored, with no switch, and marks analytics and marketing as not used', () => {
    const html = dialog('en');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="consent-dialog-title"');
    expect(html).not.toContain('role="switch"');
    for (const item of CONSENT_COPY.en.storedItems) expect(html).toContain(item.title);
    expect(html.match(/Not used on this site/g)).toHaveLength(3);
    expect(html).toContain('Always on');
  });
});

describe('choice banner (an optional category in use)', () => {
  it.each(LANGUAGES)('gives "Accept all" and "Reject non-essential" the same prominence in %s', (language) => {
    const html = banner(language, ['necessary', 'analytics']);
    const copy = CONSENT_COPY[language];
    expect(html).toContain('data-consent-mode="choice"');
    expect(html).toContain(escapeHtml(copy.choiceBody));
    expect(buttonClass(html, copy.acceptAll)).toBe(buttonClass(html, copy.rejectNonEssential));
    expect(html).toContain(`>${copy.customize}</button>`);
    expect(html).not.toContain(`>${copy.gotIt}</button>`);
  });

  it('offers a toggle only for the category in use, none pre-checked, and lists the rest as not used', () => {
    const html = dialog('en', ['necessary', 'analytics']);
    expect(html.match(/role="switch"/g)).toHaveLength(1);
    const switches = html.match(/<input[^>]*role="switch"[^>]*>/g) ?? [];
    expect(switches).toHaveLength(1);
    expect(switches.some((tag) => / checked=""/.test(tag))).toBe(false);
    expect(html.match(/Not used on this site/g)).toHaveLength(2);
    expect(buttonClass(html, 'Accept all')).toBe(buttonClass(html, 'Reject non-essential'));
  });
});
