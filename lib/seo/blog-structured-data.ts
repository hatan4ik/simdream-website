import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getBlogAuthor } from '@/lib/data/blog-authors';
import type { BlogPost } from '@/lib/data/blog-categories';
import { blogPostPath, siteUrl } from './site-routes';

/**
 * JSON-LD for `/post/[slug]`: the `BlogPosting` with a `Person` author from the
 * byline registry and a `BreadcrumbList` (Home → Blog → article). The article pages
 * are Hebrew (`inLanguage: he-IL`), so the breadcrumb names are the Hebrew labels the
 * visible breadcrumb prints; the page imports them from here so the two never differ.
 */

export const BLOG_POST_LANGUAGE = 'he-IL';

/** Labels of the visible breadcrumb on the article page and of the `BreadcrumbList`. */
export const BLOG_BREADCRUMB_LABELS_HE = {
  home: 'ראשי',
  blog: 'יומן הטיסה',
} as const;

const BASE_URL = FACILITY_INFO.primaryDomain;

export function blogPostCanonicalUrl(post: Pick<BlogPost, 'slug'>): string {
  return siteUrl(BASE_URL, blogPostPath(post.slug));
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
  const canonicalUrl = blogPostCanonicalUrl(post);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage],
    datePublished: post.datePublished,
    ...(post.dateModified ? { dateModified: post.dateModified } : {}),
    inLanguage: BLOG_POST_LANGUAGE,
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
export function buildBlogBreadcrumbJsonLd(post: Pick<BlogPost, 'slug' | 'title'>) {
  const trail = [
    { name: BLOG_BREADCRUMB_LABELS_HE.home, item: siteUrl(BASE_URL, '/') },
    { name: BLOG_BREADCRUMB_LABELS_HE.blog, item: siteUrl(BASE_URL, '/blog') },
    { name: post.title, item: blogPostCanonicalUrl(post) },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    inLanguage: BLOG_POST_LANGUAGE,
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}
