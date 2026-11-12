import RULES_CORE_EN from '@/lib/legal/content/rules-core.en';
import RULES_CORE_HE from '@/lib/legal/content/rules-core.he';
import RULES_EXTRA_AR from '@/lib/legal/content/rules-extra.ar';
import RULES_EXTRA_EN from '@/lib/legal/content/rules-extra.en';
import RULES_EXTRA_ES from '@/lib/legal/content/rules-extra.es';
import RULES_EXTRA_FR from '@/lib/legal/content/rules-extra.fr';
import RULES_EXTRA_HE from '@/lib/legal/content/rules-extra.he';
import RULES_EXTRA_RU from '@/lib/legal/content/rules-extra.ru';
import PRIVACY_AR from '@/lib/legal/content/privacy.ar';
import PRIVACY_EN from '@/lib/legal/content/privacy.en';
import PRIVACY_ES from '@/lib/legal/content/privacy.es';
import PRIVACY_FR from '@/lib/legal/content/privacy.fr';
import PRIVACY_HE from '@/lib/legal/content/privacy.he';
import PRIVACY_RU from '@/lib/legal/content/privacy.ru';
import type { LegalBody, LegalClause, LegalLanguage, PrivacyBody, RulesCoreLanguage } from '@/lib/legal/types';

export const LANGUAGES: readonly LegalLanguage[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];

export const RULES_CORE: Record<RulesCoreLanguage, LegalBody> = { he: RULES_CORE_HE, en: RULES_CORE_EN };

export const RULES_EXTRA: Record<LegalLanguage, LegalBody> = {
  he: RULES_EXTRA_HE,
  en: RULES_EXTRA_EN,
  ru: RULES_EXTRA_RU,
  fr: RULES_EXTRA_FR,
  ar: RULES_EXTRA_AR,
  es: RULES_EXTRA_ES,
};

export const PRIVACY: Record<LegalLanguage, PrivacyBody> = {
  he: PRIVACY_HE,
  en: PRIVACY_EN,
  ru: PRIVACY_RU,
  fr: PRIVACY_FR,
  ar: PRIVACY_AR,
  es: PRIVACY_ES,
};

export const HEBREW = /[֐-׿]/;
export const ARABIC = /[؀-ۿ]/;

/** Scripts that must never appear in each language's copy (AGENTS.md section 5). */
export const FORBIDDEN_SCRIPTS: Record<LegalLanguage, Array<{ name: string; pattern: RegExp }>> = {
  he: [{ name: 'Arabic', pattern: ARABIC }],
  ar: [{ name: 'Hebrew', pattern: HEBREW }],
  en: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
  ru: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
  fr: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
  es: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
};

/** Every string leaf of a value, with its path. */
export function stringLeaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((child, index) => stringLeaves(child, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Paths of every leaf (strings, booleans) as a sorted list, to compare the key structure of two languages. */
export function keyPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((child, index) => keyPaths(child, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, child]) => keyPaths(child, path ? `${path}.${key}` : key));
  }
  return [path];
}

export function allClauses(body: LegalBody | PrivacyBody): LegalClause[] {
  return body.sections.flatMap((section) => [...section.clauses]);
}
