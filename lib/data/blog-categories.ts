/**
 * Blog taxonomy and post types, shared by server and client components.
 *
 * This module deliberately carries no post content. `blog-posts.ts` imports the
 * 39-article corpus (`blog-posts.json`); any `'use client'` component that
 * imported it would pull the whole corpus into the browser bundle and, through
 * the SSR layer, duplicate it inside the Wix Worker (which on 2026-11-09 pushed
 * the worker past Wix's upload limit, HTTP 413). Client components import from
 * here only; `tests/security/secrets-hygiene.test.ts` checks the client bundle.
 */

import type { BlogAuthorId } from './blog-authors';

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
  /** ISO date (YYYY-MM-DD) of first publication. */
  datePublished: string;
  /**
   * ISO date of the last substantive edit, when the corpus records one. The JSON-LD
   * emits `dateModified` only from this field; it never mirrors `datePublished`.
   */
  dateModified?: string;
  /** Byline in `lib/data/blog-authors.ts`; the default Sim Dream byline when absent. */
  authorId?: BlogAuthorId;
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
