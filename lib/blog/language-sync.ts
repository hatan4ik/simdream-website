/**
 * Decides what a blog article page does about the site language (used by `BlogPostLanguageSync`).
 *
 * Two jobs, in this order:
 * 1. The article wins on arrival: a visitor who opens an article in another language than the saved site
 *    language (a direct link, a search result) gets the site language switched to the article's. No navigation.
 * 2. After that, a language the visitor picks in the navbar menu sends them to the translated article.
 *
 * The page used to run these as two effects. In the commit that corrected the language (job 1), the second
 * effect still saw the old saved language, took it for a menu choice and pushed the translation's path; the
 * translation page did the same in reverse, so a Hebrew article with English saved looped between the two
 * (35 navigations in 3 s, 2026-11-24). Here the "correction requested, not landed yet" state is explicit, so
 * a stale language is never mistaken for a choice.
 */

export interface BlogLanguageSyncState {
  /** The language this page last agreed with; null before the first resolved render. */
  settled: string | null;
  /** A language this page asked the site to switch to and has not yet seen arrive. */
  expected: string | null;
}

export type BlogLanguageSyncStep = { state: BlogLanguageSyncState } & (
  | { action: 'none' }
  | { action: 'set-language'; language: string }
  | { action: 'navigate'; language: string }
);

export interface BlogLanguageSyncInput {
  /** The language the article itself is written in. */
  articleLanguage: string;
  /** The current site language. */
  language: string;
  supported: (language: string) => boolean;
}

export function initialBlogLanguageSyncState(): BlogLanguageSyncState {
  return { settled: null, expected: null };
}

export function nextBlogLanguageStep(input: BlogLanguageSyncInput, state: BlogLanguageSyncState): BlogLanguageSyncStep {
  const { articleLanguage, language, supported } = input;

  // A correction is in flight: wait for the site language to become what was asked for.
  if (state.expected !== null) {
    if (language === state.expected) return { action: 'none', state: { settled: language, expected: null } };
    return { action: 'none', state };
  }

  // First resolved render: the article wins over a different saved language.
  if (state.settled === null) {
    if (language === articleLanguage || !supported(articleLanguage)) {
      return { action: 'none', state: { settled: language, expected: null } };
    }
    return {
      action: 'set-language',
      language: articleLanguage,
      state: { settled: articleLanguage, expected: articleLanguage },
    };
  }

  // Settled: a later difference is a language the visitor chose.
  if (language === state.settled) return { action: 'none', state };
  if (language === articleLanguage) return { action: 'none', state: { settled: language, expected: null } };
  return { action: 'navigate', language, state: { settled: language, expected: null } };
}
