import { afterEach, describe, expect, it, vi } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { REVIEW_LANGUAGES } from '@/lib/reviews/review-language';

async function loadCache(placesKey = 'test-google-places-key') {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', placesKey);
  delete (globalThis as { __simDreamReviewsSnapshotV1?: unknown }).__simDreamReviewsSnapshotV1;
  return import('@/lib/reviews/google-reviews-cache');
}

async function loadSource() {
  vi.resetModules();
  return import('@/lib/reviews/google-reviews-source');
}

const seconds = (iso: string) => Date.parse(iso) / 1000;

/**
 * A legacy Place Details answer in Google's *relevance* order (as if `reviews_sort=newest` had been
 * ignored), as Google would return it for `language=en`: the newest review is second, a star-only
 * review (no text) is last, and one review is Google's translation of a Hebrew original.
 */
const LEGACY_RELEVANCE_ORDER = {
  status: 'OK',
  result: {
    rating: 4.9,
    user_ratings_total: 127,
    reviews: [
      {
        author_name: 'Ari',
        author_url: 'https://www.google.com/maps/contrib/1',
        profile_photo_url: 'https://lh3.googleusercontent.com/a/ari=s128',
        rating: 5,
        relative_time_description: '2 months ago',
        text: 'Older five-star feedback.',
        time: seconds('2026-09-01T10:00:00Z'),
        language: 'en',
        original_language: 'en',
        translated: false,
      },
      {
        author_name: 'Noam',
        profile_photo_url: 'http://insecure.example/photo.jpg',
        rating: 4,
        relative_time_description: 'a day ago',
        text: 'Four-star feedback, translated.',
        time: seconds('2026-11-01T10:00:00Z'),
        language: 'en',
        // Google still tags Hebrew with the legacy code "iw" (as on the live listing).
        original_language: 'iw',
        translated: true,
      },
      {
        author_name: 'Maya',
        author_url: 'javascript:alert(1)',
        rating: 5,
        relative_time_description: 'a week ago',
        text: 'Newer five-star feedback.',
        time: seconds('2026-10-01T10:00:00Z'),
        language: 'es',
        original_language: 'es',
        translated: false,
      },
      { author_name: 'Hidden', rating: 5, relative_time_description: 'today', text: '', time: seconds('2026-11-05T10:00:00Z') },
    ],
  },
};

/** The same answer with `reviews_no_translations=true`: Noam's text as written. */
const LEGACY_ORIGINALS = {
  ...LEGACY_RELEVANCE_ORDER,
  result: {
    ...LEGACY_RELEVANCE_ORDER.result,
    reviews: LEGACY_RELEVANCE_ORDER.result.reviews.map((review) =>
      review.author_name === 'Noam' ? { ...review, text: 'משוב של ארבעה כוכבים.', language: 'iw', translated: false } : review
    ),
  },
};

/** Answers like Google: originals for the untranslated request, the localized payload otherwise. */
function googleFetch(localized: unknown = LEGACY_RELEVANCE_ORDER, originals: unknown = LEGACY_ORIGINALS) {
  return vi.fn().mockImplementation((input: string | URL) => {
    const url = new URL(String(input));
    const body = url.searchParams.get('reviews_no_translations') === 'true' ? originals : localized;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google reviews source (legacy Place Details, reviews_sort=newest)', () => {
  it('re-orders a relevance-ordered answer newest first, by publish time alone', async () => {
    const { sortNewestFirst } = await loadSource();
    const relevanceOrdered = [
      { id: 'older-five-star', publishedAt: '2026-09-01T10:00:00.000Z', rating: 5, characterCount: 400 },
      { id: 'newest-four-star', publishedAt: '2026-11-01T10:00:00.000Z', rating: 4, characterCount: 10 },
      { id: 'newer-five-star', publishedAt: '2026-10-01T10:00:00.000Z', rating: 5, characterCount: 50 },
      { id: 'undated', publishedAt: '', rating: 5, characterCount: 900 },
    ];

    const sorted = sortNewestFirst(relevanceOrdered);

    expect(sorted.map((review) => review.id)).toEqual(['newest-four-star', 'newer-five-star', 'older-five-star', 'undated']);
    expect(relevanceOrdered.map((review) => review.id)[0]).toBe('older-five-star'); // the input is not mutated
  });

  it('asks the legacy Place Details service for the newest reviews once per page language plus once untranslated', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const fetchImpl = googleFetch();

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl, now: new Date('2026-11-09T04:00:00Z') });

    expect(fetchImpl).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);
    const urls = fetchImpl.mock.calls.map(([url]) => new URL(String(url)));
    for (const url of urls) {
      expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/place/details/json');
      expect(url.searchParams.get('place_id')).toBe(FACILITY_INFO.placeId);
      expect(url.searchParams.get('fields')).toBe('reviews,rating,user_ratings_total');
      expect(url.searchParams.get('reviews_sort')).toBe('newest');
      expect(url.searchParams.get('key')).toBe('test-key');
    }
    expect(urls[0].searchParams.get('reviews_no_translations')).toBe('true');
    expect(urls.slice(1).map((url) => url.searchParams.get('language'))).toEqual([...REVIEW_LANGUAGES]);
    expect(snapshot).toMatchObject({ fetchedAt: '2026-11-09T04:00:00.000Z', overallRating: 4.9, totalReviewsCount: 127 });
    expect(snapshot.source).toMatch(/reviews_sort=newest/);
  });

  it('stores every language newest first, drops star-only reviews and keeps only Google-supplied, safe fields', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();

    const { reviewsByLanguage } = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl: googleFetch() });

    for (const language of REVIEW_LANGUAGES) {
      expect(reviewsByLanguage[language].map((review) => review.publishedAt)).toEqual([
        '2026-11-01T10:00:00.000Z',
        '2026-10-01T10:00:00.000Z',
        '2026-09-01T10:00:00.000Z',
      ]);
    }
    const [translated, newer, older] = reviewsByLanguage.en;
    expect(translated).toMatchObject({
      author: 'Noam',
      quote: 'Four-star feedback, translated.',
      language: 'en',
      original: { text: 'משוב של ארבעה כוכבים.', language: 'he' },
      authorUrl: null,
      authorPhotoUrl: null, // http, not https
      relativeTime: 'a day ago',
      characterCount: 'Four-star feedback, translated.'.length,
    });
    expect(older).toMatchObject({
      original: null, // identical text: nothing to switch to
      authorUrl: 'https://www.google.com/maps/contrib/1',
      authorPhotoUrl: 'https://lh3.googleusercontent.com/a/ari=s128',
    });
    expect(newer).toMatchObject({ language: 'es', original: null, authorUrl: null, authorPhotoUrl: null });
    // The same review has the same id in every language, so the "Show original" state follows it.
    expect(reviewsByLanguage.he.map((review) => review.id)).toEqual(reviewsByLanguage.en.map((review) => review.id));
    expect(translated.id).toMatch(/^google-\d+-[0-9a-z]+$/);
  });

  it('copes with sparse legacy reviews: no time, no links, no relative text, no language tags', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const sparse = {
      status: 'OK',
      result: {
        reviews: [
          { author_name: 'Dana', text: 'Sparse but real.' },
          { author_name: '  ', text: 'No author, dropped.', time: 1 },
          { author_name: 'Eli', text: 'Translated without tags.', time: seconds('2026-11-02T10:00:00Z'), rating: '5' },
        ],
      },
    };
    const originals = {
      ...sparse,
      result: { reviews: [{ author_name: 'Eli', text: 'מתורגם ללא תגיות.', time: seconds('2026-11-02T10:00:00Z') }] },
    };

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl: googleFetch(sparse, originals) });

    expect(snapshot).toMatchObject({ overallRating: 0, totalReviewsCount: 0 });
    const [eli, dana] = snapshot.reviewsByLanguage.fr;
    expect(eli).toMatchObject({
      author: 'Eli',
      rating: 0, // a non-numeric rating is not trusted
      publishedAt: '2026-11-02T10:00:00.000Z',
      language: 'fr', // untagged: the requested language
      original: { text: 'מתורגם ללא תגיות.', language: 'fr' }, // untagged original falls back to the quote language
    });
    expect(dana).toMatchObject({ publishedAt: '', relativeTime: '', authorUrl: null, authorPhotoUrl: null, original: null });
    expect(snapshot.reviewsByLanguage.fr).toHaveLength(2);
  });

  it('refuses an answer without a result or status', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 })));

    await expect(fetchNewestGoogleReviews({ key: 'test-key', fetchImpl })).rejects.toThrow('Google Places answered no status.');
  });

  it('refuses a Google error status without inventing data', async () => {
    const { fetchNewestGoogleReviews, GoogleReviewsSourceError } = await loadSource();
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'REQUEST_DENIED', error_message: 'API not enabled' }), { status: 200 }))
    );

    await expect(fetchNewestGoogleReviews({ key: 'test-key', fetchImpl })).rejects.toBeInstanceOf(GoogleReviewsSourceError);
    await expect(fetchNewestGoogleReviews({ key: 'test-key', fetchImpl })).rejects.toThrow(/REQUEST_DENIED/);
  });
});

describe('Google reviews cache (stored snapshot)', () => {
  it('never calls Google for a read: without a stored snapshot it reports zeros and no reviews', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews } = await loadCache();

    const snapshot = await getCachedGoogleReviews('he');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      language: 'he',
      overallRating: 0,
      totalReviewsCount: 0,
      directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
      reviews: [],
    });
    expect(snapshot.source).toMatch(/snapshot/i);
  });

  it('refreshes from Google on demand, then serves the stored snapshot per language without calling Google again', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews, refreshGoogleReviewsSnapshot } = await loadCache();

    const stored = await refreshGoogleReviewsSnapshot(new Date('2026-11-09T04:00:00Z'));
    const callsAfterRefresh = fetchSpy.mock.calls.length;
    const hebrew = await getCachedGoogleReviews('he');
    const english = await getCachedGoogleReviews('en');
    await getCachedGoogleReviews('ar');

    expect(callsAfterRefresh).toBe(1 + REVIEW_LANGUAGES.length);
    expect(fetchSpy).toHaveBeenCalledTimes(callsAfterRefresh);
    expect(hebrew).toMatchObject({ language: 'he', lastUpdated: stored.fetchedAt, overallRating: 4.9, totalReviewsCount: 127 });
    expect(hebrew.reviews.map((review) => review.publishedAt)).toEqual([
      '2026-11-01T10:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
      '2026-09-01T10:00:00.000Z',
    ]);
    expect(english.reviews).toEqual(stored.reviewsByLanguage.en);
    expect(hebrew.reviews[0]).not.toHaveProperty('publishedAtMs');
  });

  it('keeps the previous snapshot when Google refuses a refresh', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews, refreshGoogleReviewsSnapshot } = await loadCache();
    await refreshGoogleReviewsSnapshot();
    fetchSpy.mockResolvedValue(new Response('temporarily unavailable', { status: 503 }));

    await expect(refreshGoogleReviewsSnapshot()).rejects.toThrow(/503/);

    expect((await getCachedGoogleReviews('en')).totalReviewsCount).toBe(127);
  });

  it('serves zeros when the snapshot store itself is unavailable, without throwing at the route', async () => {
    vi.stubGlobal('fetch', googleFetch());
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { getCachedGoogleReviews } = await loadCache();
    vi.stubEnv('NODE_ENV', 'production'); // too late for isProduction, so simulate the store failing instead
    const store = await import('@/lib/reviews/reviews-snapshot-store');
    vi.spyOn(store, 'readReviewsSnapshot').mockRejectedValue(new Error('database down'));

    const snapshot = await getCachedGoogleReviews('fr');

    expect(snapshot).toMatchObject({ language: 'fr', overallRating: 0, totalReviewsCount: 0, reviews: [] });
    expect(snapshot.source).toMatch(/storage is unavailable/);
  });

  it('serves the memoised row for a minute and re-reads the store after that', async () => {
    vi.stubGlobal('fetch', googleFetch());
    const { getCachedGoogleReviews, refreshGoogleReviewsSnapshot } = await loadCache();
    const store = await import('@/lib/reviews/reviews-snapshot-store');
    const read = vi.spyOn(store, 'readReviewsSnapshot');
    vi.useFakeTimers({ now: new Date('2026-11-09T04:00:00Z') });

    await refreshGoogleReviewsSnapshot(new Date()); // primes the memo from the write
    await getCachedGoogleReviews('en');
    expect(read).not.toHaveBeenCalled();
    vi.setSystemTime(new Date('2026-11-09T04:01:01Z'));
    await getCachedGoogleReviews('en');
    expect(read).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('refuses to refresh without a Places key, and the admin sync then reports the stored state unrefreshed', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { refreshGoogleReviewsSnapshot, ReviewsNotConfiguredError, syncGoogleReviews } = await loadCache('');

    await expect(refreshGoogleReviewsSnapshot()).rejects.toBeInstanceOf(ReviewsNotConfiguredError);
    await expect(syncGoogleReviews()).resolves.toMatchObject({ success: true, refreshed: false, totalReviews: 0, rating: 0, reviews: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
