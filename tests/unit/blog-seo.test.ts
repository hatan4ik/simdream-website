import { describe, expect, it, vi, afterEach } from 'vitest';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import blogSlugMapData from '@/lib/data/blog-slug-map.json';
import {
  BLOG_SEO_LANGS,
  getAllBlogSeoRecords,
  getBlogSeoBySlugOrId,
  getLocalizedBlogSeo,
} from '@/lib/data/blog-seo';
import { buildBlogPostMetadata } from '@/lib/seo/blog-post-metadata';
import { blogPostPath } from '@/lib/seo/site-routes';
import { resolveBlogPost } from '@/lib/wix/blog';
import * as wixConfig from '@/lib/wix/config';
import * as wixClient from '@/lib/wix/client';

const HEBREW_RE = /[\u0590-\u05FF]/;
const ARABIC_RE = /[\u0600-\u06FF]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

describe('blog-seo.json registry & short canonical URLs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers all 39 posts across all 6 languages with unique ASCII shortSlugs', async () => {
    const posts = getAllBlogPosts();
    const records = await getAllBlogSeoRecords();
    expect(records).toHaveLength(posts.length);
    expect(records).toHaveLength(39);

    const seenSlugs = new Set<string>();

    for (const record of records) {
      expect(record.shortSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(record.shortSlug.length).toBeLessThanOrEqual(55);
      const words = record.shortSlug.split('-');
      expect(words.length).toBeGreaterThanOrEqual(3);
      expect(words.length).toBeLessThanOrEqual(6);
      expect(seenSlugs.has(record.shortSlug)).toBe(false);
      seenSlugs.add(record.shortSlug);

      for (const lang of BLOG_SEO_LANGS) {
        const loc = record.locales[lang];
        expect(loc).toBeDefined();
        expect(loc.shortSlug).toBe(record.shortSlug);
        expect(loc.metaTitle.length).toBeGreaterThanOrEqual(48);
        expect(loc.metaTitle.length).toBeLessThanOrEqual(60);
        expect(loc.metaTitle.endsWith('| SimDream')).toBe(true);
        expect(loc.metaDescription.length).toBeGreaterThanOrEqual(135);
        expect(loc.metaDescription.length).toBeLessThanOrEqual(160);
        expect(loc.keywords.length).toBeGreaterThanOrEqual(3);
        expect(loc.keywords.length).toBeLessThanOrEqual(5);

        if (lang !== 'he') {
          expect(loc.metaTitle).not.toMatch(HEBREW_RE);
          expect(loc.metaDescription).not.toMatch(HEBREW_RE);
        }
        if (lang !== 'ar') {
          expect(loc.metaTitle).not.toMatch(ARABIC_RE);
          expect(loc.metaDescription).not.toMatch(ARABIC_RE);
        }
        if (lang !== 'ru') {
          expect(loc.metaTitle).not.toMatch(CYRILLIC_RE);
          expect(loc.metaDescription).not.toMatch(CYRILLIC_RE);
        }
      }
    }
  });

  it('resolves every legacy slug from blog-posts.json and blog-slug-map.json to its shortSlug', async () => {
    for (const post of getAllBlogPosts()) {
      const match = await getBlogSeoBySlugOrId(post.slug);
      expect(match, post.slug).toBeDefined();
      expect(match?.isLegacy).toBe(true);
      expect(blogPostPath(post.slug, 'he')).toBe(`/post/${match?.record.shortSlug}`);
    }

    const bySlug = (blogSlugMapData as { bySlug: Record<string, { translationId: string; language: string }> }).bySlug;
    for (const [legacySlug, info] of Object.entries(bySlug)) {
      const match = await getBlogSeoBySlugOrId(legacySlug);
      expect(match, legacySlug).toBeDefined();
      expect(match?.record.translationId).toBe(info.translationId);
      expect(match?.isLegacy).toBe(true);
    }
  });

  it('builds localized metadata with all 6 hreflang alternates + x-default and guards language-mismatch fallbacks', async () => {
    const hePost = await resolveBlogPost('aircraft-systems-guide', 'he');
    expect(hePost).toBeDefined();
    expect(hePost?.hasTranslatedBody).toBe(true);
    const heMeta = await buildBlogPostMetadata(hePost);
    expect(heMeta.alternates?.canonical).toBe('https://www.simdream.co.il/post/aircraft-systems-guide');
    expect(heMeta.alternates?.languages?.['x-default']).toBe('https://www.simdream.co.il/post/aircraft-systems-guide');
    expect(heMeta.alternates?.languages?.en).toBe('https://www.simdream.co.il/post/en/aircraft-systems-guide');
    expect(heMeta.robots).toBeUndefined();

    // Non-Hebrew fallback without live Wix translated body should noindex & canonicalize to Hebrew
    const enFallback = await resolveBlogPost('aircraft-systems-guide', 'en');
    expect(enFallback).toBeDefined();
    expect(enFallback?.hasTranslatedBody).toBe(false);
    const enFallbackMeta = await buildBlogPostMetadata(enFallback);
    expect(enFallbackMeta.robots).toEqual({ index: false, follow: true });
    expect(enFallbackMeta.alternates?.canonical).toBe('https://www.simdream.co.il/post/aircraft-systems-guide');
    expect(enFallbackMeta.title).toBe((await getLocalizedBlogSeo('aircraft-systems-guide', 'en'))?.metaTitle);
  });

  it('prefers Wix seoData.tags when live Wix Blog returns SEO tags', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
      posts: [
        {
          id: 'live-1',
          title: 'Aircraft Systems Guide',
          slug: 'aircraft-systems-guide-mastering-the-cockpit-without-getting-lost',
          excerpt: 'Fallback excerpt',
          language: 'en',
          translationId: '67660d2d-af7a-402d-b9db-408e73d5c114',
          seoData: {
            tags: [
              { type: 'title', children: 'Custom Wix SEO Title | SimDream' },
              { type: 'meta', props: { name: 'description', content: 'Custom Wix SEO description for 737 cockpit systems.' } },
            ],
          },
          richContent: {
            nodes: [{ type: 'PARAGRAPH', nodes: [{ textData: { text: 'Translated English body.' } }] }],
          },
        },
      ],
    });

    const post = await resolveBlogPost('aircraft-systems-guide', 'en');
    expect(post?.hasTranslatedBody).toBe(true);
    expect(post?.seoTitle).toBe('Custom Wix SEO Title | SimDream');
    expect(post?.seoDescription).toBe('Custom Wix SEO description for 737 cockpit systems.');
    const meta = await buildBlogPostMetadata(post);
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe('https://www.simdream.co.il/post/en/aircraft-systems-guide');
  });
});
