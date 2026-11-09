import { afterEach, describe, expect, it, vi } from 'vitest';
import { REVIEW_LANGUAGES } from '@/lib/reviews/review-language';
import { loadApp, type LoadAppOptions } from '../support/app';
import { apiRequest, bearer, readJson } from '../support/http';
import { TEST_REVIEWS_REFRESH_TOKEN } from '../support/test-env';
import { errorBody, expectContract, reviewsSnapshot } from './contracts';

const seconds = (iso: string) => Date.parse(iso) / 1000;

/** Google's answer in relevance order; the newest review (Noam) is second. */
const LEGACY_PAYLOAD = {
  status: 'OK',
  result: {
    rating: 4.9,
    user_ratings_total: 127,
    reviews: [
      { author_name: 'Ari', rating: 5, relative_time_description: '2 months ago', text: 'Older feedback.', time: seconds('2026-09-01T10:00:00Z'), language: 'en', translated: false },
      { author_name: 'Noam', rating: 4, relative_time_description: 'a day ago', text: 'Newest feedback.', time: seconds('2026-10-31T10:00:00Z'), language: 'en', translated: false },
      { author_name: 'Maya', rating: 5, relative_time_description: 'a week ago', text: 'Newer feedback.', time: seconds('2026-10-01T10:00:00Z'), language: 'en', translated: false },
    ],
  },
};

function stubGoogle() {
  const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(LEGACY_PAYLOAD), { status: 200 })));
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

const CONFIGURED: LoadAppOptions = { env: { REVIEWS_REFRESH_TOKEN: TEST_REVIEWS_REFRESH_TOKEN, GOOGLE_PLACES_API_KEY: 'test-google-places-key' } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/reviews/refresh', () => {
  it('answers 401 without the refresh token, calling neither Google nor storage', async () => {
    const fetchSpy = stubGoogle();
    const app = await loadApp(CONFIGURED);
    const { POST } = await app.routes.reviewsRefresh();

    const anonymous = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST' })));
    const wrong = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer('x'.repeat(TEST_REVIEWS_REFRESH_TOKEN.length)) })));

    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get('www-authenticate')).toMatch(/^Bearer realm="Sim Dream reviews refresh"/);
    expect(anonymous.headers.get('cache-control')).toBe('no-store');
    expectContract(errorBody, anonymous.body);
    expect(wrong.status).toBe(401);
    expect(fetchSpy, 'a refused refresh never reaches Google').not.toHaveBeenCalled();
    // Without a stored snapshot a page view falls back to this server's own once-per-window read.
    const served = await readJson(await (await app.routes.reviews()).GET(apiRequest('/api/reviews')));
    const body = expectContract(reviewsSnapshot, served.body);
    expect(body.reviews.length).toBeGreaterThan(0);
    expect(body.source).toMatch(/no snapshot store/);
    const callsAfterWindowRead = fetchSpy.mock.calls.length;
    await (await app.routes.reviews()).GET(apiRequest('/api/reviews?lang=he'));
    expect(fetchSpy, 'one Google read per window, shared across page views').toHaveBeenCalledTimes(callsAfterWindowRead);
  });

  it('is disabled (503) until REVIEWS_REFRESH_TOKEN is configured, and refuses a short token', async () => {
    const fetchSpy = stubGoogle();
    for (const token of ['', 'short-token']) {
      const app = await loadApp({ env: { REVIEWS_REFRESH_TOKEN: token, GOOGLE_PLACES_API_KEY: 'test-google-places-key' } });
      const { POST } = await app.routes.reviewsRefresh();

      const response = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(token) })));

      expect(response.status, `token ${JSON.stringify(token)}`).toBe(503);
      expectContract(errorBody, response.body);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('answers 503 with a valid token while the Places key is missing', async () => {
    const fetchSpy = stubGoogle();
    const app = await loadApp({ env: { REVIEWS_REFRESH_TOKEN: TEST_REVIEWS_REFRESH_TOKEN } });
    const { POST } = await app.routes.reviewsRefresh();

    const response = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toMatch(/Google Places API is not configured/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('stores the newest reviews for all six languages with the token, and GET then serves them newest first without calling Google', async () => {
    const fetchSpy = stubGoogle();
    const app = await loadApp(CONFIGURED);
    const { POST } = await app.routes.reviewsRefresh();
    const { GET } = await app.routes.reviews();

    const refresh = await readJson<Record<string, unknown>>(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

    expect(refresh.status).toBe(200);
    expect(refresh.headers.get('cache-control')).toBe('no-store');
    expect(refresh.body).toEqual({
      success: true,
      fetchedAt: new Date().toISOString(), // the frozen test clock
      rating: 4.9,
      totalReviews: 127,
      reviewCount: Object.fromEntries(REVIEW_LANGUAGES.map((language) => [language, 3])),
      newestPublishedAt: '2026-10-31T10:00:00.000Z',
    });
    // One untranslated read plus one per page language, all through the legacy newest-first endpoint.
    expect(fetchSpy).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);
    for (const [url] of fetchSpy.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/place\/details\/json\?/);
      expect(new URL(String(url)).searchParams.get('reviews_sort')).toBe('newest');
    }

    fetchSpy.mockClear();
    for (const language of REVIEW_LANGUAGES) {
      const response = await readJson(await GET(apiRequest(`/api/reviews?lang=${language}`)));
      expect(response.status).toBe(200);
      const snapshot = expectContract(reviewsSnapshot, response.body);
      expect(snapshot).toMatchObject({ language, overallRating: 4.9, totalReviewsCount: 127, lastUpdated: refresh.body.fetchedAt });
      expect(snapshot.reviews.map((review) => review.publishedAt)).toEqual([
        '2026-10-31T10:00:00.000Z',
        '2026-10-01T10:00:00.000Z',
        '2026-09-01T10:00:00.000Z',
      ]);
    }
    expect(fetchSpy, 'a page view must never reach Google').not.toHaveBeenCalled();
  });

  it('reports 502 and keeps the stored snapshot when Google refuses', async () => {
    const fetchSpy = stubGoogle();
    const app = await loadApp(CONFIGURED);
    const { POST } = await app.routes.reviewsRefresh();
    const { GET } = await app.routes.reviews();
    expect((await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })))).status).toBe(200);
    fetchSpy.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ status: 'OVER_QUERY_LIMIT' }), { status: 200 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const failed = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

    expect(failed.status).toBe(502);
    expectContract(errorBody, failed.body);
    expect(expectContract(reviewsSnapshot, (await readJson(await GET(apiRequest('/api/reviews')))).body).totalReviewsCount).toBe(127);
  });

  it('reports no newest review when Google supplies only star ratings without text', async () => {
    const starOnly = { status: 'OK', result: { rating: 5, user_ratings_total: 3, reviews: [{ author_name: 'Ilana', rating: 5, text: '', time: seconds('2026-11-08T12:00:00Z') }] } };
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(starOnly), { status: 200 }))));
    const app = await loadApp(CONFIGURED);
    const { POST } = await app.routes.reviewsRefresh();

    const response = await readJson<Record<string, unknown>>(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ rating: 5, totalReviews: 3, newestPublishedAt: null, reviewCount: { en: 0, he: 0 } });
    const stored = expectContract(reviewsSnapshot, (await readJson(await (await app.routes.reviews()).GET(apiRequest('/api/reviews')))).body);
    expect(stored).toMatchObject({ overallRating: 5, totalReviewsCount: 3, reviews: [] });
  });

  it('answers a generic 500 without internals when the refresh fails unexpectedly', async () => {
    stubGoogle();
    const app = await loadApp(CONFIGURED);
    vi.doMock('@/lib/reviews/google-reviews-cache', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/reviews/google-reviews-cache')>()),
      refreshGoogleReviewsSnapshot: () => Promise.reject(new TypeError('unexpected shape at /srv/app/route.ts:12:5')),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { POST } = await app.routes.reviewsRefresh();

      const response = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

      expect(response.status).toBe(500);
      expect(expectContract(errorBody, response.body).error).toBe('Failed to refresh Google reviews');
    } finally {
      vi.doUnmock('@/lib/reviews/google-reviews-cache');
    }
  });

  it('fails closed (503) in production without Supabase, storing nothing, while page views still get a per-window live read', async () => {
    const fetchSpy = stubGoogle();
    const app = await loadApp({ env: { ...CONFIGURED.env, NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '' } });
    const { POST } = await app.routes.reviewsRefresh();

    const response = await readJson(await POST(apiRequest('/api/reviews/refresh', { method: 'POST', headers: bearer(TEST_REVIEWS_REFRESH_TOKEN) })));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe('Persistent storage is unavailable.');
    expect(fetchSpy).toHaveBeenCalled(); // Google was read; only the write refused
    // Production without a snapshot store still serves visitors: the server reads Google once per
    // 06:00/17:00 Israel window instead of showing nothing (the Wix site has no Supabase today).
    const served = await readJson(await (await app.routes.reviews()).GET(apiRequest('/api/reviews')));
    expect(served.status).toBe(200);
    const body = expectContract(reviewsSnapshot, served.body);
    expect(body.totalReviewsCount).toBe(127);
    expect(body.reviews.length).toBeGreaterThan(0);
    expect(body.source).toMatch(/no snapshot store/);
  });
});
