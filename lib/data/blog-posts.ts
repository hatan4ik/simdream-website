import blogPostsData from './blog-posts.json';
import type { BlogCategory, BlogPost } from './blog-categories';

/**
 * Server-side blog corpus. This module embeds the whole `blog-posts.json`
 * (39 Hebrew articles) in whichever bundle imports it, so only server
 * components, route handlers and scripts may import it. Client components
 * take types and `BLOG_CATEGORIES` from `./blog-categories` instead; the
 * re-exports below keep the server-side import sites unchanged.
 */
export * from './blog-categories';

export const BLOG_POSTS: readonly BlogPost[] = blogPostsData as BlogPost[];

/** Returns all published blog posts in reverse-chronological order. */
export function getAllBlogPosts(): readonly BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

/** Finds a blog post by its raw or URI-encoded slug. */
export function getBlogPostBySlug(slug: string | undefined): BlogPost | undefined {
  if (!slug) return undefined;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  return BLOG_POSTS.find((p) => {
    const postSlug = p.slug.trim().toLowerCase();
    const encodedPostSlug = encodeURIComponent(p.slug).toLowerCase();
    return postSlug === decoded || p.slug === slug || encodedPostSlug === slug.toLowerCase();
  });
}

/** Filters blog posts by category. */
export function getBlogPostsByCategory(category: BlogCategory): readonly BlogPost[] {
  return getAllBlogPosts().filter((p) => p.category === category);
}

/** Gets featured blog posts for highlights and hero spotlight. */
export function getFeaturedBlogPosts(limit = 3): readonly BlogPost[] {
  return getAllBlogPosts().slice(0, limit);
}

/** Gets related posts sharing category or context, excluding the current post. */
export function getRelatedBlogPosts(currentPost: BlogPost, limit = 3): readonly BlogPost[] {
  const sameCategory = getAllBlogPosts().filter(
    (p) => p.id !== currentPost.id && p.category === currentPost.category
  );
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  const others = getAllBlogPosts().filter(
    (p) => p.id !== currentPost.id && p.category !== currentPost.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}
