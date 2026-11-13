import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  ALL_SHORT_SLUGS,
  BLOG_SEO_LANGS,
  getShortSlugMatch,
  isBlogSeoLang,
} from '@/lib/data/blog-short-slugs';
import { buildBlogPostMetadata } from '@/lib/seo/blog-post-metadata';
import { blogPostPath } from '@/lib/seo/site-routes';
import { resolveBlogPost } from '@/lib/wix/blog';
import { BlogPostPageView } from '@/components/blog/BlogPostPageView';

interface PostCatchAllPageProps {
  params: Promise<{ segments: string[] }>;
}

const NON_HEBREW_LANGS = BLOG_SEO_LANGS.filter((lang) => lang !== 'he');

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export async function generateStaticParams() {
  const heParams = ALL_SHORT_SLUGS.map((shortSlug) => ({
    segments: [shortSlug],
  }));
  const localizedParams = NON_HEBREW_LANGS.flatMap((lang) =>
    ALL_SHORT_SLUGS.map((shortSlug) => ({
      segments: [lang, shortSlug],
    }))
  );
  return [...heParams, ...localizedParams];
}

export async function generateMetadata({ params }: PostCatchAllPageProps): Promise<Metadata> {
  const { segments } = await params;

  if (segments.length === 1) {
    const slug = segments[0]!;
    const match = getShortSlugMatch(slug);
    const lang = match?.language ?? 'he';
    const post = await resolveBlogPost(slug, lang);
    return buildBlogPostMetadata(post);
  }

  if (segments.length === 2) {
    const [lang, slug] = segments;
    if (!isBlogSeoLang(lang)) {
      return buildBlogPostMetadata(undefined);
    }
    const post = await resolveBlogPost(slug!, lang);
    return buildBlogPostMetadata(post);
  }

  return buildBlogPostMetadata(undefined);
}

export default async function PostCatchAllPage({ params }: PostCatchAllPageProps) {
  const { segments } = await params;

  if (segments.length === 1) {
    const slug = segments[0]!;
    const match = getShortSlugMatch(slug);

    if (match) {
      const decoded = decodeSegment(slug);
      const targetLang = match.language ?? 'he';
      if (match.isLegacy || targetLang !== 'he' || decoded !== match.shortSlug) {
        permanentRedirect(blogPostPath(match.shortSlug, targetLang));
      }
    }

    const post = await resolveBlogPost(slug, 'he');
    if (!post) {
      notFound();
    }
    return <BlogPostPageView post={post} />;
  }

  if (segments.length === 2) {
    const [lang, slug] = segments;
    if (!isBlogSeoLang(lang)) {
      notFound();
    }

    const match = getShortSlugMatch(slug!);
    if (lang === 'he') {
      permanentRedirect(blogPostPath(match?.shortSlug ?? slug!, 'he'));
    }

    if (match) {
      const decoded = decodeSegment(slug!);
      if (match.isLegacy || decoded !== match.shortSlug) {
        permanentRedirect(blogPostPath(match.shortSlug, lang));
      }
    }

    const post = await resolveBlogPost(slug!, lang);
    if (!post) {
      notFound();
    }
    return <BlogPostPageView post={post} />;
  }

  notFound();
}
