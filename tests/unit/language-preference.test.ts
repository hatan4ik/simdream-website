import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, selectPreferredLanguage } from '@/lib/i18n/language-preference';
import type { Language } from '@/lib/i18n/translations';

interface Case {
  name: string;
  pathname: string | null;
  routed?: Language;
  saved: string | null;
  initial: Language;
  expected: Language;
}

/**
 * The order of authority the LanguageProvider applies after mount (#188 root cause 2):
 * visible URL locale, then the proxy-provided locale, then the saved choice, then the server's
 * language; an unsupported winner falls to the default.
 */
const CASES: Case[] = [
  { name: 'path locale beats a saved language (en over he)', pathname: '/en/blog', saved: 'he', initial: 'he', expected: 'en' },
  { name: 'path locale beats a saved language (ru over en)', pathname: '/ru/blog', saved: 'en', initial: 'he', expected: 'ru' },
  { name: 'path locale beats the server-provided language', pathname: '/fr/pro', saved: null, initial: 'de', expected: 'fr' },
  { name: 'path locale beats the proxy-routed language', pathname: '/es', saved: 'en', routed: 'ru', initial: 'he', expected: 'es' },
  { name: 'the Hebrew path locale beats a saved Arabic choice', pathname: '/he/blog', saved: 'ar', initial: 'ar', expected: 'he' },
  { name: 'no path locale: the routed language beats the saved one', pathname: '/blog', saved: 'en', routed: 'ru', initial: 'he', expected: 'ru' },
  { name: 'no path locale and nothing routed: the saved language beats the server one', pathname: '/blog', saved: 'fr', initial: 'he', expected: 'fr' },
  { name: 'nothing saved: the server-provided language is used', pathname: '/pro', saved: null, initial: 'de', expected: 'de' },
  { name: 'a nested /post/<lang>/ segment is not a path locale', pathname: '/post/en/slug', saved: 'ru', initial: 'he', expected: 'ru' },
  { name: 'an unsupported path prefix is ignored', pathname: '/pt/blog', saved: 'es', initial: 'he', expected: 'es' },
  { name: 'a missing pathname falls through to the saved language', pathname: null, saved: 'ar', initial: 'he', expected: 'ar' },
  // Pinned as it behaves today: an unsupported saved value still outranks the server language, then
  // resolves to the default.
  { name: 'an unsupported saved language resolves to the default', pathname: '/blog', saved: 'xx', initial: 'en', expected: DEFAULT_LANGUAGE },
  { name: 'an empty saved language resolves to the default', pathname: '/blog', saved: '', initial: 'en', expected: DEFAULT_LANGUAGE },
];

describe('selectPreferredLanguage (path locale priority)', () => {
  it.each(CASES)('$name', ({ pathname, routed, saved, initial, expected }) => {
    expect(selectPreferredLanguage({ pathname, routedLanguage: routed, saved, initialLanguage: initial })).toBe(expected);
  });

  it('never lets a saved language override a supported path locale, for every pair', () => {
    const codes: Language[] = ['en', 'he', 'ru', 'fr', 'ar', 'es', 'de'];
    for (const path of codes) {
      for (const saved of codes) {
        expect(
          selectPreferredLanguage({ pathname: `/${path}/blog`, saved, initialLanguage: saved })
        ).toBe(path);
      }
    }
  });
});
