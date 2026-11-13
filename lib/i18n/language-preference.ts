import type { Language } from './translations';

/** Israel-first on a visitor's first arrival; an explicit saved choice wins later. */
export const DEFAULT_LANGUAGE: Language = 'he';

/**
 * The six interface languages in language-selector order, kept apart from `translations.ts` so a
 * server module that only needs the codes (the JSON-LD graph in the root layout) does not pull the
 * 380 KB translation tables into the Wix worker a second time. `tests/unit/language-codes.test.ts`
 * pins this list to `LANGUAGES`.
 */
export const LANGUAGE_CODES: readonly Language[] = ['en', 'he', 'ru', 'fr', 'ar', 'es', 'de'];

const supportedLanguageCodes = new Set<Language>(LANGUAGE_CODES);

export function isSupportedLanguage(value: string | null | undefined): value is Language {
  return value !== null && value !== undefined && supportedLanguageCodes.has(value as Language);
}

export function resolveLanguagePreference(value: string | null | undefined): Language {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageDirection(language: Language): 'ltr' | 'rtl' {
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}

const PATH_LOCALE_RE = /^\/(he|en|ru|fr|ar|es|de)(?:\/|$)/;

/** Extracts a leading Wix Multilingual locale segment (`/en/...`) when present. */
export function extractPathLocale(pathname: string | null | undefined): Language | null {
  if (!pathname) return null;
  const match = PATH_LOCALE_RE.exec(pathname);
  const candidate = match?.[1];
  return isSupportedLanguage(candidate) ? candidate : null;
}
