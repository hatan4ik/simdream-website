import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  BLOG_SEO_LANGS,
  getAllBlogSeoRecords,
  getBlogSeoBySlugOrId,
  isBlogSeoLang,
} from '@/lib/data/blog-seo';
import { buildBlogPostMetadata } from '@/lib/seo/blog-post-metadata';
import { blogPostPath } from '@/lib/seo/site-routes';
import { resolveBlogPost } from '@/lib/wix/blog';
import { BlogPostPageView } from '@/components/blog/BlogPostPageView';

interface LocalizedPostPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

const NON_HEBREW_LANGS = BLOG_SEO_LANGS.filter((lang) => lang !== 'he');

export async function generateStaticParams() {
  const records = getAllBlogSeoRecords();
  return NON_HEBREW_LANGS.flatMap((lang) =>
    records.map((record) => ({
      lang,
      slug: record.shortSlug,
    }))
  );
}

export async function generateMetadata({ params }: LocalizedPostPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isBlogSeoLang(lang)) {
    return buildBlogPostMetadata(undefined);
  }
  const post = await resolveBlogPost(slug, lang);
  return buildBlogPostMetadata(post);
}

export default async function LocalizedPostPage({ params }: LocalizedPostPageProps) {
  const { lang, slug } = await params;
  if (!isBlogSeoLang(lang)) {
    notFound();
  }

  const match = getBlogSeoBySlugOrId(slug);
  if (lang === 'he') {
    permanentRedirect(blogPostPath(match?.record.shortSlug ?? slug, 'he'));
  }

  if (match) {
    let decoded = slug;
    try {
      decoded = decodeURIComponent(slug).trim();
    } catch {
      decoded = slug.trim();
    }
    if (match.isLegacy || decoded !== match.record.shortSlug) {
      permanentRedirect(blogPostPath(match.record.shortSlug, lang));
    }
  }

  const post = await resolveBlogPost(slug, lang);
  if (!post) {
    notFound();
  }

  return <BlogPostPageView post={post} />;
}
