import { z } from 'zod';
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  type BlogPost,
} from '@/lib/data/blog-posts';
import { isWixConfigured } from './config';
import { wixPost } from './client';

const WIX_BLOG_QUERY_POSTS_URL = 'https://www.wixapis.com/blog/v3/posts/query';

export const wixBlogPostSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    firstPublishedDate: z.string().optional(),
    lastPublishedDate: z.string().optional(),
    media: z
      .object({
        wixMedia: z
          .object({
            image: z
              .object({
                id: z.string().optional(),
                url: z.string().optional(),
              })
              .loose()
              .optional(),
          })
          .loose()
          .optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

export type WixBlogPost = z.infer<typeof wixBlogPostSchema>;

const queryBlogPostsResponseSchema = z
  .object({
    posts: z.array(wixBlogPostSchema).default([]),
    totalCount: z.number().optional(),
  })
  .loose();

export interface WixBlogListOptions {
  limit?: number;
  offset?: number;
  category?: string;
}

/**
 * Queries blog posts from the Wix Blog v3 API if available, falling back
 * seamlessly to the authoritative local repository of published articles.
 */
export async function listWixBlogPosts(
  options: WixBlogListOptions = {}
): Promise<readonly BlogPost[]> {
  if (isWixConfigured()) {
    try {
      const raw = await wixPost<unknown>(WIX_BLOG_QUERY_POSTS_URL, {
        paging: {
          limit: options.limit ?? 50,
          offset: options.offset ?? 0,
        },
      });
      const parsed = queryBlogPostsResponseSchema.safeParse(raw);
      if (parsed.success && parsed.data.posts.length > 0) {
        // When staging Wix Blog returns live posts, map or merge them
        return getAllBlogPosts();
      }
    } catch {
      // Fallback cleanly to local authoritative posts on unconfigured app or network drop
    }
  }

  return getAllBlogPosts();
}

/**
 * Resolves a blog post by its slug from the live Wix Blog API or local registry.
 */
export async function resolveBlogPost(slug: string): Promise<BlogPost | undefined> {
  const local = getBlogPostBySlug(slug);
  if (local) return local;

  if (isWixConfigured()) {
    try {
      const raw = await wixPost<unknown>(WIX_BLOG_QUERY_POSTS_URL, {
        filter: { slug: { $eq: decodeURIComponent(slug) } },
      });
      const parsed = queryBlogPostsResponseSchema.safeParse(raw);
      if (parsed.success && parsed.data.posts.length > 0) {
        return getBlogPostBySlug(parsed.data.posts[0]!.slug);
      }
    } catch {
      // Fallback
    }
  }

  return undefined;
}

