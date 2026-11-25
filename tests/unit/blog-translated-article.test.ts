import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlogPostPageView } from '@/components/blog/BlogPostPageView';
import { getAllBlogPosts, type BlogPost } from '@/lib/data/blog-posts';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { BLOG_SEO_LANGS } from '@/lib/data/blog-short-slugs';
import { buildBlogPostMetadata } from '@/lib/seo/blog-post-metadata';
import { BLOG_BREADCRUMB_LABELS } from '@/lib/seo/blog-structured-data';

// The article view mounts BlogPostLanguageSync, which needs an App Router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const HEBREW_RE = /[֐-׿]/;
const SHORT_SLUG = 'aircraft-systems-guide';
const TRANSLATION_ID = '67660d2d-af7a-402d-b9db-408e73d5c114';
const ORIGIN = 'https://www.simdream.co.il';
const EN_TITLE = 'Aircraft Systems Guide: Mastering the Cockpit Without Getting Lost';
const EN_BODY = 'Every system on the Boeing 737 flight deck has one job.';

/** What `resolveBlogPost` returns for a translated article: English content and `hasTranslatedBody`. */
function englishPost(overrides: Partial<BlogPost> = {}): BlogPost {
  const hebrew = getAllBlogPosts()[0]!;
  return {
    ...hebrew,
    id: 'live-en-1',
    slug: 'aircraft-systems-guide-mastering-the-cockpit-without-getting-lost',
    shortSlug: SHORT_SLUG,
    canonicalPath: `/post/en/${SHORT_SLUG}`,
    title: EN_TITLE,
    excerpt: 'A pilot-written map of the 737 cockpit systems.',
    contentNodes: [
      { type: 'heading', level: 2, text: 'Start with the overhead panel' },
      { type: 'paragraph', text: EN_BODY },
    ],
    language: 'en',
    translationId: TRANSLATION_ID,
    siblingSlugs: { he: 'a-he', en: 'a-en' },
    hasTranslatedBody: true,
    ...overrides,
  };
}

function renderArticle(post: BlogPost): string {
  return renderToStaticMarkup(
    React.createElement(LanguageProvider, {
      initialLanguage: 'en',
      children: React.createElement(BlogPostPageView, { post }),
    })
  );
}

function jsonLdPayloads(markup: string): Array<Record<string, unknown>> {
  return [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]!) as Record<string, unknown>
  );
}

describe('a translated (English) article page renders translated', () => {
  const markup = renderArticle(englishPost());
  // Visible text only: the BlogPosting author keeps its Hebrew registry name inside the JSON-LD (existing design),
  // and the related-articles aside lists the Hebrew master titles. The two JSON-LD scripts precede the <article>
  // element, so slicing from it needs no HTML stripping; the article ends where the related-articles aside starts.
  const articleStart = markup.indexOf('<article');
  expect(articleStart, 'the article element').toBeGreaterThan(-1);
  const withoutRelated = markup.slice(articleStart).split('<aside')[0]!;

  it('shows the English title, excerpt and body, left to right', () => {
    expect(markup).toMatch(/<h1[^>]*>Aircraft Systems Guide: Mastering the Cockpit Without Getting Lost<\/h1>/);
    expect(markup).toContain('A pilot-written map of the 737 cockpit systems.');
    expect(markup).toContain(EN_BODY);
    expect(markup).toContain('Start with the overhead panel');
    expect(markup).toContain('<article dir="ltr"');
  });

  it('carries no Hebrew in the article itself: breadcrumb, byline, labels and body are English', () => {
    expect(withoutRelated).toContain(BLOG_BREADCRUMB_LABELS.en.home);
    expect(withoutRelated).toContain(BLOG_BREADCRUMB_LABELS.en.blog);
    expect(withoutRelated).toContain('min read');
    expect(withoutRelated).not.toMatch(HEBREW_RE);
  });

  it('declares the article English in both JSON-LD graphs with a self-referencing canonical', () => {
    const [posting, breadcrumb] = jsonLdPayloads(markup) as [
      { headline: string; inLanguage: string; mainEntityOfPage: { '@id': string } },
      { inLanguage: string; itemListElement: Array<{ name: string; item: string }> },
    ];
    expect(posting.headline).toBe(EN_TITLE);
    expect(posting.inLanguage).toBe('en-US');
    expect(posting.mainEntityOfPage['@id']).toBe(`${ORIGIN}/post/en/${SHORT_SLUG}`);
    expect(breadcrumb.inLanguage).toBe('en-US');
    expect(breadcrumb.itemListElement.map((crumb) => crumb.name)).toEqual([
      BLOG_BREADCRUMB_LABELS.en.home,
      BLOG_BREADCRUMB_LABELS.en.blog,
      EN_TITLE,
    ]);
    expect(breadcrumb.itemListElement[2]!.item).toBe(`${ORIGIN}/post/en/${SHORT_SLUG}`);
  });

  it('has indexable metadata: English title, self-referencing canonical and every hreflang alternate', async () => {
    const meta = await buildBlogPostMetadata(englishPost({ seoTitle: 'Aircraft Systems Guide | SimDream' }));
    expect(meta.title).toBe('Aircraft Systems Guide | SimDream');
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(`${ORIGIN}/post/en/${SHORT_SLUG}`);
    expect(meta.openGraph?.url).toBe(`${ORIGIN}/post/en/${SHORT_SLUG}`);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages).sort()).toEqual([...BLOG_SEO_LANGS, 'x-default'].sort());
    expect(languages.he).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
    expect(languages['x-default']).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
    for (const lang of BLOG_SEO_LANGS.filter((l) => l !== 'he')) {
      expect(languages[lang]).toBe(`${ORIGIN}/post/${lang}/${SHORT_SLUG}`);
    }
  });

  it('falls back to the post title for the metadata title when Wix sends no SEO title', async () => {
    const meta = await buildBlogPostMetadata(englishPost());
    expect(String(meta.title)).toContain(EN_TITLE.slice(0, 20));
    expect(String(meta.title)).not.toMatch(HEBREW_RE);
  });
});

describe('an English article without a translated body is noindex and points at the Hebrew page (#183)', () => {
  it('sets noindex,follow and a Hebrew canonical while the hreflang set stays complete', async () => {
    const meta = await buildBlogPostMetadata(
      englishPost({ hasTranslatedBody: false, title: getAllBlogPosts()[0]!.title, seoTitle: undefined })
    );
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
    expect(meta.openGraph?.url).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages['x-default']).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
    expect(languages.en).toBe(`${ORIGIN}/post/en/${SHORT_SLUG}`);
  });

  it('indexes the Hebrew master even when hasTranslatedBody is false', async () => {
    const meta = await buildBlogPostMetadata(englishPost({ language: 'he', hasTranslatedBody: false }));
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(`${ORIGIN}/post/${SHORT_SLUG}`);
  });
});
