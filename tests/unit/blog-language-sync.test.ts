import { describe, expect, it } from 'vitest';
import {
  initialBlogLanguageSyncState,
  nextBlogLanguageStep,
  type BlogLanguageSyncState,
} from '@/lib/blog/language-sync';

// Regression for the 2026-11-24 finding: a visitor whose saved site language differs from the language of the
// article they open (a direct link, a search result) was bounced between the article and its translation
// forever (35 navigations in 3 s, history.length 13 to 50 in 4 s). The page's effect 2 saw the stale saved
// language in the same commit in which effect 1 corrected it, took that for a language-menu toggle and pushed
// the sibling path; the sibling page did the same in reverse.

const SIBLINGS: Record<string, string> = { he: '/post/slug', en: '/post/en/slug', ru: '/post/ru/slug' };
const supported = (language: string) => language in SIBLINGS;

/**
 * Plays a visit the way React does: one effect run per render, a `setLanguage` request lands in the next render,
 * a navigation mounts the sibling page (fresh state, the site language carries over).
 */
function visit(options: { saved: string; article: string; toggles?: string[] }) {
  let article = options.article;
  let language = options.saved;
  let state: BlogLanguageSyncState = initialBlogLanguageSyncState();
  const navigations: string[] = [];
  const toggles = [...(options.toggles ?? [])];

  for (let render = 0; render < 40; render += 1) {
    const step = nextBlogLanguageStep({ articleLanguage: article, language, supported }, state);
    state = step.state;
    if (step.action === 'set-language') {
      language = step.language;
      continue;
    }
    if (step.action === 'navigate') {
      navigations.push(step.language);
      article = step.language;
      state = initialBlogLanguageSyncState();
      continue;
    }
    const toggle = toggles.shift();
    if (toggle === undefined) break;
    language = toggle;
  }
  return { navigations, language, article };
}

describe('blog article language sync', () => {
  it('never navigates when the saved language already matches the article', () => {
    expect(visit({ saved: 'he', article: 'he' })).toEqual({ navigations: [], language: 'he', article: 'he' });
    expect(visit({ saved: 'en', article: 'en' })).toEqual({ navigations: [], language: 'en', article: 'en' });
  });

  it('lets the article win over a different saved language, without navigating', () => {
    // The loop: saved English, Hebrew article.
    expect(visit({ saved: 'en', article: 'he' })).toEqual({ navigations: [], language: 'he', article: 'he' });
    expect(visit({ saved: 'he', article: 'en' })).toEqual({ navigations: [], language: 'en', article: 'en' });
    expect(visit({ saved: 'ru', article: 'he' })).toEqual({ navigations: [], language: 'he', article: 'he' });
  });

  it('navigates once to the translation when the visitor picks another language afterwards', () => {
    expect(visit({ saved: 'en', article: 'he', toggles: ['en'] })).toEqual({ navigations: ['en'], language: 'en', article: 'en' });
    expect(visit({ saved: 'he', article: 'he', toggles: ['ru'] })).toEqual({ navigations: ['ru'], language: 'ru', article: 'ru' });
  });

  it('follows two deliberate switches in a row, one navigation each', () => {
    expect(visit({ saved: 'he', article: 'he', toggles: ['en', 'ru'] }).navigations).toEqual(['en', 'ru']);
  });

  it('does nothing when the visitor switches back to the language the article is in', () => {
    expect(visit({ saved: 'he', article: 'he', toggles: ['he'] }).navigations).toEqual([]);
  });

  it('waits while a requested language change has not landed yet (the stale render)', () => {
    const first = nextBlogLanguageStep({ articleLanguage: 'he', language: 'en', supported }, initialBlogLanguageSyncState());
    expect(first).toMatchObject({ action: 'set-language', language: 'he' });
    // Same commit, the language state is still the stale 'en': this must not look like a toggle.
    const stale = nextBlogLanguageStep({ articleLanguage: 'he', language: 'en', supported }, first.state);
    expect(stale.action).toBe('none');
    const landed = nextBlogLanguageStep({ articleLanguage: 'he', language: 'he', supported }, stale.state);
    expect(landed.action).toBe('none');
  });

  it('leaves an article in an unsupported language alone', () => {
    expect(
      nextBlogLanguageStep({ articleLanguage: 'xx', language: 'en', supported }, initialBlogLanguageSyncState())
    ).toMatchObject({ action: 'none' });
  });

  it('is bounded: no starting point produces more than one navigation without a toggle', () => {
    for (const saved of Object.keys(SIBLINGS)) {
      for (const article of Object.keys(SIBLINGS)) {
        expect(visit({ saved, article }).navigations, `${saved} on ${article}`).toEqual([]);
      }
    }
  });
});
