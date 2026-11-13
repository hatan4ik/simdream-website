import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredReviewsSnapshot } from '@/lib/reviews/google-reviews-source';
import { REVIEW_LANGUAGES } from '@/lib/reviews/review-language';

type QueryResult = { data: unknown; error: { message: string } | null };

/** Records the PostgREST calls the store makes and answers with the configured results. */
function fakeSupabase(read: QueryResult, write: QueryResult = { data: null, error: null }) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const client = {
    from(table: string) {
      const chain = {
        select: (...args: unknown[]) => (calls.push({ table, op: 'select', args }), chain),
        eq: (...args: unknown[]) => (calls.push({ table, op: 'eq', args }), chain),
        maybeSingle: () => (calls.push({ table, op: 'maybeSingle', args: [] }), Promise.resolve(read)),
        upsert: (...args: unknown[]) => (calls.push({ table, op: 'upsert', args }), Promise.resolve(write)),
      };
      return chain;
    },
  };
  return { client, calls };
}

async function loadStore(env: Record<string, string>, supabase: unknown | null) {
  vi.resetModules();
  delete (globalThis as { __simDreamReviewsSnapshotV1?: unknown }).__simDreamReviewsSnapshotV1;
  for (const [name, value] of Object.entries({ NODE_ENV: 'test', ALLOW_IN_MEMORY_STORE: '', ...env })) vi.stubEnv(name, value);
  vi.doMock('@/lib/db/supabase-admin', () => ({
    getSupabaseAdmin: () => supabase,
    requireSupabaseAdmin: () => {
      if (!supabase) throw new Error('Persistent storage is not configured.');
      return supabase;
    },
  }));
  return import('@/lib/reviews/reviews-snapshot-store');
}

const snapshot: StoredReviewsSnapshot = {
  fetchedAt: '2026-11-09T04:00:00.000Z',
  source: 'test source',
  overallRating: 4.9,
  totalReviewsCount: 127,
  reviewsByLanguage: Object.fromEntries(
    REVIEW_LANGUAGES.map((language) => [
      language,
      [
        {
          id: 'google-1-a',
          author: 'Ari',
          authorUrl: null,
          authorPhotoUrl: null,
          rating: 5,
          quote: 'Great.',
          relativeTime: 'a day ago',
          publishedAt: '2026-11-01T10:00:00.000Z',
          language,
          original: null,
          characterCount: 6,
        },
      ],
    ])
  ) as StoredReviewsSnapshot['reviewsByLanguage'],
};

afterEach(() => {
  vi.doUnmock('@/lib/db/supabase-admin');
  vi.unstubAllEnvs();
  vi.spyOn(console, 'error').mockRestore();
});

describe('reviews snapshot store', () => {
  it('keeps the snapshot in process memory outside production and forgets it on request', async () => {
    const { readReviewsSnapshot, saveReviewsSnapshot, forgetInMemoryReviewsSnapshot } = await loadStore({}, null);

    await expect(readReviewsSnapshot()).resolves.toBeNull();
    await saveReviewsSnapshot(snapshot);
    await expect(readReviewsSnapshot()).resolves.toEqual(snapshot);
    forgetInMemoryReviewsSnapshot();
    await expect(readReviewsSnapshot()).resolves.toBeNull();
  });

  it('fails closed in production without Supabase unless the demo opt-in is set', async () => {
    const closed = await loadStore({ NODE_ENV: 'production' }, null);
    await expect(closed.readReviewsSnapshot()).rejects.toThrow('Persistent storage is not configured.');
    await expect(closed.saveReviewsSnapshot(snapshot)).rejects.toThrow('Persistent storage is not configured.');

    const demo = await loadStore({ NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: 'true' }, null);
    await demo.saveReviewsSnapshot(snapshot);
    await expect(demo.readReviewsSnapshot()).resolves.toEqual(snapshot);
  });

  it('reads the single Supabase row, coercing numerics and dropping malformed review entries', async () => {
    const row = {
      id: 1,
      fetched_at: '2026-11-09T04:00:00+00:00',
      source: 'test source',
      overall_rating: '4.9', // NUMERIC comes back as a string
      total_reviews_count: 127,
      reviews_by_language: {
        en: [snapshot.reviewsByLanguage.en[0], { id: 'broken' }, 'not a review', { ...snapshot.reviewsByLanguage.en[0], id: 'x', language: 'xx' }],
        he: 'not a list',
        // ru, fr, ar, es absent
      },
    };
    const { client, calls } = fakeSupabase({ data: row, error: null });
    const { readReviewsSnapshot } = await loadStore({ NODE_ENV: 'production' }, client);

    const stored = await readReviewsSnapshot();

    expect(calls.map((call) => `${call.table}.${call.op}`)).toEqual([
      'google_reviews_snapshot.select',
      'google_reviews_snapshot.eq',
      'google_reviews_snapshot.maybeSingle',
    ]);
    expect(calls[1].args).toEqual(['id', 1]);
    expect(stored).toEqual({
      fetchedAt: '2026-11-09T04:00:00.000Z',
      source: 'test source',
      overallRating: 4.9,
      totalReviewsCount: 127,
      reviewsByLanguage: { en: [snapshot.reviewsByLanguage.en[0]], he: [], ru: [], fr: [], ar: [], es: [], de: [] },
    });
  });

  it('answers null when Supabase holds no row yet, and tolerates a row without review data', async () => {
    const empty = await loadStore({ NODE_ENV: 'production' }, fakeSupabase({ data: null, error: null }).client);
    await expect(empty.readReviewsSnapshot()).resolves.toBeNull();

    const bare = fakeSupabase({ data: { id: 1, fetched_at: '2026-11-09T04:00:00Z', source: 's', overall_rating: null, total_reviews_count: null, reviews_by_language: null }, error: null });
    const { readReviewsSnapshot } = await loadStore({ NODE_ENV: 'production' }, bare.client);
    await expect(readReviewsSnapshot()).resolves.toMatchObject({ overallRating: 0, totalReviewsCount: 0, reviewsByLanguage: { en: [], he: [] } });
  });

  it('upserts the single row with the snapshot columns', async () => {
    const { client, calls } = fakeSupabase({ data: null, error: null });
    const { saveReviewsSnapshot } = await loadStore({ NODE_ENV: 'production' }, client);

    await saveReviewsSnapshot(snapshot);

    const upsert = calls.find((call) => call.op === 'upsert');
    expect(upsert?.table).toBe('google_reviews_snapshot');
    expect(upsert?.args[0]).toMatchObject({
      id: 1,
      fetched_at: snapshot.fetchedAt,
      source: snapshot.source,
      overall_rating: 4.9,
      total_reviews_count: 127,
      reviews_by_language: snapshot.reviewsByLanguage,
    });
    expect(upsert?.args[1]).toEqual({ onConflict: 'id' });
  });

  it('turns Supabase errors into a PersistenceError without leaking the database message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = fakeSupabase({ data: null, error: { message: 'relation does not exist' } }, { data: null, error: { message: 'permission denied' } });
    const { readReviewsSnapshot, saveReviewsSnapshot } = await loadStore({ NODE_ENV: 'production' }, failing.client);

    await expect(readReviewsSnapshot()).rejects.toMatchObject({ name: 'PersistenceError', message: 'Persistent storage operation failed.' });
    await expect(saveReviewsSnapshot(snapshot)).rejects.toMatchObject({ name: 'PersistenceError', message: 'Persistent storage operation failed.' });
  });
});
