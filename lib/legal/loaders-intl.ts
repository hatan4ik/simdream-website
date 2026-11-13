import { type ModuleLoader, mediaReleaseSectionOf, memoLoad } from './loaders';
import type { LegalBody, LegalIntlLanguage, LegalSectionBody, PrivacyBody } from './types';

/**
 * Loaders for the long legal text in English, Russian, French, Arabic and Spanish. CLIENT-ONLY:
 * the server renders Hebrew, so these bodies must stay out of the Wix worker. Only modules that
 * are themselves reached through `next/dynamic(() => import(...), { ssr: false })` may import this
 * file (`RulesBodyIntl`, `PrivacyBodyIntl`, `MediaReleaseLoaderIntl`); the Hebrew loaders are in
 * `./loaders`. `tests/unit/worker-bundle-rules.test.ts` fails when a server-reachable file imports it.
 *
 * Per-language modules and memoisation behave exactly as in `./loaders`.
 */

const RULES_EXTRA_LOADERS: Record<LegalIntlLanguage, ModuleLoader<LegalBody>> = {
  en: () => import('./content/rules-extra.en'),
  ru: () => import('./content/rules-extra.ru'),
  fr: () => import('./content/rules-extra.fr'),
  ar: () => import('./content/rules-extra.ar'),
  es: () => import('./content/rules-extra.es'),
  de: () => import('./content/rules-extra.de'),
};

const PRIVACY_LOADERS: Record<LegalIntlLanguage, ModuleLoader<PrivacyBody>> = {
  en: () => import('./content/privacy.en'),
  ru: () => import('./content/privacy.ru'),
  fr: () => import('./content/privacy.fr'),
  ar: () => import('./content/privacy.ar'),
  es: () => import('./content/privacy.es'),
  de: () => import('./content/privacy.de'),
};

/** Rules clauses 1 to 12 and the privacy appendix: the one long body every non-Hebrew page shows is the English original. */
export function loadRulesCoreIntl(): Promise<LegalBody> {
  return memoLoad('rules-core:en', () => import('./content/rules-core.en'));
}

/** Rules clauses 13 to 15 in the page language. */
export function loadRulesExtraIntl(language: LegalIntlLanguage): Promise<LegalBody> {
  return memoLoad(`rules-extra:${language}`, RULES_EXTRA_LOADERS[language]);
}

export function loadPrivacyIntl(language: LegalIntlLanguage): Promise<PrivacyBody> {
  return memoLoad(`privacy:${language}`, PRIVACY_LOADERS[language]);
}

/** Clause 14 in full, for the checkout's expandable "read the full text". Loads only the small extras module. */
export async function loadMediaReleaseSectionIntl(language: LegalIntlLanguage): Promise<LegalSectionBody> {
  return mediaReleaseSectionOf(await loadRulesExtraIntl(language), language);
}
