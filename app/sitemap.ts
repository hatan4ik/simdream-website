import type { MetadataRoute } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { PUBLIC_SITE_ROUTES, blogPostPath, siteUrl } from '@/lib/seo/site-routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = FACILITY_INFO.primaryDomain;
  const now = new Date();

  // The static route list is shared with the generated llms.txt (lib/seo/site-routes.ts).
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITE_ROUTES.map((route) => ({
    url: siteUrl(baseUrl, route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: siteUrl(baseUrl, blogPostPath(post.slug)),
    lastModified: new Date(post.dateModified ?? post.datePublished),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
