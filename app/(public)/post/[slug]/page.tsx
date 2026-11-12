import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllBlogSeoRecords, getBlogSeoBySlugOrId } from '@/lib/data/blog-seo';
import { buildBlogPostMetadata } from '@/lib/seo/blog-post-metadata';
import { blogPostPath } from '@/lib/seo/site-routes';
import { resolveBlogPost } from '@/lib/wix/blog';
import { BlogPostPageView } from '@/components/blog/BlogPostPageView';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSeoRecords().map((record) => ({
    slug: record.shortSlug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const match = getBlogSeoBySlugOrId(slug);
  const lang = match?.language ?? 'he';
  const post = await resolveBlogPost(slug, lang);
  return buildBlogPostMetadata(post);
}

export default async function SinglePostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const match = getBlogSeoBySlugOrId(slug);

  if (match) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(slug).trim();
    } catch {
      decoded = slug.trim();
    }
    const targetLang = match.language ?? 'he';
    if (match.isLegacy || targetLang !== 'he' || decoded !== match.record.shortSlug) {
      permanentRedirect(blogPostPath(match.record.shortSlug, targetLang));
    }
  }

  const post = await resolveBlogPost(slug, 'he');
  if (!post) {
    notFound();
  }

  return <BlogPostPageView post={post} />;
}
