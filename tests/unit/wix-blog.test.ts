import { describe, expect, it } from 'vitest';
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostsByCategory,
  getFeaturedBlogPosts,
  getRelatedBlogPosts,
  BLOG_CATEGORIES,
} from '@/lib/data/blog-posts';
import { listWixBlogPosts, resolveBlogPost } from '@/lib/wix/blog';

describe('Wix Headless Blog System & 39-Article Content Engine', () => {
  it('loads all 39 published aviation articles with complete metadata', () => {
    const posts = getAllBlogPosts();
    expect(posts).toHaveLength(39);

    for (const post of posts) {
      expect(post.id).toBeDefined();
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(post.coverImage).toMatch(/^https?:\/\//);
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(post.contentNodes.length).toBeGreaterThan(0);
      expect(['airline_prep', 'cockpit_skills', 'gifts_and_events', 'fear_of_flying', 'aviation_knowledge']).toContain(
        post.category
      );
    }
  });

  it('resolves posts by exact Hebrew slug and URI-encoded slug', () => {
    const targetSlug = 'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד';
    const postRaw = getBlogPostBySlug(targetSlug);
    expect(postRaw).toBeDefined();
    expect(postRaw?.slug).toBe(targetSlug);
    expect(postRaw?.category).toBe('airline_prep');

    const postEncoded = getBlogPostBySlug(encodeURIComponent(targetSlug));
    expect(postEncoded).toBeDefined();
    expect(postEncoded?.id).toBe(postRaw?.id);
  });

  it('filters posts across all 5 customer intent categories', () => {
    for (const category of BLOG_CATEGORIES) {
      const posts = getBlogPostsByCategory(category.id);
      expect(posts.length).toBeGreaterThan(0);
      for (const p of posts) {
        expect(p.category).toBe(category.id);
      }
    }
  });

  it('provides featured and related articles excluding the current post', () => {
    const featured = getFeaturedBlogPosts(3);
    expect(featured).toHaveLength(3);

    const firstPost = getAllBlogPosts()[0]!;
    const related = getRelatedBlogPosts(firstPost, 3);
    expect(related).toHaveLength(3);
    expect(related.some((p) => p.id === firstPost.id)).toBe(false);
  });

  it('falls back gracefully to authoritative blog posts when Wix API is in local/test mode', async () => {
    const posts = await listWixBlogPosts();
    expect(posts).toHaveLength(39);

    const resolved = await resolveBlogPost('מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד');
    expect(resolved).toBeDefined();
    expect(resolved?.category).toBe('airline_prep');

    const missing = await resolveBlogPost('non-existent-slug-xyz');
    expect(missing).toBeUndefined();
  });
});

