import type { Language } from './translations';

/** Wix owns Hebrew at the root URL; its supported secondary locales use path prefixes. */
export const PRIMARY_WIX_LANGUAGE: Language = 'he';
export const SECONDARY_WIX_LANGUAGES = ['en', 'ru', 'fr', 'ar', 'es'] as const satisfies readonly Language[];

export function isSupportedLanguage(value: string | null | undefined): value is Language {
  return value === 'he' || SECONDARY_WIX_LANGUAGES.some((language) => language === value);
}

export function isSecondaryWixLanguage(value: string | null | undefined): value is (typeof SECONDARY_WIX_LANGUAGES)[number] {
  return SECONDARY_WIX_LANGUAGES.some((language) => language === value);
}

/** Returns only a supported non-primary locale prefix. Hebrew deliberately remains `/`. */
export function languageFromLocalePathname(pathname: string): Language | null {
  const [, candidate] = pathname.split('/');
  return isSecondaryWixLanguage(candidate) ? candidate : null;
}

/** Removes one supported Wix secondary-locale prefix, retaining the route's query/hash elsewhere. */
export function stripLocalePrefix(pathname: string): string {
  const language = languageFromLocalePathname(pathname);
  if (!language) return pathname || '/';
  const remainder = pathname.slice(language.length + 1);
  return remainder ? (remainder.startsWith('/') ? remainder : `/${remainder}`) : '/';
}

/**
 * Builds the canonical Wix Multilingual URL for an internal site destination.
 * External, relative and in-page links are deliberately unchanged.
 */
export function localizeInternalHref(href: string, language: Language): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;

  const suffixIndex = href.search(/[?#]/);
  const pathname = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : href.slice(suffixIndex);
  const barePathname = stripLocalePrefix(pathname || '/');

  if (language === PRIMARY_WIX_LANGUAGE) return `${barePathname}${suffix}`;
  return `/${language}${barePathname === '/' ? '' : barePathname}${suffix}`;
}
