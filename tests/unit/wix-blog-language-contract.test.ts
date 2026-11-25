import { describe, expect, it } from 'vitest';
import {
  buildBatchQueryBody,
  buildExactQueryBody,
  buildLanguageChecks,
  evaluateBlogLanguageContract,
  planQueries,
  summarizeContract,
  type BlogLanguageGroups,
  type BlogQueryOutcome,
} from '@/lib/wix/blog-language-contract';

const LANGS = ['he', 'en', 'ru'] as const;

const GROUPS: BlogLanguageGroups = {
  'tid-a': { he: 'a-he', en: 'a-en', ru: 'a-ru' },
  'tid-b': { he: 'b-he', en: 'b-en', ru: 'b-ru' },
};

/** A response in which every expected post exists exactly once, in its own language. */
function healthy(lang: string, slugs: readonly string[]): BlogQueryOutcome {
  return {
    language: lang,
    slugs,
    status: 200,
    posts: slugs.map((slug) => ({ slug, language: lang })),
  };
}

function healthyBatches(): BlogQueryOutcome[] {
  return planQueries(GROUPS, LANGS).map((q) => healthy(q.language, q.slugs));
}

describe('query bodies', () => {
  it('sends the exact body resolveBlogPost sends for one slug', () => {
    expect(buildExactQueryBody('a-en', 'en')).toEqual({
      query: { filter: { slug: { $eq: 'a-en' }, language: { $eq: 'en' } } },
      fieldsets: ['URL'],
    });
  });

  it('batches slugs with $in (never the rejected $hasSome) and one language per request', () => {
    const body = buildBatchQueryBody(['a-en', 'b-en'], 'en');
    expect(body.query.filter).toEqual({ slug: { $in: ['a-en', 'b-en'] }, language: { $eq: 'en' } });
    expect(JSON.stringify(body)).not.toContain('$hasSome');
    expect(body.fieldsets).toEqual(['URL']);
  });
});

describe('planning', () => {
  it('plans one batch per language holding every group slug', () => {
    const plan = planQueries(GROUPS, LANGS);
    expect(plan.map((q) => q.language)).toEqual([...LANGS]);
    expect(plan[1].slugs).toEqual(['a-en', 'b-en']);
  });

  it('expects one check per group and language', () => {
    expect(buildLanguageChecks(GROUPS, LANGS)).toHaveLength(6);
  });
});

describe('evaluateBlogLanguageContract', () => {
  it('passes when every group has exactly one post per language', () => {
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, healthyBatches());
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(summarizeContract(report)).toMatchObject({ groups: 2, languages: 3, checks: 6, groupsComplete: 2 });
  });

  it('reports a missing language and which group lacks it', () => {
    const outcomes = healthyBatches().map((o) =>
      o.language === 'ru' ? { ...o, posts: o.posts.filter((p) => p.slug !== 'b-ru') } : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({ kind: 'missing', translationId: 'tid-b', language: 'ru', slug: 'b-ru' }),
    ]);
    expect(summarizeContract(report).groupsComplete).toBe(1);
    expect(summarizeContract(report).missingGroups).toEqual([]);
  });

  it('reports a group with no post in any language as a missing group', () => {
    const outcomes = healthyBatches().map((o) => ({
      ...o,
      posts: o.posts.filter((p) => !p.slug?.startsWith('b-')),
    }));
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.issues.map((i) => i.kind)).toEqual(['missing', 'missing', 'missing']);
    expect(summarizeContract(report).missingGroups).toEqual(['tid-b']);
  });

  it('reports a post that carries another language than the one requested', () => {
    const outcomes = healthyBatches().map((o) =>
      o.language === 'en'
        ? { ...o, posts: o.posts.map((p) => (p.slug === 'a-en' ? { ...p, language: 'he' } : p)) }
        : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({ kind: 'wrong-language', translationId: 'tid-a', language: 'en', slug: 'a-en' }),
    ]);
    expect(report.issues[0].detail).toContain('he');
  });

  it('reports two posts sharing the same slug and language', () => {
    const outcomes = healthyBatches().map((o) =>
      o.language === 'he' ? { ...o, posts: [...o.posts, { slug: 'a-he', language: 'he' }] } : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.issues).toEqual([
      expect.objectContaining({ kind: 'duplicate', translationId: 'tid-a', language: 'he', slug: 'a-he' }),
    ]);
  });

  it('reports an HTTP 4xx once per request, not once per slug, and never also as missing', () => {
    const outcomes: BlogQueryOutcome[] = healthyBatches().map((o) =>
      o.language === 'en'
        ? { ...o, status: 400, posts: [], errorBody: "Field 'blogSeo.slug' is using non allowed operator '$hasSome'" }
        : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({ kind: 'http-error', language: 'en', status: 400 });
    expect(report.issues[0].detail).toContain('$hasSome');
  });

  it('reports a network failure with no status', () => {
    const outcomes: BlogQueryOutcome[] = healthyBatches().map((o) =>
      o.language === 'ru' ? { ...o, status: 0, posts: [], errorBody: 'fetch failed' } : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.issues).toEqual([expect.objectContaining({ kind: 'http-error', language: 'ru', status: 0 })]);
  });

  it('reports a request that was never made (for example after HTTP 429 stopped the run)', () => {
    const outcomes = healthyBatches().filter((o) => o.language !== 'ru');
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.kind)).toEqual(['not-checked', 'not-checked']);
  });

  it('reports a group whose slug map has no slug for a language', () => {
    const groups: BlogLanguageGroups = { ...GROUPS, 'tid-c': { he: 'c-he', en: 'c-en' } };
    const outcomes = planQueries(groups, LANGS).map((q) => healthy(q.language, q.slugs));
    const report = evaluateBlogLanguageContract(groups, LANGS, outcomes);
    expect(report.issues).toEqual([
      expect.objectContaining({ kind: 'no-slug', translationId: 'tid-c', language: 'ru' }),
    ]);
  });

  it('checks an exact-body probe like a batch: its own HTTP error and its own post count', () => {
    const probeFail: BlogQueryOutcome = { language: 'en', slugs: ['a-en'], status: 400, posts: [], errorBody: 'bad', probe: true };
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, [...healthyBatches(), probeFail]);
    expect(report.issues).toEqual([expect.objectContaining({ kind: 'http-error', language: 'en', status: 400 })]);
    const probeOk: BlogQueryOutcome = { ...healthy('en', ['a-en']), probe: true };
    expect(evaluateBlogLanguageContract(GROUPS, LANGS, [...healthyBatches(), probeOk]).ok).toBe(true);
  });

  it('refuses to call a truncated page proof of absence', () => {
    const outcomes = healthyBatches().map((o) =>
      o.language === 'en' ? { ...o, posts: [], truncated: true } : o
    );
    const report = evaluateBlogLanguageContract(GROUPS, LANGS, outcomes);
    expect(report.issues).toEqual([expect.objectContaining({ kind: 'truncated', language: 'en' })]);
  });
});
