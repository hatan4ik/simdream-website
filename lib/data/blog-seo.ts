import blogSeoData from './blog-seo.json';

export const BLOG_SEO_LANGS = ['he', 'en', 'ru', 'fr', 'es', 'ar'] as const;
export type BlogSeoLang = (typeof BLOG_SEO_LANGS)[number];

export interface LocalizedBlogSeo {
  shortSlug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  legacySlugs: string[];
}

export interface BlogSeoPostRecord {
  postId: string;
  translationId: string;
  shortSlug: string;
  category: string;
  locales: Record<BlogSeoLang, LocalizedBlogSeo>;
}

export interface BlogSeoRegistry {
  version: number;
  posts: BlogSeoPostRecord[];
  byTranslationId: Record<string, BlogSeoPostRecord>;
  byPostId: Record<string, BlogSeoPostRecord>;
  byShortSlug: Record<string, string>;
  byLegacySlug: Record<string, { translationId: string; language: BlogSeoLang }>;
}

const REGISTRY: BlogSeoRegistry = blogSeoData as unknown as BlogSeoRegistry;

export function isBlogSeoLang(value: string | undefined): value is BlogSeoLang {
  return Boolean(value && (BLOG_SEO_LANGS as readonly string[]).includes(value));
}

export function getBlogSeoRegistry(): BlogSeoRegistry {
  return REGISTRY;
}

export function getAllBlogSeoRecords(): readonly BlogSeoPostRecord[] {
  return REGISTRY.posts;
}

export function getBlogSeoByTranslationId(translationId: string | undefined): BlogSeoPostRecord | undefined {
  if (!translationId) return undefined;
  return REGISTRY.byTranslationId[translationId];
}

export function getBlogSeoByShortSlug(shortSlug: string | undefined): BlogSeoPostRecord | undefined {
  if (!shortSlug) return undefined;
  const tid = REGISTRY.byShortSlug[shortSlug.trim().toLowerCase()];
  return tid ? REGISTRY.byTranslationId[tid] : undefined;
}

export function getBlogSeoBySlugOrId(slugOrId: string | undefined): {
  record: BlogSeoPostRecord;
  language?: BlogSeoLang;
  isLegacy: boolean;
} | undefined {
  if (!slugOrId) return undefined;
  const raw = slugOrId.trim();
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw).trim();
  } catch {
    decoded = raw;
  }
  const lower = decoded.toLowerCase();

  const byPostId = REGISTRY.byPostId[raw];
  if (byPostId) return { record: byPostId, isLegacy: false };

  const byTrans = REGISTRY.byTranslationId[raw];
  if (byTrans) return { record: byTrans, isLegacy: false };

  const tidFromShort = REGISTRY.byShortSlug[lower];
  if (tidFromShort) {
    const rec = REGISTRY.byTranslationId[tidFromShort];
    if (rec) return { record: rec, isLegacy: false };
  }

  const legacy =
    REGISTRY.byLegacySlug[raw] ??
    REGISTRY.byLegacySlug[decoded] ??
    REGISTRY.byLegacySlug[lower] ??
    REGISTRY.byLegacySlug[raw.toLowerCase()];
  if (legacy) {
    const rec = REGISTRY.byTranslationId[legacy.translationId];
    if (rec) return { record: rec, language: legacy.language, isLegacy: true };
  }

  return undefined;
}

export function getLocalizedBlogSeo(
  slugOrId: string | undefined,
  lang: string | undefined = 'he'
): LocalizedBlogSeo | undefined {
  const match = getBlogSeoBySlugOrId(slugOrId);
  if (!match) return undefined;
  const resolvedLang: BlogSeoLang = isBlogSeoLang(lang) ? lang : 'he';
  return match.record.locales[resolvedLang];
}

/**
 * Resolves any known slug (short or legacy) or translationId/postId to the canonical shortSlug.
 * Falls back to the decoded input if it's an unknown live Wix slug.
 */
export function resolveShortSlug(slugOrId: string): string {
  const match = getBlogSeoBySlugOrId(slugOrId);
  if (match) return match.record.shortSlug;
  try {
    return decodeURIComponent(slugOrId).trim();
  } catch {
    return slugOrId.trim();
  }
}
