import type { Metadata } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getBlogAuthor } from '@/lib/data/blog-authors';
import type { BlogPost } from '@/lib/data/blog-categories';
import { BLOG_SEO_LANGS, isBlogSeoLang, resolveShortSlug } from '@/lib/data/blog-short-slugs';
import { getLocalizedBlogSeo } from '@/lib/data/blog-seo';
import { blogPostCanonicalUrl } from './blog-structured-data';
import { blogPostPath, siteUrl } from './site-routes';

const BASE_URL = FACILITY_INFO.primaryDomain;

/**
 * Builds Next.js `Metadata` for a blog post page (`/post/[slug]` or `/post/[lang]/[slug]`).
 * Includes `metaTitle`, `metaDescription`, `keywords`, short canonical URL, all 6 `hreflang`
 * alternates + `x-default`, and a language-mismatch safeguard when a translated body is unavailable.
 */
export async function buildBlogPostMetadata(post: BlogPost | undefined): Promise<Metadata> {
  if (!post) {
    return {
      title: 'מאמר לא נמצא | SimDream',
      robots: { index: false, follow: false },
    };
  }

  const lang = isBlogSeoLang(post.language) ? post.language : 'he';
  const shortSlug = post.shortSlug || resolveShortSlug(post.translationId || post.slug);
  const hebrewCanonicalUrl = siteUrl(BASE_URL, blogPostPath(shortSlug, 'he'));
  const selfCanonicalUrl = blogPostCanonicalUrl({ ...post, shortSlug, language: lang });
  const isLanguageMismatchFallback = lang !== 'he' && post.hasTranslatedBody === false;
  const canonicalUrl = isLanguageMismatchFallback ? hebrewCanonicalUrl : selfCanonicalUrl;

  const author = getBlogAuthor(post.authorId);
  const localSeo = await getLocalizedBlogSeo(post.translationId || shortSlug, lang);
  const title = post.seoTitle || localSeo?.metaTitle || `${post.title} | SimDream`;
  const description = post.seoDescription || localSeo?.metaDescription || post.excerpt;
  const keywords = post.seoKeywords?.length ? post.seoKeywords : localSeo?.keywords;

  const languageAlternates: Record<string, string> = {};
  for (const l of BLOG_SEO_LANGS) {
    languageAlternates[l] = siteUrl(BASE_URL, blogPostPath(shortSlug, l));
  }
  languageAlternates['x-default'] = hebrewCanonicalUrl;

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    authors: [{ name: lang === 'he' || lang === 'ar' ? author.nameHe : author.nameEn, url: author.url }],
    ...(isLanguageMismatchFallback ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.datePublished,
      ...(post.dateModified ? { modifiedTime: post.dateModified } : {}),
      authors: [author.url],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [post.coverImage],
    },
  };
}
