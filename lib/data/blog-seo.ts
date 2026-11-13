import blogSeoCompactData from './blog-seo.json';
import { getShortSlugMatch } from './blog-legacy-slugs';
import {
  BLOG_SEO_LANGS,
  SHORT_SLUG_BY_TID,
  isBlogSeoLang,
  resolveShortSlug,
  type BlogSeoLang,
} from './blog-short-slugs';

export { BLOG_SEO_LANGS, isBlogSeoLang, resolveShortSlug, type BlogSeoLang };

export interface LocalizedBlogSeo {
  shortSlug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

export interface BlogSeoPostRecord {
  translationId: string;
  shortSlug: string;
  locales: Record<BlogSeoLang, LocalizedBlogSeo>;
}

type CompactLocaleTuple = [string, string];
type CompactSeoByTid = Record<string, Record<BlogSeoLang, CompactLocaleTuple>>;

const COMPACT_SEO = blogSeoCompactData as unknown as CompactSeoByTid;

const LANG_BASE_KEYWORDS: Record<BlogSeoLang, readonly [string, string, string]> = {
  he: ['SimDream', 'סימולטור טיסה', 'בואינג 737'],
  en: ['SimDream', 'Boeing 737 simulator', 'flight training'],
  ru: ['SimDream', 'авиасимулятор', 'Боинг 737'],
  fr: ['SimDream', 'simulateur de vol', 'Boeing 737'],
  es: ['SimDream', 'simulador de vuelo', 'Boeing 737'],
  ar: ['SimDream', 'محاكي طيران', 'بوينغ 737'],
};

function buildKeywords(lang: BlogSeoLang, shortSlug: string): string[] {
  return [...LANG_BASE_KEYWORDS[lang], shortSlug.replace(/-/g, ' ')];
}

function buildRecord(tid: string, shortSlug: string): BlogSeoPostRecord | undefined {
  const entry = COMPACT_SEO[tid];
  if (!entry) return undefined;
  const locales = {} as Record<BlogSeoLang, LocalizedBlogSeo>;
  for (const lang of BLOG_SEO_LANGS) {
    const [metaTitle, metaDescription] = entry[lang];
    locales[lang] = {
      shortSlug,
      metaTitle,
      metaDescription,
      keywords: buildKeywords(lang, shortSlug),
    };
  }
  return { translationId: tid, shortSlug, locales };
}

export function getAllBlogSeoRecords(): readonly BlogSeoPostRecord[] {
  const records: BlogSeoPostRecord[] = [];
  for (const [tid, shortSlug] of Object.entries(SHORT_SLUG_BY_TID)) {
    const rec = buildRecord(tid, shortSlug);
    if (rec) records.push(rec);
  }
  return records;
}

export function getBlogSeoBySlugOrId(slugOrId: string | undefined): {
  record: BlogSeoPostRecord;
  language?: BlogSeoLang;
  isLegacy: boolean;
} | undefined {
  const match = getShortSlugMatch(slugOrId);
  if (!match) return undefined;
  const rec = buildRecord(match.translationId, match.shortSlug);
  if (!rec) return undefined;
  return { record: rec, language: match.language, isLegacy: match.isLegacy };
}

export function getLocalizedBlogSeo(
  slugOrId: string | undefined,
  lang: string | undefined = 'he'
): LocalizedBlogSeo | undefined {
  const match = getShortSlugMatch(slugOrId);
  if (!match) return undefined;
  const resolvedLang: BlogSeoLang = isBlogSeoLang(lang) ? lang : 'he';
  const entry = COMPACT_SEO[match.translationId]?.[resolvedLang];
  if (!entry) return undefined;
  const [metaTitle, metaDescription] = entry;
  return {
    shortSlug: match.shortSlug,
    metaTitle,
    metaDescription,
    keywords: buildKeywords(resolvedLang, match.shortSlug),
  };
}
