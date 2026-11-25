/**
 * Pure logic of the live Wix blog language contract (`npm run wix:check-blog-languages`).
 *
 * The contract: for every translation group and every blog language, the live Wix Blog API holds
 * exactly one post with the group's slug in that language. The script sends the queries and hands
 * the raw outcomes to `evaluateBlogLanguageContract`, which has no I/O and is unit-tested with fake
 * responses (tests/unit/wix-blog-language-contract.test.ts).
 *
 * Operators are the verified ones (docs/modules/blog-language.md): `slug $eq` and `slug $in` are
 * accepted, `slug $hasSome` answers HTTP 400.
 */

/** `translationId` -> slug per language, as in `lib/data/blog-slug-map.json` (`byTranslationId`). */
export type BlogLanguageGroups = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

export interface BlogPostQueryBody {
  query: { filter: Record<string, unknown>; cursorPaging?: { limit: number } };
  fieldsets: string[];
}

/** The body `resolveBlogPost` sends for one slug and one language. */
export function buildExactQueryBody(slug: string, language: string): BlogPostQueryBody {
  return {
    query: { filter: { slug: { $eq: slug }, language: { $eq: language } } },
    fieldsets: ['URL'],
  };
}

/** One request per language for many slugs (`$in`), with room for every group on one page. */
export function buildBatchQueryBody(slugs: readonly string[], language: string, limit = 100): BlogPostQueryBody {
  return {
    query: {
      filter: { slug: { $in: [...slugs] }, language: { $eq: language } },
      cursorPaging: { limit },
    },
    fieldsets: ['URL'],
  };
}

export interface PlannedQuery {
  language: string;
  slugs: string[];
}

function slugOf(group: Readonly<Record<string, unknown>> | undefined, language: string): string | undefined {
  const value = group?.[language];
  return typeof value === 'string' && value ? value : undefined;
}

/** One batch per language, listing every group's slug in that language. */
export function planQueries(groups: BlogLanguageGroups, languages: readonly string[]): PlannedQuery[] {
  return languages.map((language) => ({
    language,
    slugs: Object.values(groups).flatMap((group) => {
      const slug = slugOf(group, language);
      return slug ? [slug] : [];
    }),
  }));
}

export interface LanguageCheck {
  translationId: string;
  language: string;
  slug: string | undefined;
}

export function buildLanguageChecks(groups: BlogLanguageGroups, languages: readonly string[]): LanguageCheck[] {
  return Object.entries(groups).flatMap(([translationId, group]) =>
    languages.map((language) => ({ translationId, language, slug: slugOf(group, language) }))
  );
}

export interface BlogQueryPost {
  slug?: string;
  language?: string;
}

/** What one request returned: `status` 0 means the request never got an answer. */
export interface BlogQueryOutcome {
  language: string;
  slugs: readonly string[];
  status: number;
  posts: readonly BlogQueryPost[];
  errorBody?: string;
  /** More pages exist than were read, so absence cannot be proven. */
  truncated?: boolean;
  /** An exact-body request (one slug), as opposed to a batch. */
  probe?: boolean;
}

export type ContractIssueKind =
  | 'missing'
  | 'wrong-language'
  | 'duplicate'
  | 'http-error'
  | 'truncated'
  | 'no-slug'
  | 'not-checked';

export interface ContractIssue {
  kind: ContractIssueKind;
  language: string;
  detail: string;
  translationId?: string;
  slug?: string;
  status?: number;
}

export interface ContractReport {
  ok: boolean;
  checks: LanguageCheck[];
  issues: ContractIssue[];
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

export function evaluateBlogLanguageContract(
  groups: BlogLanguageGroups,
  languages: readonly string[],
  outcomes: readonly BlogQueryOutcome[]
): ContractReport {
  const checks = buildLanguageChecks(groups, languages);
  const issues = new Map<string, ContractIssue>();
  const add = (key: string, issue: ContractIssue) => {
    if (!issues.has(key)) issues.set(key, issue);
  };
  const answered = new Set<string>();

  for (const outcome of outcomes) {
    const kind = outcome.probe ? 'exact query' : 'batch query';
    if (!isSuccess(outcome.status)) {
      const body = (outcome.errorBody ?? '').slice(0, 200);
      add(`http:${outcome.language}:${outcome.status}:${outcome.probe ? 'p' : 'b'}`, {
        kind: 'http-error',
        language: outcome.language,
        status: outcome.status,
        detail: `${kind} for ${outcome.language} (${outcome.slugs.length} slug(s)) answered HTTP ${outcome.status}${body ? `: ${body}` : ''}`,
      });
    } else if (outcome.truncated) {
      add(`truncated:${outcome.language}`, {
        kind: 'truncated',
        language: outcome.language,
        detail: `${kind} for ${outcome.language} has more pages than were read`,
      });
    }
    for (const slug of outcome.slugs) answered.add(`${outcome.language}\n${slug}`);
    if (!isSuccess(outcome.status) || outcome.truncated) continue;

    for (const check of checks) {
      if (check.language !== outcome.language || !check.slug || !outcome.slugs.includes(check.slug)) continue;
      const sameSlug = outcome.posts.filter((post) => post.slug === check.slug);
      const right = sameSlug.filter((post) => post.language === check.language);
      const wrong = sameSlug.filter((post) => post.language !== check.language);
      const base = { language: check.language, translationId: check.translationId, slug: check.slug };
      if (right.length > 1) {
        add(`duplicate:${check.translationId}:${check.language}`, {
          ...base,
          kind: 'duplicate',
          detail: `${right.length} posts share slug "${check.slug}" in ${check.language}`,
        });
      } else if (right.length === 0 && wrong.length > 0) {
        const found = wrong.map((post) => post.language ?? 'no language').join(', ');
        add(`wrong:${check.translationId}:${check.language}`, {
          ...base,
          kind: 'wrong-language',
          detail: `slug "${check.slug}" asked for ${check.language} but the post is in ${found}`,
        });
      } else if (right.length === 0) {
        add(`missing:${check.translationId}:${check.language}`, {
          ...base,
          kind: 'missing',
          detail: `no ${check.language} post with slug "${check.slug}"`,
        });
      }
    }
  }

  for (const check of checks) {
    const base = { language: check.language, translationId: check.translationId };
    if (!check.slug) {
      add(`noslug:${check.translationId}:${check.language}`, {
        ...base,
        kind: 'no-slug',
        detail: `the slug map has no ${check.language} slug for this group`,
      });
    } else if (!answered.has(`${check.language}\n${check.slug}`)) {
      add(`unchecked:${check.translationId}:${check.language}`, {
        ...base,
        slug: check.slug,
        kind: 'not-checked',
        detail: `no request covered ${check.language} slug "${check.slug}"`,
      });
    }
  }

  const list = [...issues.values()];
  return { ok: list.length === 0, checks, issues: list };
}

export interface ContractSummary {
  groups: number;
  languages: number;
  checks: number;
  groupsComplete: number;
  /** Groups for which no language has a post at all. */
  missingGroups: string[];
}

export function summarizeContract(report: ContractReport): ContractSummary {
  const ids = [...new Set(report.checks.map((check) => check.translationId))];
  const languages = new Set(report.checks.map((check) => check.language));
  const withIssue = new Set(
    report.issues.flatMap((issue) => (issue.translationId ? [issue.translationId] : []))
  );
  const missingGroups = ids.filter((id) => {
    const own = report.checks.filter((check) => check.translationId === id).length;
    const missing = report.issues.filter((i) => i.translationId === id && i.kind === 'missing').length;
    return own > 0 && missing === own;
  });
  return {
    groups: ids.length,
    languages: languages.size,
    checks: report.checks.length,
    groupsComplete: ids.filter((id) => !withIssue.has(id)).length,
    missingGroups,
  };
}
