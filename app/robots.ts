import type { MetadataRoute } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = FACILITY_INFO.primaryDomain;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Prefix rules: '/admin' also covers the bare /admin dashboard root ('/admin/' did not).
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'Google-Extended',
          'PerplexityBot',
          'ClaudeBot',
          'Applebot-Extended',
        ],
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

