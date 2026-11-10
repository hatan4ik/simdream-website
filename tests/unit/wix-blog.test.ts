import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostsByCategory,
  getFeaturedBlogPosts,
  getRelatedBlogPosts,
  BLOG_CATEGORIES,
} from '@/lib/data/blog-posts';
import { listWixBlogPosts, resolveBlogPost, getBlogPostSiblings } from '@/lib/wix/blog';
import * as wixConfig from '@/lib/wix/config';
import * as wixClient from '@/lib/wix/client';

describe('Wix Headless Blog System & 39-Article Content Engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('loads all 39 published aviation articles with complete metadata', () => {
    const posts = getAllBlogPosts();
    expect(posts).toHaveLength(39);

    for (const post of posts) {
      expect(post.id).toBeDefined();
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(post.coverImage).toMatch(/^https?:\/\//);
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(post.contentNodes.length).toBeGreaterThan(0);
      expect(['airline_prep', 'cockpit_skills', 'gifts_and_events', 'fear_of_flying', 'aviation_knowledge']).toContain(
        post.category
      );
    }
  });

  it('resolves posts by exact Hebrew slug and URI-encoded slug', () => {
    const targetSlug = 'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד';
    const postRaw = getBlogPostBySlug(targetSlug);
    expect(postRaw).toBeDefined();
    expect(postRaw?.slug).toBe(targetSlug);
    expect(postRaw?.category).toBe('airline_prep');

    const postEncoded = getBlogPostBySlug(encodeURIComponent(targetSlug));
    expect(postEncoded).toBeDefined();
    expect(postEncoded?.id).toBe(postRaw?.id);
  });

  it('filters posts across all 5 customer intent categories', () => {
    for (const category of BLOG_CATEGORIES) {
      const posts = getBlogPostsByCategory(category.id);
      expect(posts.length).toBeGreaterThan(0);
      for (const p of posts) {
        expect(p.category).toBe(category.id);
      }
    }
  });

  it('provides featured and related articles excluding the current post', () => {
    const featured = getFeaturedBlogPosts(3);
    expect(featured).toHaveLength(3);

    const firstPost = getAllBlogPosts()[0]!;
    const related = getRelatedBlogPosts(firstPost, 3);
    expect(related).toHaveLength(3);
    expect(related.some((p) => p.id === firstPost.id)).toBe(false);
  });

  it('falls back gracefully to authoritative blog posts when Wix API is in local/test mode', async () => {
    const posts = await listWixBlogPosts();
    expect(posts).toHaveLength(39);

    const resolved = await resolveBlogPost('מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד');
    expect(resolved).toBeDefined();
    expect(resolved?.category).toBe('airline_prep');

    const missing = await resolveBlogPost('non-existent-slug-xyz');
    expect(missing).toBeUndefined();
  });

  it('provides multilingual category labels across all 6 supported languages', () => {
    const langs = ['he', 'en', 'ru', 'fr', 'es', 'ar'] as const;
    for (const cat of BLOG_CATEGORIES) {
      for (const lang of langs) {
        const label = cat[`label${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof typeof cat];
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
      }
    }
  });

  it('maps sibling slugs across all 6 languages for translated articles', () => {
    const hebrewSlug = 'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד';
    const siblings = getBlogPostSiblings(hebrewSlug);
    expect(Object.keys(siblings).length).toBeGreaterThanOrEqual(1);

    if (siblings.en) {
      const fromEn = getBlogPostSiblings(siblings.en);
      expect(fromEn.he).toBe(siblings.he);
    }
  });

  it('resolves a translated slug in fallback mode using the local group', async () => {
    const translatedSlug = 'aircraft-systems-guide-mastering-the-cockpit-without-getting-lost';
    const resolved = await resolveBlogPost(translatedSlug);
    expect(resolved).toBeDefined();
    expect(resolved?.slug).toBe(translatedSlug);
    expect(resolved?.language).toBe('en');
    expect(resolved?.siblingSlugs?.he).toBeTruthy();
  });

  it('fetches and maps live Wix blog posts when Wix is configured', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
      posts: [
        {
          id: 'test-wix-post-1',
          title: 'Live Wix Test Article',
          slug: 'live-wix-test-article',
          excerpt: 'An excerpt from live Wix.',
          firstPublishedDate: '2026-11-10T12:00:00Z',
          lastPublishedDate: '2026-11-10T14:00:00Z',
          minutesToRead: 7,
          language: 'en',
          translationId: '67660d2d-af7a-402d-b9db-408e73d5c114',
          richContent: {
            nodes: [
              {
                type: 'HEADING',
                headingData: { level: 2 },
                nodes: [{ textData: { text: 'Flight Briefing' } }],
              },
              {
                type: 'HEADING',
                headingData: { level: 3 },
                nodes: [{ textData: { text: 'Cockpit Systems' } }],
              },
              {
                type: 'PARAGRAPH',
                nodes: [{ textData: { text: 'Authentic Boeing 737 procedural description.' } }],
              },
              {
                type: 'BULLETED_LIST',
                nodes: [
                  {
                    nodes: [
                      { textData: { text: 'Item 1' } },
                      { textData: { text: 'Item 2' } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      totalCount: 1,
    });

    const list = await listWixBlogPosts({ language: 'en' });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('test-wix-post-1');
    expect(list[0]?.language).toBe('en');
    expect(list[0]?.readingTimeMinutes).toBe(7);

    const resolved = await resolveBlogPost('live-wix-test-article');
    expect(resolved).toBeDefined();
    expect(resolved?.title).toBe('Live Wix Test Article');
    expect(resolved?.contentNodes).toHaveLength(4);
    expect(resolved?.contentNodes[0]?.type).toBe('heading');
    expect(resolved?.contentNodes[1]?.type).toBe('heading');
    expect(resolved?.contentNodes[2]?.type).toBe('paragraph');
    expect(resolved?.contentNodes[3]?.type).toBe('list');
  });

  it('handles Wix API errors cleanly by falling back', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockRejectedValue(new Error('Wix API timeout'));

    const list = await listWixBlogPosts({ language: 'he' });
    expect(list.length).toBeGreaterThan(0);

    const resolved = await resolveBlogPost('מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד');
    expect(resolved).toBeDefined();
    expect(resolved?.category).toBe('airline_prep');
  });
});

