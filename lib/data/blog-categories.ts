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
  language?: string;
  translationId?: string;
  siblingSlugs?: Record<string, string>;
  shortSlug?: string;
  canonicalPath?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  /** False when a non-Hebrew post fell back to the local Hebrew body copy. */
  hasTranslatedBody?: boolean;
}

export interface BlogCategoryMeta {
  id: BlogCategory;
  labelHe: string;
  labelEn: string;
  labelRu: string;
  labelFr: string;
  labelEs: string;
  labelAr: string;
  labelDe: string;
  descriptionHe: string;
  badgeColor: string;
}

export const BLOG_CATEGORIES: readonly BlogCategoryMeta[] = [
  {
    id: 'airline_prep',
    labelHe: 'הכנה למיונים ו-ATPL',
    labelEn: 'Airline Screening & ATPL',
    labelRu: 'Подготовка к собеседованиям и ATPL',
    labelFr: 'Sélection compagnie & ATPL',
    labelEs: 'Preparación para aerolíneas y ATPL',
    labelAr: 'التحضير لاختبارات الطيران وATPL',
    labelDe: 'Airline-Assessment & ATPL',
    descriptionHe: 'מדריכים מעשיים להכנה למיוני טייס בחברות תעופה, תכנות FMC ונהלי קוקפיט.',
    badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  },
  {
    id: 'cockpit_skills',
    labelHe: 'תא הטייס ואתגרי טיסה',
    labelEn: 'Cockpit Skills & Challenges',
    labelRu: 'Навыки пилотирования и испытания',
    labelFr: 'Compétences cockpit & défis',
    labelEs: 'Habilidades de cabina y desafíos',
    labelAr: 'مهارات قمرة القيادة وتحديات الطيران',
    labelDe: 'Cockpit-Skills & Herausforderungen',
    descriptionHe: 'גישות מורכבות, נחיתות רוח צד, שדות תעופה מאתגרים בעולם ומערכות בואינג 737.',
    badgeColor: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
  {
    id: 'gifts_and_events',
    labelHe: 'מתנות, זוגיות ואירועים',
    labelEn: 'Gifts & Unique Experiences',
    labelRu: 'Подарки и уникальные события',
    labelFr: 'Cadeaux et événements uniques',
    labelEs: 'Regalos y experiencias únicas',
    labelAr: 'الهدايا والفعاليات المميزة',
    labelDe: 'Geschenke & besondere Erlebnisse',
    descriptionHe: 'רעיונות למתנות יום הולדת, דייטים בלתי נשכחים ופעילויות גיבוש יוקרתיות.',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  {
    id: 'fear_of_flying',
    labelHe: 'התמודדות עם פחד טיסה',
    labelEn: 'Fear of Flying Coaching',
    labelRu: 'Преодоление аэрофобии',
    labelFr: 'Surmonter la peur de voler',
    labelEs: 'Superar el miedo a volar',
    labelAr: 'التغلب على الخوف من الطيران',
    labelDe: 'Flugangst überwinden',
    descriptionHe: 'הסברים מרגיעים מהקוקפיט וכלים מעשיים להתגברות על חרדת טיסה.',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    id: 'aviation_knowledge',
    labelHe: 'ידע תעופתי ומערכות',
    labelEn: 'Aviation Knowledge',
    labelRu: 'Авиационные знания и системы',
    labelFr: 'Connaissances aéronautiques & systèmes',
    labelEs: 'Conocimientos aeronáuticos y sistemas',
    labelAr: 'المعرفة وأنظمة الطيران',
    labelDe: 'Luftfahrtwissen & Systeme',
    descriptionHe: 'מערכות בואינג 737, השוואות תעופתיות ומה קורה באמת מאחורי דלת תא הטייס.',
    badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
] as const;

export function getBlogCategoryLabel(category: BlogCategory, lang = 'he'): string {
  const meta = BLOG_CATEGORIES.find((c) => c.id === category);
  if (!meta) return '';
  switch (lang) {
    case 'en':
      return meta.labelEn;
    case 'ru':
      return meta.labelRu;
    case 'fr':
      return meta.labelFr;
    case 'es':
      return meta.labelEs;
    case 'ar':
      return meta.labelAr;
    case 'de':
      return meta.labelDe;
    case 'he':
    default:
      return meta.labelHe;
  }
}
