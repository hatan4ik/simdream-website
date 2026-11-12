import type { MetadataRoute } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { BLOG_SEO_LANGS, resolveShortSlug } from '@/lib/data/blog-seo';
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

  const blogEntries: MetadataRoute.Sitemap = getAllBlogPosts().flatMap((post) => {
    const shortSlug = resolveShortSlug(post.slug);
    const lastModified = new Date(post.dateModified ?? post.datePublished);
    const heUrl = siteUrl(baseUrl, blogPostPath(shortSlug, 'he'));
    const languages: Record<string, string> = {};
    for (const lang of BLOG_SEO_LANGS) {
      languages[lang] = siteUrl(baseUrl, blogPostPath(shortSlug, lang));
    }
    languages['x-default'] = heUrl;

    return BLOG_SEO_LANGS.map((lang) => ({
      url: siteUrl(baseUrl, blogPostPath(shortSlug, lang)),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: lang === 'he' ? 0.7 : 0.65,
      alternates: { languages },
    }));
  });

  return [...staticEntries, ...blogEntries];
}
