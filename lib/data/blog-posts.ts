import blogPostsData from './blog-posts.json';

export type BlogCategory =
  | 'airline_prep'
  | 'cockpit_skills'
  | 'gifts_and_events'
  | 'fear_of_flying'
  | 'aviation_knowledge';

export type BlogCtaTarget =
  | 'pro'
  | 'experiences'
  | 'vouchers'
  | 'fear_of_flying'
  | 'general_booking';

export interface BlogContentHeadingNode {
  type: 'heading';
  level: 2 | 3;
  text: string;
}

export interface BlogContentParagraphNode {
  type: 'paragraph';
  text: string;
}

export interface BlogContentListNode {
  type: 'list';
  items: string[];
}

export type BlogContentNode =
  | BlogContentHeadingNode
  | BlogContentParagraphNode
  | BlogContentListNode;

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  datePublished: string;
  readingTimeMinutes: number;
  category: BlogCategory;
  ctaTarget: BlogCtaTarget;
  contentNodes: BlogContentNode[];
}

export interface BlogCategoryMeta {
  id: BlogCategory;
  labelHe: string;
  labelEn: string;
  descriptionHe: string;
  badgeColor: string;
}

export const BLOG_CATEGORIES: readonly BlogCategoryMeta[] = [
  {
    id: 'airline_prep',
    labelHe: 'הכנה למיונים ו-ATPL',
    labelEn: 'Airline Screening & ATPL',
    descriptionHe: 'מדריכים מעשיים להכנה למיוני טייס בחברות תעופה, תכנות FMC ונהלי קוקפיט.',
    badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  },
  {
    id: 'cockpit_skills',
    labelHe: 'תא הטייס ואתגרי טיסה',
    labelEn: 'Cockpit Skills & Challenges',
    descriptionHe: 'גישות מורכבות, נחיתות רוח צד, שדות תעופה מאתגרים בעולם ומערכות בואינג 737.',
    badgeColor: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
  {
    id: 'gifts_and_events',
    labelHe: 'מתנות, זוגיות ואירועים',
    labelEn: 'Gifts & Unique Experiences',
    descriptionHe: 'רעיונות למתנות יום הולדת, דייטים בלתי נשכחים ופעילויות גיבוש יוקרתיות.',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  {
    id: 'fear_of_flying',
    labelHe: 'התמודדות עם פחד טיסה',
    labelEn: 'Fear of Flying Coaching',
    descriptionHe: 'הסברים מרגיעים מהקוקפיט וכלים מעשיים להתגברות על חרדת טיסה.',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    id: 'aviation_knowledge',
    labelHe: 'ידע תעופתי ומערכות',
    labelEn: 'Aviation Knowledge',
    descriptionHe: 'מערכות בואינג 737, השוואות תעופתיות ומה קורה באמת מאחורי דלת תא הטייס.',
    badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
] as const;

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

