import type { LegalBody, LegalLanguage, LegalSectionBody, PrivacyBody, RulesCoreLanguage } from './types';

/**
 * Per-language loaders for the long legal text. Every document and language is its own module,
 * reached only through a dynamic `import()`, so a visitor (or the checkout) downloads the one
 * language it needs and never the other five.
 *
 * Each loader is memoised: a promise is created once per document and language, which also lets
 * React's `use()` read a stable thenable. A failed load is forgotten so the next call retries.
 */

type ModuleLoader<T> = () => Promise<{ default: T }>;

const RULES_CORE_LOADERS: Record<RulesCoreLanguage, ModuleLoader<LegalBody>> = {
  he: () => import('./content/rules-core.he'),
  en: () => import('./content/rules-core.en'),
};

const RULES_EXTRA_LOADERS: Record<LegalLanguage, ModuleLoader<LegalBody>> = {
  he: () => import('./content/rules-extra.he'),
  en: () => import('./content/rules-extra.en'),
  ru: () => import('./content/rules-extra.ru'),
  fr: () => import('./content/rules-extra.fr'),
  ar: () => import('./content/rules-extra.ar'),
  es: () => import('./content/rules-extra.es'),
};

const PRIVACY_LOADERS: Record<LegalLanguage, ModuleLoader<PrivacyBody>> = {
  he: () => import('./content/privacy.he'),
  en: () => import('./content/privacy.en'),
  ru: () => import('./content/privacy.ru'),
  fr: () => import('./content/privacy.fr'),
  ar: () => import('./content/privacy.ar'),
  es: () => import('./content/privacy.es'),
};

const memo = new Map<string, Promise<unknown>>();

function load<T>(key: string, loader: ModuleLoader<T>): Promise<T> {
  const cached = memo.get(key);
  if (cached) return cached as Promise<T>;
  const promise = loader().then(
    (module) => module.default,
    (error: unknown) => {
      memo.delete(key);
      throw error;
    }
  );
  memo.set(key, promise);
  return promise;
}

/** The language of the long rules body shown for a page language: Hebrew for Hebrew, English for all others. */
export function rulesCoreLanguageFor(language: LegalLanguage): RulesCoreLanguage {
  return language === 'he' ? 'he' : 'en';
}

/** Rules clauses 1 to 12 and the privacy appendix. */
export function loadRulesCore(language: RulesCoreLanguage): Promise<LegalBody> {
  return load(`rules-core:${language}`, RULES_CORE_LOADERS[language]);
}

/** Rules clauses 13 to 15 (refunds, media release and waiver, checkout consent record). */
export function loadRulesExtra(language: LegalLanguage): Promise<LegalBody> {
  return load(`rules-extra:${language}`, RULES_EXTRA_LOADERS[language]);
}

export function loadPrivacyPolicy(language: LegalLanguage): Promise<PrivacyBody> {
  return load(`privacy:${language}`, PRIVACY_LOADERS[language]);
}

/** Clause 14 in full, for the checkout's expandable "read the full text". Loads only the small extras module. */
export async function loadMediaReleaseSection(language: LegalLanguage): Promise<LegalSectionBody> {
  const extra = await loadRulesExtra(language);
  const section = extra.sections.find((candidate) => candidate.id === 'media-release');
  if (!section) throw new Error(`Media release clause missing for language ${language}`);
  return section;
}
