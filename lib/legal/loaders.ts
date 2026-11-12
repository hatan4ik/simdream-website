import type { LegalBody, LegalLanguage, LegalSectionBody, PrivacyBody, RulesCoreLanguage } from './types';

/**
 * Loaders for the long legal text, Hebrew only. The server renders the Hebrew default page and
 * nothing else (`app/layout.tsx`; a visitor's saved language is restored in the browser), so this
 * module reaches only the Hebrew bodies. The other five languages are in `./loaders-intl`, which
 * only client-only modules import (reached through `next/dynamic(..., { ssr: false })`), so the Wix
 * worker never bundles them. A server-reachable file must not import `./loaders-intl` or a
 * non-Hebrew `./content/*` module (`tests/unit/worker-bundle-rules.test.ts`).
 *
 * Each document and language is its own module, reached only through a dynamic `import()`. Each
 * loader is memoised: a promise is created once per document and language, which also lets React's
 * `use()` read a stable thenable. A failed load is forgotten so the next call retries.
 */

export type ModuleLoader<T> = () => Promise<{ default: T }>;

const memo = new Map<string, Promise<unknown>>();

/** Runs `loader` once per key and shares the promise; a rejected load is dropped so it can be retried. */
export function memoLoad<T>(key: string, loader: ModuleLoader<T>): Promise<T> {
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

/** Clause 14 (media release and waiver) out of a language's rules extras. */
export function mediaReleaseSectionOf(extra: LegalBody, language: LegalLanguage): LegalSectionBody {
  const section = extra.sections.find((candidate) => candidate.id === 'media-release');
  if (!section) throw new Error(`Media release clause missing for language ${language}`);
  return section;
}

/** Rules clauses 1 to 12 and the privacy appendix, in Hebrew. */
export function loadRulesCoreHe(): Promise<LegalBody> {
  return memoLoad('rules-core:he', () => import('./content/rules-core.he'));
}

/** Rules clauses 13 to 15 (refunds, media release and waiver, checkout consent record), in Hebrew. */
export function loadRulesExtraHe(): Promise<LegalBody> {
  return memoLoad('rules-extra:he', () => import('./content/rules-extra.he'));
}

export function loadPrivacyHe(): Promise<PrivacyBody> {
  return memoLoad('privacy:he', () => import('./content/privacy.he'));
}

/** Clause 14 in full, for the checkout's expandable "read the full text". Loads only the small extras module. */
export async function loadMediaReleaseSectionHe(): Promise<LegalSectionBody> {
  return mediaReleaseSectionOf(await loadRulesExtraHe(), 'he');
}
