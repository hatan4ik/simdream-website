import type { Language } from './translations';

/** Israel-first on a visitor's first arrival; an explicit saved choice wins later. */
export const DEFAULT_LANGUAGE: Language = 'he';

const supportedLanguageCodes = new Set<Language>(['he', 'en', 'ru', 'fr', 'ar']);

export function isSupportedLanguage(value: string | null | undefined): value is Language {
  return value !== null && value !== undefined && supportedLanguageCodes.has(value as Language);
}

export function resolveLanguagePreference(value: string | null | undefined): Language {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageDirection(language: Language): 'ltr' | 'rtl' {
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}
