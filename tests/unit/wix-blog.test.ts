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
import blogSlugMapData from '@/lib/data/blog-slug-map.json';

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
    const wixPost = vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
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
    expect(wixPost).toHaveBeenCalledWith('https://www.wixapis.com/blog/v3/posts/query', {
      query: {
        filter: { language: { $eq: 'en' } },
        cursorPaging: { limit: 50 },
      },
    });

    const resolved = await resolveBlogPost('live-wix-test-article', 'en');
    expect(resolved).toBeDefined();
    expect(resolved?.title).toBe('Live Wix Test Article');
    expect(resolved?.contentNodes).toHaveLength(4);
    expect(resolved?.contentNodes[0]?.type).toBe('heading');
    expect(resolved?.contentNodes[1]?.type).toBe('heading');
    expect(resolved?.contentNodes[2]?.type).toBe('paragraph');
    expect(resolved?.contentNodes[3]?.type).toBe('list');
    expect(wixPost).toHaveBeenLastCalledWith('https://www.wixapis.com/blog/v3/posts/query', {
      query: {
        filter: {
          slug: { $eq: 'live-wix-test-article' },
          language: { $eq: 'en' },
        },
      },
      fieldsets: ['URL', 'RICH_CONTENT', 'SEO'],
    });
  });

  it('keeps the requested blog language when Wix returns a mismatched post', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    const wixPost = vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
      posts: [
        {
          id: 'wrong-language-post',
          title: 'English response that must not replace the Hebrew route',
          slug: 'aircraft-systems-guide',
          language: 'en',
        },
      ],
    });

    const resolved = await resolveBlogPost('aircraft-systems-guide', 'he');

    expect(wixPost).toHaveBeenCalledWith('https://www.wixapis.com/blog/v3/posts/query', {
      query: {
        filter: {
          slug: { $eq: 'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד' },
          language: { $eq: 'he' },
        },
      },
      fieldsets: ['URL', 'RICH_CONTENT', 'SEO'],
    });
    expect(resolved?.language).toBe('he');
    expect(resolved?.title).not.toBe('English response that must not replace the Hebrew route');
  });

  it('falls back to the requested language list when Wix returns only mismatched posts', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
      posts: [
        {
          id: 'wrong-language-list-post',
          title: 'English listing response that must not replace Hebrew posts',
          slug: 'aircraft-systems-guide',
          language: 'en',
        },
      ],
    });

    const posts = await listWixBlogPosts({ language: 'he' });

    expect(posts).toHaveLength(39);
    expect(posts.every((post) => post.language === 'he')).toBe(true);
    expect(posts.some((post) => post.title === 'English listing response that must not replace Hebrew posts')).toBe(false);
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

// 2026-11-24: Wix answers HTTP 400 ("Field 'blogSeo.slug' is using non allowed operator '$hasSome'") to a
// slug filter with $hasSome, although the Query Posts reference lists it. The resolver swallows the error and
// falls back to the local Hebrew article, so every translated article silently rendered in Hebrew. Verified
// against the live API: slug with $eq plus language with $eq returns exactly the post in that language.
describe('resolveBlogPost sends only filter operators that Wix accepts', () => {
  const TRANSLATION_ID = '1d47b886-a23f-43d9-86cc-54bf8ab2513a';
  const group = blogSlugMapData.byTranslationId[TRANSLATION_ID] as Record<string, string>;

  for (const language of ['he', 'en', 'ru', 'fr', 'de', 'es', 'ar'] as const) {
    it(`asks for the ${language} post by slug with $eq`, async () => {
      vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
      const wixPost = vi.spyOn(wixClient, 'wixPost').mockResolvedValue({
        posts: [{ id: `post-${language}`, title: `Title ${language}`, slug: group[language], language, translationId: TRANSLATION_ID }],
      });

      const resolved = await resolveBlogPost(group[language]!, language);

      const body = wixPost.mock.calls[0]![1] as { query: { filter: Record<string, Record<string, unknown>> } };
      expect(body.query.filter.slug).toEqual({ $eq: group[language] });
      expect(body.query.filter.language).toEqual({ $eq: language });
      expect(resolved?.title).toBe(`Title ${language}`);
      expect(resolved?.language).toBe(language);
    });
  }

  it('never uses an operator on slug other than $eq', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    const wixPost = vi.spyOn(wixClient, 'wixPost').mockResolvedValue({ posts: [] });
    await resolveBlogPost(group.en!, 'en');
    const body = wixPost.mock.calls[0]![1] as { query: { filter: { slug: Record<string, unknown> } } };
    expect(Object.keys(body.query.filter.slug)).toEqual(['$eq']);
  });
});

// A fallback to the local Hebrew articles is a degraded answer, and it must never be silent: a rejected Wix query
// served every translation in Hebrew for hours without a signal (2026-11-24).
describe('blog fallbacks to the local articles are logged', () => {
  const okPost = (language: string) => ({ posts: [{ id: `p-${language}`, title: `T ${language}`, slug: 'aircraft-systems-guide', language }] });
  const warned = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((call) => String(call[0]) + ' ' + String(call[1] ?? '')).join('\n');

  it('resolveBlogPost warns with the language and the reason when the Wix request fails', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockRejectedValue(new Error('Wix says no'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolved = await resolveBlogPost('aircraft-systems-guide', 'en');
    expect(resolved?.hasTranslatedBody).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warned(warn)).toMatch(/"en"[\s\S]*Wix says no/);
  });

  it('resolveBlogPost warns when Wix answers with no post or an unexpected shape', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wixPost = vi.spyOn(wixClient, 'wixPost');
    wixPost.mockResolvedValueOnce({ posts: [] });
    await resolveBlogPost('aircraft-systems-guide', 'ru');
    wixPost.mockResolvedValueOnce({ posts: 'not-a-list' });
    await resolveBlogPost('aircraft-systems-guide', 'fr');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warned(warn)).toMatch(/"ru"/);
    expect(warned(warn)).toMatch(/"fr"/);
  });

  it('resolveBlogPost stays quiet on success, when Wix is not configured, and for a slug nobody has (a plain 404)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue(okPost('he'));
    await resolveBlogPost('aircraft-systems-guide', 'he');
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue({ posts: [] });
    expect(await resolveBlogPost('no-such-article-anywhere', 'en')).toBeUndefined();
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(false);
    await resolveBlogPost('aircraft-systems-guide', 'en');
    expect(warn).not.toHaveBeenCalled();
  });

  it('listWixBlogPosts warns when the request fails, the shape is wrong or no post has the language', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wixPost = vi.spyOn(wixClient, 'wixPost');
    wixPost.mockRejectedValueOnce(new Error('list down'));
    await listWixBlogPosts({ language: 'en' });
    wixPost.mockResolvedValueOnce({ posts: 'not-a-list' });
    await listWixBlogPosts({ language: 'ru' });
    wixPost.mockResolvedValueOnce({ posts: [] });
    await listWixBlogPosts({ language: 'de' });
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warned(warn)).toMatch(/"en"[\s\S]*list down/);
    expect(warned(warn)).toMatch(/"ru"/);
    expect(warned(warn)).toMatch(/"de"/);
  });

  it('listWixBlogPosts stays quiet when Wix returns posts in the language', async () => {
    vi.spyOn(wixConfig, 'isWixConfigured').mockReturnValue(true);
    vi.spyOn(wixClient, 'wixPost').mockResolvedValue(okPost('en'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const list = await listWixBlogPosts({ language: 'en' });
    expect(list[0]?.language).toBe('en');
    expect(warn).not.toHaveBeenCalled();
  });
});

