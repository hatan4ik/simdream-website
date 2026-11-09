import { FACILITY_INFO } from '@/lib/config/facility-info';

/**
 * Blog bylines, the single source for the visible author block on `/post/[slug]` and
 * for the `Person` author in that page's `BlogPosting` JSON-LD (E-E-A-T).
 *
 * The corpus (`blog-posts.json`) carries no per-article author, so every post uses
 * `DEFAULT_BLOG_AUTHOR_ID` until an `authorId` is recorded on it. Add a named captain
 * here (with the owner's confirmation of name and role) rather than typing a byline
 * into a page. `sameAs` points only at the official Sim Dream profiles in
 * `FACILITY_INFO`; never invent personal profiles.
 */

export type BlogAuthorId = 'simdream-captains';

export interface BlogAuthor {
  id: BlogAuthorId;
  /** Byline as printed on the Hebrew article page. */
  nameHe: string;
  /** Same byline in English, emitted as `alternateName`. */
  nameEn: string;
  /** Role line under the byline (Hebrew, as printed). */
  roleHe: string;
  /** Role in English, emitted as `jobTitle` alongside the Hebrew text. */
  roleEn: string;
  /** Public page that describes the author (the customer story page). */
  url: string;
  /** Official profiles for the `Person.sameAs` array. */
  sameAs: readonly string[];
}

export const DEFAULT_BLOG_AUTHOR_ID: BlogAuthorId = 'simdream-captains';

export const BLOG_AUTHORS: Readonly<Record<BlogAuthorId, BlogAuthor>> = {
  'simdream-captains': {
    id: 'simdream-captains',
    nameHe: 'קברניטי וצוות המבצעים | סים דרים',
    nameEn: 'Sim Dream Captains and Operations Team',
    roleHe: 'מרכז הדרכה והדמיית טיסה מסחרית, תל אביב',
    roleEn: 'Active airline captains and Boeing 737 simulator instructors, Tel Aviv',
    url: `${FACILITY_INFO.primaryDomain}/about`,
    sameAs: [
      FACILITY_INFO.social.instagramUrl,
      FACILITY_INFO.social.facebookUrl,
      FACILITY_INFO.social.youtubeUrl,
      FACILITY_INFO.googleMapsUrl,
    ],
  },
};

/** The byline for a post: its recorded `authorId`, or the default Sim Dream byline. */
export function getBlogAuthor(authorId?: BlogAuthorId): BlogAuthor {
  return BLOG_AUTHORS[authorId ?? DEFAULT_BLOG_AUTHOR_ID];
}
