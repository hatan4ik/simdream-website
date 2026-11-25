import { readFileSync } from 'node:fs';
import path from 'node:path';
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
import { REPO_ROOT } from './_support/source';

// The staging content suite (`npm run test:staging:content:docker`) is read-only and runs against the Wix staging
// host only. These tests pin its pure helpers, and keep its sample articles real.
describe('staging content suite: target guard', () => {
  const STAGING = 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com';

  it('runs against the staging site and nothing else', () => {
    for (const url of [
      'https://www.simdream.co.il',
      'https://simdream.co.il/',
      'HTTPS://WWW.SIMDREAM.CO.IL/he',
      'http://localhost:3100',
      'http://127.0.0.1:8781',
      'https://example.com',
      'https://another-site-0000.wix-site-host.com',
      `${STAGING}.evil.example`,
      `${STAGING}@evil.example`,
      STAGING.replace('https://', 'http://'),
      'not a url',
      '',
    ]) {
      expect(() => assertStagingUrl(url), JSON.stringify(url)).toThrow(/staging/i);
    }
  });

  it('accepts the staging site, with or without a trailing slash or path, and returns its origin', () => {
    for (const url of [STAGING, `${STAGING}/`, `${STAGING}///`, `${STAGING}/en/blog`, `${STAGING.toUpperCase()}/`]) {
      expect(assertStagingUrl(url), url).toBe(STAGING);
    }
  });

  it('names exactly the staging host as its default and cannot be pointed elsewhere by an environment variable', () => {
    expect(DEFAULT_BASE_URL).toBe(STAGING);
    expect(readFileSync(path.join(REPO_ROOT, 'scripts/verify-staging-content.mjs'), 'utf8')).not.toMatch(/process\.env\.STAGING_BASE_URL/);
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
