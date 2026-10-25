import type { MetadataRoute } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';

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
    { path: '/pro', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/vouchers', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/workshops', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/contact', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/rules', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy-policy', changeFrequency: 'monthly', priority: 0.5 },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

