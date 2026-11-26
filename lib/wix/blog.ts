import {
  getAllBlogPosts,
  getBlogPostBySlug,
  type BlogPost,
  type BlogContentNode,
} from '@/lib/data/blog-posts';
import blogSlugMapData from '@/lib/data/blog-slug-map.json';
import { resolveShortSlug } from '@/lib/data/blog-short-slugs';
import { getShortSlugMatch } from '@/lib/data/blog-legacy-slugs';
import { blogPostPath } from '@/lib/seo/site-routes';
import { isWixConfigured } from './config';
import { UPSTREAM_READ_TIMEOUT_MS } from '@/lib/http/timeouts';
import { wixPost } from './client';
import { queryBlogPostsResponseSchema, wixBlogPostSchema } from './blog-schema';
import type { WixBlogPost } from './blog-schema';

// Re-exported so `lib/wix/index.ts` and its callers keep one import path.
export { wixBlogPostSchema };
export type { WixBlogPost };
import {
  FALLBACK_REASON_NO_POST,
  FALLBACK_REASON_NO_SLUG,
  FALLBACK_REASON_SHAPE,
  describeWixFailure,
  warnBlogFallback,
} from './blog-fallback';

const WIX_BLOG_QUERY_POSTS_URL = 'https://www.wixapis.com/blog/v3/posts/query';

interface BlogSlugMapEntry {
  translationId: string;
  language: string;
}

interface BlogGroupMeta {
  localSlug?: string;
  category?: BlogPost['category'];
  coverImage?: string;
  ctaTarget?: BlogPost['ctaTarget'];
  he?: string;
  en?: string;
  ru?: string;
  fr?: string;
  es?: string;
  ar?: string;
  de?: string;
  [key: string]: unknown;
}

interface BlogSlugMap {
  bySlug: Record<string, BlogSlugMapEntry>;
  byTranslationId: Record<string, BlogGroupMeta>;
}

const blogSlugMap: BlogSlugMap = blogSlugMapData as unknown as BlogSlugMap;

export interface WixBlogListOptions {
  limit?: number;
  category?: string;
  language?: string;
}

function extractSiblingSlugs(group: BlogGroupMeta | undefined): Record<string, string> {
  if (!group) return {};
  const result: Record<string, string> = {};
  for (const lang of ['he', 'en', 'ru', 'fr', 'es', 'ar', 'de'] as const) {
    const s = group[lang];
    if (typeof s === 'string' && s) {
      result[lang] = s;
    }
  }
  // Ensure Hebrew alias fallback if needed
  if (!result.he && group.localSlug) {
    result.he = group.localSlug;
  }
  return result;
}

interface WixRichTextLeaf {
  textData?: { text?: string };
}

interface WixContainerNode {
  type?: string;
  headingData?: { level?: number };
  nodes?: Array<{
    nodes?: WixRichTextLeaf[];
    textData?: { text?: string };
  }>;
}

function convertWixRichContentNodes(wixNodes: unknown): BlogContentNode[] {
  if (!Array.isArray(wixNodes)) return [];
  const result: BlogContentNode[] = [];

  for (const item of wixNodes) {
    if (!item || typeof item !== 'object') continue;
    const node = item as WixContainerNode;
    const type = node.type;
    const subNodes = Array.isArray(node.nodes) ? node.nodes : [];

    if (type === 'HEADING') {
      const headingData = node.headingData || {};
      const level = headingData.level === 3 ? 3 : 2;
      const text = subNodes
        .map((sn) => (sn && typeof sn === 'object' ? sn.textData?.text || '' : ''))
        .join('');
      if (text.trim()) {
        result.push({ type: 'heading', level, text: text.trim() });
      }
    } else if (type === 'PARAGRAPH') {
      const text = subNodes
        .map((sn) => (sn && typeof sn === 'object' ? sn.textData?.text || '' : ''))
        .join('');
      if (text.trim()) {
        result.push({ type: 'paragraph', text });
      }
    } else if (type === 'BULLETED_LIST' || type === 'ORDERED_LIST') {
      const items: string[] = [];
      for (const li of subNodes) {
        if (!li || typeof li !== 'object') continue;
        const liNodes = Array.isArray(li.nodes) ? li.nodes : [];
        const itemText = liNodes
          .map((tn) => (tn && typeof tn === 'object' ? tn.textData?.text || '' : ''))
          .join('');
        if (itemText.trim()) items.push(itemText.trim());
      }
      if (items.length > 0) {
        result.push({ type: 'list', items });
      }
    }
  }

  return result;
}

function extractWixSeo(
  wixPostItem: Pick<WixBlogPost, 'seoData'>
): { seoTitle?: string; seoDescription?: string } {
  const tags = wixPostItem.seoData?.tags ?? [];
  const titleTag = tags.find((t) => t.type === 'title' && typeof t.children === 'string' && t.children.trim());
  const descTag = tags.find(
    (t) => t.type === 'meta' && t.props?.name === 'description' && typeof t.props?.content === 'string'
  );
  const seoTitle = titleTag?.children?.trim() || wixPostItem.seoData?.title?.trim() || undefined;
  const seoDescription =
    (typeof descTag?.props?.content === 'string' ? descTag.props.content.trim() : undefined) ||
    wixPostItem.seoData?.description?.trim() ||
    undefined;

  return { seoTitle, seoDescription };
}

/**
 * Returns all language sibling slugs for a given slug or translationId.
 */
export function getBlogPostSiblings(slugOrTranslationId: string): Record<string, string> {
  const decoded = decodeURIComponent(slugOrTranslationId).trim().toLowerCase();
  const byTrans = blogSlugMap.byTranslationId[slugOrTranslationId];
  if (byTrans) return extractSiblingSlugs(byTrans);

  const entry = blogSlugMap.bySlug[decoded] || blogSlugMap.bySlug[slugOrTranslationId];
  if (entry) {
    const group = blogSlugMap.byTranslationId[entry.translationId];
    if (group) return extractSiblingSlugs(group);
  }

  return {};
}

/**
 * Queries blog posts from the Wix Blog v3 API for the requested language,
 * falling back seamlessly to the authoritative local repository of published articles.
 */
export async function listWixBlogPosts(
  options: WixBlogListOptions = {}
): Promise<readonly BlogPost[]> {
  const targetLang = options.language || 'he';

  if (isWixConfigured()) {
    let fallbackReason: string | undefined;
    try {
      const raw = await wixPost<unknown>(WIX_BLOG_QUERY_POSTS_URL, {
        query: {
          filter: { language: { $eq: targetLang } },
          cursorPaging: {
            limit: options.limit ?? 50,
          },
        },
      }, { timeoutMs: UPSTREAM_READ_TIMEOUT_MS });
      const parsed = queryBlogPostsResponseSchema.safeParse(raw);
      const posts = parsed.success ? parsed.data.posts.filter((post) => post.language === targetLang) : [];
      if (posts.length > 0) {
        return posts.map((p) => {
          const groupMeta = p.translationId ? blogSlugMap.byTranslationId[p.translationId] : undefined;
          const localFallback = groupMeta?.localSlug ? getBlogPostBySlug(groupMeta.localSlug) : undefined;
          const coverImage =
            groupMeta?.coverImage ||
            localFallback?.coverImage ||
            'https://static.wixstatic.com/media/49097a_89df782bcec442a4921ae970d077c0f1~mv2.webp';

          const lang = p.language || targetLang;
          const shortSlug = resolveShortSlug(p.translationId || p.slug);
          const seo = extractWixSeo(p);
          return {
            id: p.id,
            slug: p.slug,
            shortSlug,
            canonicalPath: blogPostPath(shortSlug, lang),
            title: p.title,
            excerpt: p.excerpt || localFallback?.excerpt || '',
            coverImage,
            datePublished: p.firstPublishedDate?.split('T')[0] || localFallback?.datePublished || '2026-11-09',
            readingTimeMinutes: p.minutesToRead || localFallback?.readingTimeMinutes || 5,
            category: groupMeta?.category || localFallback?.category || 'aviation_knowledge',
            ctaTarget: groupMeta?.ctaTarget || localFallback?.ctaTarget || 'general_booking',
            contentNodes: [],
            language: lang,
            translationId: p.translationId,
            siblingSlugs: extractSiblingSlugs(groupMeta),
            ...(seo.seoTitle ? { seoTitle: seo.seoTitle } : {}),
            ...(seo.seoDescription ? { seoDescription: seo.seoDescription } : {}),
            hasTranslatedBody: true,
          };
        });
      }
      fallbackReason = parsed.success ? FALLBACK_REASON_NO_POST : FALLBACK_REASON_SHAPE;
    } catch (error) {
      fallbackReason = describeWixFailure(error);
    }
    warnBlogFallback('list', targetLang, fallbackReason);
  }

  return getAllBlogPosts().map((p) => {
    const entry = blogSlugMap.bySlug[p.slug];
    const group = entry ? blogSlugMap.byTranslationId[entry.translationId] : undefined;
    const shortSlug = resolveShortSlug(entry?.translationId || p.slug);
    return {
      ...p,
      shortSlug,
      canonicalPath: blogPostPath(shortSlug, 'he'),
      language: 'he',
      translationId: entry?.translationId,
      siblingSlugs: extractSiblingSlugs(group),
      hasTranslatedBody: true,
    };
  });
}

/**
 * Resolves a blog post by its shortSlug or legacy slug (in Hebrew or any translated language)
 * from the live Wix Blog API or local registry.
 */
export async function resolveBlogPost(slug: string, requestedLang?: string): Promise<BlogPost | undefined> {
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  const slugEntry = blogSlugMap.bySlug[decoded] || blogSlugMap.bySlug[slug];
  const slugMatch = getShortSlugMatch(slug);
  const targetLang = requestedLang || slugMatch?.language || slugEntry?.language || 'he';
  const matchedTid = slugMatch?.translationId || slugEntry?.translationId;
  const matchedGroup = matchedTid ? blogSlugMap.byTranslationId[matchedTid] : undefined;
  const wixQuerySlug =
    (matchedGroup && typeof matchedGroup[targetLang] === 'string' && matchedGroup[targetLang]) ||
    (targetLang === 'he' && matchedGroup?.localSlug) ||
    decodeURIComponent(slug);

  let wixFallbackReason: string | undefined;
  if (isWixConfigured()) {
    try {
      const raw = await wixPost<unknown>(WIX_BLOG_QUERY_POSTS_URL, {
        query: {
          filter: {
            // `$eq`, not `$hasSome`: Wix answers HTTP 400 to `$hasSome` on a post slug although the Query
            // Posts reference lists it (verified on the live API, 2026-11-24).
            slug: { $eq: wixQuerySlug },
            language: { $eq: targetLang },
          },
        },
        fieldsets: ['URL', 'RICH_CONTENT', 'SEO'],
      }, { timeoutMs: UPSTREAM_READ_TIMEOUT_MS });
      const parsed = queryBlogPostsResponseSchema.safeParse(raw);
      if (parsed.success && parsed.data.posts.length > 0) {
        // Do not let a stale or ignored Wix filter replace a localized route
        // with a different language's content.
        const p = parsed.data.posts.find((post) => post.language === targetLang);
        if (!p) throw new Error('Wix returned no post in the requested language');
        const contentNodes = convertWixRichContentNodes(p.richContent?.nodes);
        const groupMeta = p.translationId ? blogSlugMap.byTranslationId[p.translationId] : matchedGroup;
        const localFallback = groupMeta?.localSlug ? getBlogPostBySlug(groupMeta.localSlug) : undefined;
        const coverImage =
          groupMeta?.coverImage ||
          localFallback?.coverImage ||
          'https://static.wixstatic.com/media/49097a_89df782bcec442a4921ae970d077c0f1~mv2.webp';
        const lang = p.language || targetLang;
        const shortSlug = resolveShortSlug(p.translationId || matchedTid || p.slug);
        const seo = extractWixSeo(p);

        return {
          id: p.id,
          slug: p.slug,
          shortSlug,
          canonicalPath: blogPostPath(shortSlug, lang),
          title: p.title,
          excerpt: p.excerpt || localFallback?.excerpt || '',
          coverImage,
          datePublished: p.firstPublishedDate?.split('T')[0] || localFallback?.datePublished || '2026-11-09',
          dateModified: p.lastPublishedDate?.split('T')[0],
          readingTimeMinutes: p.minutesToRead || localFallback?.readingTimeMinutes || 5,
          category: groupMeta?.category || localFallback?.category || 'aviation_knowledge',
          ctaTarget: groupMeta?.ctaTarget || localFallback?.ctaTarget || 'general_booking',
          authorId: localFallback?.authorId,
          contentNodes: contentNodes.length > 0 ? contentNodes : (localFallback?.contentNodes || []),
          language: lang,
          translationId: p.translationId || matchedTid,
          siblingSlugs: extractSiblingSlugs(groupMeta),
          ...(seo.seoTitle ? { seoTitle: seo.seoTitle } : {}),
          ...(seo.seoDescription ? { seoDescription: seo.seoDescription } : {}),
          hasTranslatedBody: lang === 'he' || contentNodes.length > 0,
        };
      }
      wixFallbackReason = parsed.success ? FALLBACK_REASON_NO_SLUG : FALLBACK_REASON_SHAPE;
    } catch (error) {
      wixFallbackReason = describeWixFailure(error);
    }
  }

  // Local fallback by Hebrew slug or shortSlug/legacySlug translationId:
  const local = getBlogPostBySlug(slug) ?? (matchedGroup?.localSlug ? getBlogPostBySlug(matchedGroup.localSlug) : undefined);
  if (local) {
    // Warn only when a local article is actually served in place of Wix's: an unknown slug is a plain 404.
    if (wixFallbackReason) warnBlogFallback('post', targetLang, wixFallbackReason);
    const entry = blogSlugMap.bySlug[local.slug];
    const tid = matchedTid || entry?.translationId;
    const group = tid ? blogSlugMap.byTranslationId[tid] : undefined;
    const shortSlug = resolveShortSlug(tid || local.slug);
    return {
      ...local,
      slug: slugMatch && !slugMatch.isLegacy ? shortSlug : slug,
      shortSlug,
      canonicalPath: blogPostPath(shortSlug, targetLang),
      language: targetLang,
      translationId: tid,
      siblingSlugs: extractSiblingSlugs(group),
      hasTranslatedBody: targetLang === 'he',
    };
  }

  return undefined;
}
