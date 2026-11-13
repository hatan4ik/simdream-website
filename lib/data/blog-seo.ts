import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FACILITY_INFO } from '@/lib/config/facility-info';
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

const LANG_BASE_KEYWORDS: Record<BlogSeoLang, readonly [string, string, string]> = {
  he: ['SimDream', 'סימולטור טיסה', 'בואינג 737'],
  en: ['SimDream', 'Boeing 737 simulator', 'flight training'],
  ru: ['SimDream', 'авиасимулятор', 'Боинг 737'],
  fr: ['SimDream', 'simulateur de vol', 'Boeing 737'],
  es: ['SimDream', 'simulador de vuelo', 'Boeing 737'],
  ar: ['SimDream', 'محاكي طيران', 'بوينغ 737'],
  de: ['SimDream', 'Flugsimulator', 'Boeing 737'],
};

const PUBLIC_SEO_JSON_RELATIVE = ['public', 'data', 'blog-seo.json'] as const;
let cachedSeoData: CompactSeoByTid | null = null;
let inflightLoad: Promise<CompactSeoByTid | null> | null = null;

function buildKeywords(lang: BlogSeoLang, shortSlug: string): string[] {
  return [...LANG_BASE_KEYWORDS[lang], shortSlug.replace(/-/g, ' ')];
}

function loadFromDiskSync(): CompactSeoByTid | null {
  if (cachedSeoData) return cachedSeoData;
  try {
    const filePath = path.join(process.cwd(), ...PUBLIC_SEO_JSON_RELATIVE);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as CompactSeoByTid;
    cachedSeoData = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadBlogSeoData(): Promise<CompactSeoByTid | null> {
  if (cachedSeoData) return cachedSeoData;
  if (inflightLoad) return inflightLoad;

  inflightLoad = (async (): Promise<CompactSeoByTid | null> => {
    try {
      const filePath = path.join(process.cwd(), ...PUBLIC_SEO_JSON_RELATIVE);
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as CompactSeoByTid;
      cachedSeoData = parsed;
      return parsed;
    } catch {
      // Worker runtime without local public/ filesystem access: fetch from static assets.
    }

    try {
      const res = await fetch(`${FACILITY_INFO.primaryDomain}/data/blog-seo.json`, {
        cache: 'force-cache',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      const parsed = (await res.json()) as CompactSeoByTid;
      cachedSeoData = parsed;
      return parsed;
    } catch {
      return null;
    } finally {
      inflightLoad = null;
    }
  })();

  return inflightLoad;
}

function buildRecord(
  data: CompactSeoByTid,
  tid: string,
  shortSlug: string
): BlogSeoPostRecord | undefined {
  const entry = data[tid];
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

export async function getAllBlogSeoRecords(): Promise<readonly BlogSeoPostRecord[]> {
  const data = await loadBlogSeoData();
  if (!data) return [];
  const records: BlogSeoPostRecord[] = [];
  for (const [tid, shortSlug] of Object.entries(SHORT_SLUG_BY_TID)) {
    const rec = buildRecord(data, tid, shortSlug);
    if (rec) records.push(rec);
  }
  return records;
}

export async function getBlogSeoBySlugOrId(slugOrId: string | undefined): Promise<{
  record: BlogSeoPostRecord;
  language?: BlogSeoLang;
  isLegacy: boolean;
} | undefined> {
  const match = getShortSlugMatch(slugOrId);
  if (!match) return undefined;
  const data = await loadBlogSeoData();
  if (!data) return undefined;
  const rec = buildRecord(data, match.translationId, match.shortSlug);
  if (!rec) return undefined;
  return { record: rec, language: match.language, isLegacy: match.isLegacy };
}

function pickLocalized(
  data: CompactSeoByTid | null,
  slugOrId: string | undefined,
  lang: string | undefined = 'he'
): LocalizedBlogSeo | undefined {
  if (!data) return undefined;
  const match = getShortSlugMatch(slugOrId);
  if (!match) return undefined;
  const resolvedLang: BlogSeoLang = isBlogSeoLang(lang) ? lang : 'he';
  const entry = data[match.translationId]?.[resolvedLang];
  if (!entry) return undefined;
  const [metaTitle, metaDescription] = entry;
  return {
    shortSlug: match.shortSlug,
    metaTitle,
    metaDescription,
    keywords: buildKeywords(resolvedLang, match.shortSlug),
  };
}

export async function getLocalizedBlogSeo(
  slugOrId: string | undefined,
  lang: string | undefined = 'he'
): Promise<LocalizedBlogSeo | undefined> {
  const data = await loadBlogSeoData();
  return pickLocalized(data, slugOrId, lang);
}

/** Synchronous Node-only helper for build-time generators (`llms-txt.ts`). */
export function getLocalizedBlogSeoSync(
  slugOrId: string | undefined,
  lang: string | undefined = 'he'
): LocalizedBlogSeo | undefined {
  return pickLocalized(loadFromDiskSync(), slugOrId, lang);
}
