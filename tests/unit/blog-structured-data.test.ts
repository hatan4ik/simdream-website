import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlogPostPageView } from '@/components/blog/BlogPostPageView';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { BLOG_AUTHORS, DEFAULT_BLOG_AUTHOR_ID, getBlogAuthor } from '@/lib/data/blog-authors';
import { getAllBlogPosts, type BlogPost } from '@/lib/data/blog-posts';
import {
  BLOG_BREADCRUMB_LABELS,
  BLOG_BREADCRUMB_LABELS_HE,
  blogPostCanonicalUrl,
  buildBlogBreadcrumbJsonLd,
  buildBlogPostingJsonLd,
} from '@/lib/seo/blog-structured-data';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { blogPostPath } from '@/lib/seo/site-routes';
import { REPO_ROOT } from './_support/source';

// The article view mounts BlogPostLanguageSync, which needs an App Router; the markup test renders without one.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const posts = getAllBlogPosts();
const sample = posts[0]!;
const POST_VIEW = 'components/blog/BlogPostPageView.tsx';

describe('blog author registry (E-E-A-T bylines)', () => {
  it('has a default byline whose profiles are only the official Sim Dream channels', () => {
    const author = getBlogAuthor();
    expect(author.id).toBe(DEFAULT_BLOG_AUTHOR_ID);
    expect(author.nameHe).toMatch(/[֐-׿]/);
    expect(author.roleHe).toMatch(/[֐-׿]/);
    expect(author.url).toBe(`${FACILITY_INFO.primaryDomain}/about`);
    const official = new Set<string>([...Object.values(FACILITY_INFO.social), FACILITY_INFO.googleMapsUrl]);
    for (const author of Object.values(BLOG_AUTHORS)) {
      expect(author.sameAs.length).toBeGreaterThan(0);
      for (const url of author.sameAs) expect(official.has(url), url).toBe(true);
    }
  });

  it('resolves every post to a registered author', () => {
    for (const post of posts) expect(BLOG_AUTHORS[getBlogAuthor(post.authorId).id]).toBeDefined();
  });
});

describe('BlogPosting JSON-LD', () => {
  it('names a Person author backed by the registry, with the publisher kept', () => {
    const jsonLd = buildBlogPostingJsonLd(sample);
    const author = getBlogAuthor(sample.authorId);
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.author['@type']).toBe('Person');
    expect(jsonLd.author.name).toBe(author.nameHe);
    expect(jsonLd.author.alternateName).toBe(author.nameEn);
    expect(jsonLd.author.jobTitle).toBe(author.roleEn);
    expect(jsonLd.author.url).toBe(author.url);
    expect(jsonLd.author.sameAs).toEqual([...author.sameAs]);
    expect(jsonLd.author.worksFor).toMatchObject({ '@type': 'Organization', url: FACILITY_INFO.primaryDomain });
    expect(jsonLd.publisher).toMatchObject({
      '@type': 'Organization',
      name: 'Sim Dream LTD',
      logo: { '@type': 'ImageObject', url: `${FACILITY_INFO.primaryDomain}/brand/simdream-logo.png` },
    });
  });

  it('keeps the existing BlogPosting fields', () => {
    const jsonLd = buildBlogPostingJsonLd(sample);
    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      headline: sample.title,
      description: sample.excerpt,
      image: [sample.coverImage],
      datePublished: sample.datePublished,
      inLanguage: 'he-IL',
      mainEntityOfPage: { '@type': 'WebPage', '@id': blogPostCanonicalUrl(sample) },
    });
    expect(blogPostCanonicalUrl(sample)).toBe(`${FACILITY_INFO.primaryDomain}${blogPostPath(sample.slug, 'he')}`);
  });

  it('omits dateModified when the corpus has none, and never mirrors datePublished', () => {
    for (const post of posts) {
      const jsonLd = buildBlogPostingJsonLd(post);
      if (post.dateModified) {
        expect(jsonLd.dateModified).toBe(post.dateModified);
        expect(post.dateModified >= post.datePublished).toBe(true);
      } else {
        expect(jsonLd).not.toHaveProperty('dateModified');
      }
    }
    const edited: BlogPost = { ...sample, dateModified: '2026-11-01' };
    expect(buildBlogPostingJsonLd(edited).dateModified).toBe('2026-11-01');
  });
});

describe('BreadcrumbList JSON-LD', () => {
  it('is Home → Blog → article title in the page language', () => {
    const jsonLd = buildBlogBreadcrumbJsonLd(sample);
    expect(jsonLd['@type']).toBe('BreadcrumbList');
    expect(jsonLd.inLanguage).toBe('he-IL');
    expect(jsonLd.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: BLOG_BREADCRUMB_LABELS_HE.home, item: FACILITY_INFO.primaryDomain },
      { '@type': 'ListItem', position: 2, name: BLOG_BREADCRUMB_LABELS_HE.blog, item: `${FACILITY_INFO.primaryDomain}/blog` },
      { '@type': 'ListItem', position: 3, name: sample.title, item: blogPostCanonicalUrl(sample) },
    ]);
    for (const label of Object.values(BLOG_BREADCRUMB_LABELS_HE)) expect(label).toMatch(/^[֐-׿\s]+$/);
  });

  it('supports localized inLanguage and BreadcrumbList labels for non-Hebrew posts', () => {
    const enPost: BlogPost = { ...sample, language: 'en', title: 'Does Autopilot Land by Itself?' };
    const postingEn = buildBlogPostingJsonLd(enPost);
    const breadcrumbEn = buildBlogBreadcrumbJsonLd(enPost);
    expect(postingEn.inLanguage).toBe('en-US');
    expect(postingEn.mainEntityOfPage['@id']).toBe(`${FACILITY_INFO.primaryDomain}${blogPostPath(sample.slug, 'en')}`);
    expect(breadcrumbEn.inLanguage).toBe('en-US');
    expect(breadcrumbEn.itemListElement[0]?.name).toBe(BLOG_BREADCRUMB_LABELS.en.home);
    expect(breadcrumbEn.itemListElement[1]?.name).toBe(BLOG_BREADCRUMB_LABELS.en.blog);
  });

  it('is rendered by the article view from the shared builders, next to the visible breadcrumb', () => {
    const source = readFileSync(path.join(REPO_ROOT, POST_VIEW), 'utf8');
    expect(source).toContain('buildBlogPostingJsonLd(post)');
    expect(source).toContain('buildBlogBreadcrumbJsonLd(post)');
    expect(source).toContain('BLOG_BREADCRUMB_LABELS[seoLang]');
    expect(source).toContain('{breadcrumbLabels.home}');
    expect(source).toContain('{breadcrumbLabels.blog}');
    expect(source).toContain('{authorName}');
    expect(source).not.toContain('dateModified: post.datePublished');
    expect(source).not.toMatch(/'@type':\s*'Organization',\s*name:\s*'Sim Dream Aviation Team'/);
  });
});

describe('JSON-LD scripts on the article view', () => {
  const BREAKOUT = '</script><script>alert(1)</script>';

  function renderJsonLdPayloads(post: BlogPost): { markup: string; payloads: string[] } {
    const markup = renderToStaticMarkup(
      React.createElement(LanguageProvider, {
        initialLanguage: 'he',
        children: React.createElement(BlogPostPageView, { post }),
      })
    );
    const payloads = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
    return { markup, payloads };
  }

  it('keeps a title and SEO description that carry a script end tag inside the JSON-LD string', () => {
    const hostile: BlogPost = {
      ...sample,
      title: `Title ${BREAKOUT}`,
      seoDescription: `Description ${BREAKOUT}`,
    };

    const { markup, payloads } = renderJsonLdPayloads(hostile);

    // Exactly the two JSON-LD scripts open and close: no payload ended early, none opened a second script.
    expect(markup.match(/<script/g), 'script elements in the article markup').toHaveLength(2);
    expect(markup.match(/<\/script>/g), 'script end tags in the article markup').toHaveLength(2);
    expect(payloads).toHaveLength(2);
    for (const payload of payloads) expect(payload).not.toMatch(/<\/script/i);

    const [posting, breadcrumb] = payloads.map((payload) => JSON.parse(payload) as Record<string, unknown>);
    expect(posting!.headline).toBe(hostile.title);
    expect(posting!.description).toBe(hostile.seoDescription);
    const trail = breadcrumb!.itemListElement as Array<{ name: string }>;
    expect(trail.at(-1)!.name).toBe(hostile.title);
  });

  it('serialises both scripts with serializeJsonLd, never a bare JSON.stringify', () => {
    const source = readFileSync(path.join(REPO_ROOT, POST_VIEW), 'utf8');
    expect(source).toContain('serializeJsonLd(blogPostingJsonLd)');
    expect(source).toContain('serializeJsonLd(breadcrumbJsonLd)');
    expect(source).not.toContain('JSON.stringify');
  });
});
