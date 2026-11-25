/**
 * Live Wix blog language contract (read-only, anonymous visitor).
 *
 * Proves against the LIVE Wix Blog API that every translation group in
 * lib/data/blog-slug-map.json has exactly one post per language of BLOG_SEO_LANGS,
 * found by the same filter `resolveBlogPost` uses (slug and language). Mocks cannot see
 * a rejected operator; this check can (the `$hasSome` incident, docs/DECISIONS.md).
 *
 * Requests: one OAuth token, one `slug $in` batch per language, and one exact-body
 * (`slug $eq`) request per language for the first group, spaced 600 ms apart (under 2 per
 * second). The run stops at the first HTTP 429. Tokens are never printed.
 *
 *   npm run wix:check-blog-languages
 *
 * Exit 0 when every group and language is present, 1 on any finding or HTTP error.
 * @see docs/modules/blog-language.md
 */
import slugMap from '../lib/data/blog-slug-map.json';
import wixManagedProject from '../wix.config.json';
import { BLOG_SEO_LANGS } from '../lib/data/blog-short-slugs';
import {
  buildBatchQueryBody,
  buildExactQueryBody,
  evaluateBlogLanguageContract,
  planQueries,
  summarizeContract,
  type BlogLanguageGroups,
  type BlogPostQueryBody,
  type BlogQueryOutcome,
  type BlogQueryPost,
} from '../lib/wix/blog-language-contract';

const TOKEN_URL = 'https://www.wixapis.com/oauth2/token';
const QUERY_URL = 'https://www.wixapis.com/blog/v3/posts/query';
const PACE_MS = 600;

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function readAppId(): string {
  // The public app id of the Wix Headless project, imported the way lib/wix/config.ts imports it.
  if (typeof wixManagedProject.appId !== 'string' || !wixManagedProject.appId) throw new Error('wix.config.json has no appId');
  return wixManagedProject.appId;
}

async function fetchVisitorToken(clientId: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, grantType: 'anonymous' }),
  });
  if (!response.ok) throw new Error(`anonymous token request answered HTTP ${response.status}`);
  const json = (await response.json()) as { access_token?: unknown };
  if (typeof json.access_token !== 'string') throw new Error('anonymous token response has no access_token');
  return json.access_token;
}

async function runQuery(
  token: string,
  body: BlogPostQueryBody,
  language: string,
  slugs: readonly string[],
  probe: boolean
): Promise<BlogQueryOutcome> {
  try {
    const response = await fetch(QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) return { language, slugs, status: response.status, posts: [], errorBody: text, probe };
    const json = JSON.parse(text) as { posts?: BlogQueryPost[]; pagingMetadata?: { hasNext?: boolean } };
    return {
      language,
      slugs,
      status: response.status,
      posts: Array.isArray(json.posts) ? json.posts : [],
      truncated: json.pagingMetadata?.hasNext === true,
      probe,
    };
  } catch (error) {
    return { language, slugs, status: 0, posts: [], errorBody: error instanceof Error ? error.message : 'request failed', probe };
  }
}

async function main(): Promise<number> {
  const groups = slugMap.byTranslationId as unknown as BlogLanguageGroups;
  const token = await fetchVisitorToken(readAppId());
  const plan = planQueries(groups, BLOG_SEO_LANGS);
  const firstGroup = Object.values(groups)[0];

  const outcomes: BlogQueryOutcome[] = [];
  let stopped = false;
  const send = async (body: BlogPostQueryBody, language: string, slugs: readonly string[], probe: boolean) => {
    if (stopped) return;
    if (outcomes.length > 0) await sleep(PACE_MS);
    const outcome = await runQuery(token, body, language, slugs, probe);
    outcomes.push(outcome);
    if (outcome.status === 429) {
      stopped = true;
      console.error('[wix:blog-languages] HTTP 429 from Wix: stopping the run.');
    }
  };

  for (const query of plan) await send(buildBatchQueryBody(query.slugs, query.language), query.language, query.slugs, false);
  for (const language of BLOG_SEO_LANGS) {
    const slug = firstGroup?.[language];
    if (typeof slug === 'string') await send(buildExactQueryBody(slug, language), language, [slug], true);
  }

  const report = evaluateBlogLanguageContract(groups, BLOG_SEO_LANGS, outcomes);
  const summary = summarizeContract(report);
  console.log(
    `[wix:blog-languages] ${summary.groups} groups x ${summary.languages} languages = ${summary.checks} checks, ` +
      `${outcomes.length} requests, ${summary.groupsComplete}/${summary.groups} groups complete`
  );
  if (summary.missingGroups.length > 0) console.error(`  groups with no post at all: ${summary.missingGroups.join(', ')}`);
  for (const issue of report.issues) {
    console.error(`  FAIL ${issue.kind} ${issue.translationId ?? ''} ${issue.language}: ${issue.detail}`);
  }
  if (!report.ok) {
    console.error('[wix:blog-languages] The live Wix blog does not match the slug map.');
    return 1;
  }
  console.log('[wix:blog-languages] OK: every group has exactly one post per language.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`[wix:blog-languages] ${error instanceof Error ? error.message : 'unexpected failure'}`);
    process.exit(1);
  });
