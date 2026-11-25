import { describe, expect, it } from 'vitest';
import blogSlugMap from '@/lib/data/blog-slug-map.json';
import { BLOG_SEO_LANGS, SHORT_SLUG_BY_TID } from '@/lib/data/blog-short-slugs';
import {
  DEFAULT_ARTICLES,
  DEFAULT_BASE_URL,
  LANGUAGES,
  articlePath,
  assertStagingUrl,
  titleMatchesLanguage,
} from '../../scripts/verify-staging-content.mjs';

// The staging content suite (`npm run test:staging:content:docker`) is read-only and runs against the Wix staging
// host only. These tests pin its pure helpers, and keep its sample articles real.
describe('staging content suite: target guard', () => {
  it('refuses the production domain in any spelling', () => {
    for (const url of ['https://www.simdream.co.il', 'https://simdream.co.il/', 'HTTPS://WWW.SIMDREAM.CO.IL/he', 'http://simdream.co.il:443']) {
      expect(() => assertStagingUrl(url), url).toThrow(/simdream\.co\.il/);
    }
  });

  it('accepts the staging host and drops a trailing slash', () => {
    expect(assertStagingUrl(DEFAULT_BASE_URL)).toBe(DEFAULT_BASE_URL);
    expect(assertStagingUrl(`${DEFAULT_BASE_URL}///`)).toBe(DEFAULT_BASE_URL);
  });

  it('defaults to a Wix staging host, never the production domain', () => {
    expect(DEFAULT_BASE_URL).toMatch(/^https:\/\/[a-z0-9-]+\.wix-site-host\.com$/);
  });
});

describe('staging content suite: article paths and titles', () => {
  it('opens the Hebrew master without a language prefix and the translations with one', () => {
    expect(articlePath('does-autopilot-land-alone', 'he')).toBe('/post/does-autopilot-land-alone');
    expect(articlePath('does-autopilot-land-alone', 'en')).toBe('/post/en/does-autopilot-land-alone');
    expect(articlePath('does-autopilot-land-alone', 'ar')).toBe('/post/ar/does-autopilot-land-alone');
  });

  it('judges a title by its script: Hebrew, Arabic, Cyrillic, otherwise Latin without those scripts', () => {
    expect(titleMatchesLanguage('האם טייס אוטומטי נוחת לבד?', 'he')).toBe(true);
    expect(titleMatchesLanguage('Does Autopilot Land by Itself?', 'he')).toBe(false);
    expect(titleMatchesLanguage('Does Autopilot Land by Itself?', 'en')).toBe(true);
    expect(titleMatchesLanguage('האם טייס אוטומטי נוחת לבד?', 'en')).toBe(false); // the Hebrew fallback
    expect(titleMatchesLanguage('هل يهبط الطيار الآلي؟', 'ar')).toBe(true);
    expect(titleMatchesLanguage('Садится ли автопилот сам?', 'ru')).toBe(true);
    expect(titleMatchesLanguage('Садится ли автопилот сам?', 'fr')).toBe(false);
    expect(titleMatchesLanguage('Landet ein Autopilot von selbst?', 'de')).toBe(true);
    expect(titleMatchesLanguage('', 'en')).toBe(false);
  });
});

describe('staging content suite: sample data stays real', () => {
  it('checks exactly the seven blog languages', () => {
    expect([...LANGUAGES]).toEqual([...BLOG_SEO_LANGS]);
  });

  it('uses articles that exist in the registry with a slug for every language', () => {
    const groups = blogSlugMap.byTranslationId as Record<string, Record<string, string>>;
    for (const short of DEFAULT_ARTICLES) {
      const translationId = Object.entries(SHORT_SLUG_BY_TID).find(([, value]) => value === short)?.[0];
      expect(translationId, `short slug "${short}" in SHORT_SLUG_BY_TID`).toBeDefined();
      for (const language of LANGUAGES) expect(groups[translationId!]?.[language], `${short} in ${language}`).toBeTruthy();
    }
  });
});
