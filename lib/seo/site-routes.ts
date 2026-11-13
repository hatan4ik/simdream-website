/**
 * The indexable public routes of the site, in one place.
 *
 * `app/sitemap.ts` and the generated `public/llms.txt` (`lib/seo/llms-txt.ts`) both
 * read this list, so a page can never be in one and missing from the other.
 * `tests/unit/route-coverage.test.ts` checks that every `app/(public)` page is either
 * listed here or explicitly `noindex`. Blog articles are added from the corpus
 * (`lib/data/blog-posts`) through `blogPostPath()`, never listed by hand.
 */

import { isBlogSeoLang, resolveShortSlug } from '@/lib/data/blog-short-slugs';

export type SitemapChangeFrequency = 'daily' | 'weekly' | 'monthly';

export interface PublicSiteRoute {
  /** App Router path, `/` for the home page. */
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
  /** Short English label for machine-readable page lists such as llms.txt. */
  labelEn: string;
}

export const PUBLIC_SITE_ROUTES: readonly PublicSiteRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1.0, labelEn: 'Home' },
  { path: '/book', changeFrequency: 'daily', priority: 0.95, labelEn: 'Express Online Booking (calendar, packages and add-ons)' },
  { path: '/experiences', changeFrequency: 'weekly', priority: 0.9, labelEn: 'Experience Flights, Flight Packages and World Route Catalog' },
  { path: '/subscriptions', changeFrequency: 'weekly', priority: 0.9, labelEn: 'Flight Tracks (multi-flight subscription passes)' },
  { path: '/offers', changeFrequency: 'weekly', priority: 0.8, labelEn: 'Offers & Benefits (birthday discount, flight tracks, gift vouchers)' },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.85, labelEn: 'Flight Deck Journal (aviation blog, Hebrew)' },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8, labelEn: 'About Sim Dream and the Customer Flight Experience' },
  { path: '/pro', changeFrequency: 'weekly', priority: 0.9, labelEn: 'Professional Training and Airline Assessment Prep (PRO tiers)' },
  { path: '/ground-school', changeFrequency: 'weekly', priority: 0.85, labelEn: 'FAA and EASA Ground School Theory and Oral Preparation' },
  { path: '/fear-of-flying', changeFrequency: 'weekly', priority: 0.85, labelEn: 'Fear of Flying Course' },
  { path: '/vouchers', changeFrequency: 'weekly', priority: 0.85, labelEn: 'Gift Vouchers and Gift Cards' },
  { path: '/workshops', changeFrequency: 'weekly', priority: 0.85, labelEn: 'Corporate CRM Leadership Workshops' },
  { path: '/contact', changeFrequency: 'weekly', priority: 0.85, labelEn: 'Contact, Map and Arrival Calculator' },
  { path: '/rules', changeFrequency: 'monthly', priority: 0.6, labelEn: 'Facility Rules and Terms (תקנון)' },
  { path: '/privacy-policy', changeFrequency: 'monthly', priority: 0.5, labelEn: 'Privacy and Cookie Policy (מדיניות פרטיות)' },
];

/**
 * Canonical short path of a blog article:
 * - Hebrew (`he`): `/post/<shortSlug>`
 * - Other languages (`en`, `ru`, `fr`, `es`, `ar`, `de`): `/post/<lang>/<shortSlug>`
 */
export function blogPostPath(slug: string, lang = 'he'): string {
  const shortSlug = resolveShortSlug(slug);
  const encoded = encodeURIComponent(shortSlug);
  if (lang !== 'he' && isBlogSeoLang(lang)) {
    return `/post/${lang}/${encoded}`;
  }
  return `/post/${encoded}`;
}

/** Absolute URL for a site path on the canonical domain (`/` maps to the bare origin). */
export function siteUrl(baseUrl: string, path: string): string {
  return path === '/' ? baseUrl : `${baseUrl}${path}`;
}
