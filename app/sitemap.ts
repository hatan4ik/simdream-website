import type { MetadataRoute } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getAllBlogPosts } from '@/lib/data/blog-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = FACILITY_INFO.primaryDomain;
  const now = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly' | 'monthly';
    priority: number;
  }> = [
    { path: '', changeFrequency: 'daily', priority: 1.0 },
    { path: '/book', changeFrequency: 'daily', priority: 0.95 },
    { path: '/experiences', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/subscriptions', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/pro', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/fear-of-flying', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/vouchers', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/workshops', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/contact', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/rules', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy-policy', changeFrequency: 'monthly', priority: 0.5 },
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${baseUrl}/post/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.datePublished),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
