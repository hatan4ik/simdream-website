import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
import { blogPostPath } from '@/lib/seo/site-routes';
import { REPO_ROOT } from './_support/source';

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
