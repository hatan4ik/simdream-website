import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getBlogAuthor } from '@/lib/data/blog-authors';
import type { BlogPost } from '@/lib/data/blog-categories';
import { isBlogSeoLang, type BlogSeoLang } from '@/lib/data/blog-seo';
import { blogPostPath, siteUrl } from './site-routes';

/**
 * JSON-LD for `/post/[slug]` and `/post/[lang]/[slug]`: the `BlogPosting` with a
 * `Person` author from the byline registry and a `BreadcrumbList` (Home → Blog → article)
 * localized to the article's language.
 */

export const BLOG_POST_LANGUAGE = 'he-IL';

export const BLOG_LANGUAGE_LOCALES: Record<BlogSeoLang, string> = {
  he: 'he-IL',
  en: 'en-US',
  ru: 'ru-RU',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar-EG',
};

export const BLOG_BREADCRUMB_LABELS: Record<BlogSeoLang, { home: string; blog: string }> = {
  he: { home: 'ראשי', blog: 'יומן הטיסה' },
  en: { home: 'Home', blog: 'Flight Deck Journal' },
  ru: { home: 'Главная', blog: 'Бортовой журнал' },
  fr: { home: 'Accueil', blog: 'Journal de bord' },
  es: { home: 'Inicio', blog: 'Diario de cabina' },
  ar: { home: 'الرئيسية', blog: 'يومية قمرة القيادة' },
};

/** Backwards-compatible Hebrew breadcrumb labels alias. */
export const BLOG_BREADCRUMB_LABELS_HE = BLOG_BREADCRUMB_LABELS.he;

const BASE_URL = FACILITY_INFO.primaryDomain;

function resolveLang(lang?: string): BlogSeoLang {
  return isBlogSeoLang(lang) ? lang : 'he';
}

export function blogPostCanonicalUrl(
  post: Pick<BlogPost, 'slug' | 'shortSlug' | 'language'>
): string {
  const lang = resolveLang(post.language);
  return siteUrl(BASE_URL, blogPostPath(post.shortSlug || post.slug, lang));
}

/** `Person` entity for the post's byline; `sameAs` lists only official Sim Dream profiles. */
export function buildBlogAuthorJsonLd(post: Pick<BlogPost, 'authorId'>) {
  const author = getBlogAuthor(post.authorId);
  return {
    '@type': 'Person',
    '@id': `${author.url}#${author.id}`,
    name: author.nameHe,
    alternateName: author.nameEn,
    jobTitle: author.roleEn,
    description: author.roleHe,
    url: author.url,
    sameAs: [...author.sameAs],
    worksFor: {
      '@type': 'Organization',
      name: FACILITY_INFO.legalNameEn,
      url: BASE_URL,
    },
  };
}

/**
 * `BlogPosting` for the article. `dateModified` is present only when the corpus records a
 * real modification date; mirroring `datePublished` would be a false freshness signal.
 */
export function buildBlogPostingJsonLd(post: BlogPost) {
  const lang = resolveLang(post.language);
  const inLanguage = BLOG_LANGUAGE_LOCALES[lang];
  const canonicalUrl = blogPostCanonicalUrl(post);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [post.coverImage],
    datePublished: post.datePublished,
    ...(post.dateModified ? { dateModified: post.dateModified } : {}),
    inLanguage,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: buildBlogAuthorJsonLd(post),
    publisher: {
      '@type': 'Organization',
      name: 'Sim Dream LTD',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/brand/simdream-logo.png`,
      },
    },
  };
}

/** `BreadcrumbList`: Home → Blog → article title, in the article's language. */
export function buildBlogBreadcrumbJsonLd(
  post: Pick<BlogPost, 'slug' | 'shortSlug' | 'title' | 'language'>
) {
  const lang = resolveLang(post.language);
  const inLanguage = BLOG_LANGUAGE_LOCALES[lang];
  const labels = BLOG_BREADCRUMB_LABELS[lang];
  const trail = [
    { name: labels.home, item: siteUrl(BASE_URL, '/') },
    { name: labels.blog, item: siteUrl(BASE_URL, '/blog') },
    { name: post.title, item: blogPostCanonicalUrl(post) },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    inLanguage,
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}
