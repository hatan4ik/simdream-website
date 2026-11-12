import blogSeoCompactData from './blog-seo.json';
import blogSlugMapData from './blog-slug-map.json';

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

interface CompactLocaleEntry {
  t: string;
  d: string;
  k: string[];
}

interface CompactBlogSeoRecord {
  id: string;
  tid: string;
  s: string;
  c: string;
  l: Record<BlogSeoLang, CompactLocaleEntry>;
}

interface RawSlugMap {
  bySlug: Record<string, { translationId: string; language: string }>;
  byTranslationId: Record<
    string,
    {
      localSlug?: string;
      he?: string;
      en?: string;
      ru?: string;
      fr?: string;
      es?: string;
      ar?: string;
    }
  >;
}

function buildRegistry(): BlogSeoRegistry {
  const compact = blogSeoCompactData as unknown as CompactBlogSeoRecord[];
  const slugMap = blogSlugMapData as unknown as RawSlugMap;

  const byTidAndLang: Record<string, Partial<Record<BlogSeoLang, Set<string>>>> = {};
  const addSlug = (tid: string, lang: BlogSeoLang, raw?: string) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const bucket = (byTidAndLang[tid] ??= {});
    const set = (bucket[lang] ??= new Set<string>());
    set.add(trimmed);
    set.add(trimmed.toLowerCase());
    const encoded = encodeURIComponent(trimmed);
    if (encoded !== trimmed) set.add(encoded);
  };

  for (const [tid, group] of Object.entries(slugMap.byTranslationId)) {
    if (group.localSlug) addSlug(tid, 'he', group.localSlug);
    for (const lang of BLOG_SEO_LANGS) {
      const val = group[lang];
      if (typeof val === 'string') addSlug(tid, lang, val);
    }
  }
  for (const [slugKey, info] of Object.entries(slugMap.bySlug)) {
    if (isBlogSeoLang(info.language)) {
      addSlug(info.translationId, info.language, slugKey);
    }
  }

  const registry: BlogSeoRegistry = {
    version: 1,
    posts: [],
    byTranslationId: {},
    byPostId: {},
    byShortSlug: {},
    byLegacySlug: {},
  };

  for (const item of compact) {
    const locales = {} as Record<BlogSeoLang, LocalizedBlogSeo>;
    for (const lang of BLOG_SEO_LANGS) {
      const entry = item.l[lang];
      const legacySet = byTidAndLang[item.tid]?.[lang];
      const legacySlugs = legacySet ? [...legacySet].filter((s) => s !== item.s) : [];
      for (const leg of legacySlugs) {
        registry.byLegacySlug[leg] = { translationId: item.tid, language: lang };
        registry.byLegacySlug[leg.toLowerCase()] = { translationId: item.tid, language: lang };
      }
      locales[lang] = {
        shortSlug: item.s,
        metaTitle: entry.t,
        metaDescription: entry.d,
        keywords: entry.k,
        legacySlugs,
      };
    }

    const record: BlogSeoPostRecord = {
      postId: item.id,
      translationId: item.tid,
      shortSlug: item.s,
      category: item.c,
      locales,
    };

    registry.posts.push(record);
    registry.byTranslationId[item.tid] = record;
    registry.byPostId[item.id] = record;
    registry.byShortSlug[item.s] = item.tid;
  }

  return registry;
}

const REGISTRY: BlogSeoRegistry = buildRegistry();

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
  let decoded = raw;
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
