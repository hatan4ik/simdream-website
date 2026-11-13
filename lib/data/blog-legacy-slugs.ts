import blogSlugMapData from './blog-slug-map.json';
import {
  SHORT_SLUG_BY_TID,
  TID_BY_SHORT_SLUG,
  isBlogSeoLang,
  type BlogSeoLang,
} from './blog-short-slugs';

interface RawSlugMap {
  bySlug: Record<string, { translationId: string; language: string }>;
}

const SLUG_MAP = blogSlugMapData as unknown as RawSlugMap;

export interface ShortSlugMatch {
  translationId: string;
  shortSlug: string;
  language?: BlogSeoLang;
  isLegacy: boolean;
}

export function getShortSlugMatch(slugOrId: string | undefined): ShortSlugMatch | undefined {
  if (!slugOrId) return undefined;
  const raw = slugOrId.trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw).trim();
  } catch {
    decoded = raw;
  }
  const lower = decoded.toLowerCase();

  const directShort = SHORT_SLUG_BY_TID[raw];
  if (directShort) {
    return { translationId: raw, shortSlug: directShort, isLegacy: false };
  }

  const tidFromShort = TID_BY_SHORT_SLUG[lower];
  if (tidFromShort) {
    return { translationId: tidFromShort, shortSlug: lower, isLegacy: false };
  }

  const slugEntry =
    SLUG_MAP.bySlug[raw] ??
    SLUG_MAP.bySlug[decoded] ??
    SLUG_MAP.bySlug[lower] ??
    SLUG_MAP.bySlug[raw.toLowerCase()];

  if (slugEntry) {
    const shortSlug = SHORT_SLUG_BY_TID[slugEntry.translationId];
    if (shortSlug) {
      return {
        translationId: slugEntry.translationId,
        shortSlug,
        language: isBlogSeoLang(slugEntry.language) ? slugEntry.language : undefined,
        isLegacy: true,
      };
    }
  }

  return undefined;
}
