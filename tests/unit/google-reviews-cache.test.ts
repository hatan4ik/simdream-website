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
        text: 'Comentario de cinco estrellas más reciente.',
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

const HEBREW = /[\u0590-\u05FF]/;
const CYRILLIC = /[\u0400-\u04FF]/;

/** What Google would detect for a text: Hebrew as its legacy tag `iw`, Cyrillic as `ru`, else `en`. */
function detectedTag(text: string): string {
  return HEBREW.test(text) ? 'iw' : CYRILLIC.test(text) ? 'ru' : /[áéíóúñ]/.test(text) ? 'es' : 'en';
}

/**
 * Answers like Google: the legacy Place Details originals for the one Places read, and a Cloud
 * Translation payload (`[<target>] <text>` per segment, with the detected source tag) for every
 * translation request. `translate` can replace the translation answer, e.g. with a 403.
 */
function googleFetch(originals: unknown = LEGACY_ORIGINALS, translate?: (body: { q: string[]; target: string }) => Response) {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname === 'translation.googleapis.com') {
      const body = JSON.parse(String(init?.body)) as { q: string[]; target: string };
      if (translate) return Promise.resolve(translate(body));
      // Like Google: a text already in the target language comes back unchanged.
      const translations = body.q.map((text) => {
        const detected = detectedTag(text);
        const same = (detected === 'iw' ? 'he' : detected) === body.target;
        return { translatedText: same ? text : `[${body.target}] ${text}`, detectedSourceLanguage: detected };
      });
      return Promise.resolve(new Response(JSON.stringify({ data: { translations } }), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(originals), { status: 200 }));
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google reviews source (legacy Place Details newest first + Cloud Translation)', () => {
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

  it('reads the newest reviews once, untranslated, and asks Cloud Translation once per page language', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const fetchImpl = googleFetch();

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl, now: new Date('2026-11-09T04:00:00Z') });

    // Every page language has at least one review written in another language, so six translation requests.
    expect(fetchImpl).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);
    const [places, ...translations] = fetchImpl.mock.calls;
    const placesUrl = new URL(String(places[0]));
    expect(placesUrl.origin + placesUrl.pathname).toBe('https://maps.googleapis.com/maps/api/place/details/json');
    expect(placesUrl.searchParams.get('place_id')).toBe(FACILITY_INFO.placeId);
    expect(placesUrl.searchParams.get('fields')).toBe('reviews,rating,user_ratings_total');
    expect(placesUrl.searchParams.get('reviews_sort')).toBe('newest');
    expect(placesUrl.searchParams.get('reviews_no_translations')).toBe('true');
    expect(placesUrl.searchParams.get('key')).toBe('test-key');
    expect(placesUrl.searchParams.get('language')).toBeNull();
    const targets = translations.map(([url, init]) => {
      const parsed = new URL(String(url));
      expect(parsed.origin + parsed.pathname).toBe('https://translation.googleapis.com/language/translate/v2');
      expect(parsed.searchParams.get('key')).toBe('test-key');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(String(init?.body)) as { q: string[]; target: string; format: string };
      expect(body.format).toBe('text');
      expect(body.q.length).toBeGreaterThan(0);
      return body.target;
    });
    expect(targets).toEqual([...REVIEW_LANGUAGES]);
    expect(snapshot).toMatchObject({ fetchedAt: '2026-11-09T04:00:00.000Z', overallRating: 4.9, totalReviewsCount: 127 });
    expect(snapshot.source).toMatch(/reviews_sort=newest/);
    expect(snapshot.source).toMatch(/Cloud Translation/);
  });

  it('stores every language newest first with the translation and the text as written, dropping star-only reviews', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();

    const { reviewsByLanguage } = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl: googleFetch() });

    for (const language of REVIEW_LANGUAGES) {
      expect(reviewsByLanguage[language].map((review) => review.publishedAt)).toEqual([
        '2026-11-01T10:00:00.000Z',
        '2026-10-01T10:00:00.000Z',
        '2026-09-01T10:00:00.000Z',
      ]);
    }
    const [noam, maya, ari] = reviewsByLanguage.en;
    expect(noam).toMatchObject({
      author: 'Noam',
      quote: '[en] משוב של ארבעה כוכבים.',
      language: 'en',
      original: { text: 'משוב של ארבעה כוכבים.', language: 'he' }, // Google's `iw` tag reads as Hebrew
      authorUrl: null,
      authorPhotoUrl: null, // http, not https
      relativeTime: 'a day ago',
      characterCount: '[en] משוב של ארבעה כוכבים.'.length,
    });
    expect(ari).toMatchObject({
      quote: 'Older five-star feedback.',
      language: 'en',
      original: null, // written in English: nothing to switch to
      authorUrl: 'https://www.google.com/maps/contrib/1',
      authorPhotoUrl: 'https://lh3.googleusercontent.com/a/ari=s128',
    });
    expect(maya).toMatchObject({ quote: '[en] Comentario de cinco estrellas más reciente.', language: 'en', original: { text: 'Comentario de cinco estrellas más reciente.', language: 'es' } });
    expect(reviewsByLanguage.es[1]).toMatchObject({ author: 'Maya', quote: 'Comentario de cinco estrellas más reciente.', language: 'es', original: null });
    // In Hebrew, Noam's review is the original and the others are translated.
    expect(reviewsByLanguage.he[0]).toMatchObject({ author: 'Noam', quote: 'משוב של ארבעה כוכבים.', language: 'he', original: null });
    expect(reviewsByLanguage.he[2]).toMatchObject({ author: 'Ari', quote: '[he] Older five-star feedback.', language: 'he', original: { text: 'Older five-star feedback.', language: 'en' } });
    // The same review has the same id in every language, so the "Show original" state follows it.
    expect(reviewsByLanguage.he.map((review) => review.id)).toEqual(reviewsByLanguage.en.map((review) => review.id));
    expect(noam.id).toMatch(/^google-\d+-[0-9a-z]+$/);
  });

  it('serves the originals, untranslated, when Cloud Translation refuses, and says so in the source', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchImpl = googleFetch(LEGACY_ORIGINALS, () =>
      new Response(JSON.stringify({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'Cloud Translation API has not been used' } }), { status: 403 })
    );

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(2); // one Places read, one refused translation, then no more attempts
    for (const language of REVIEW_LANGUAGES) {
      expect(snapshot.reviewsByLanguage[language].map((review) => [review.quote, review.language, review.original])).toEqual([
        ['משוב של ארבעה כוכבים.', 'he', null],
        ['Comentario de cinco estrellas más reciente.', 'es', null],
        ['Older five-star feedback.', 'en', null],
      ]);
    }
    expect(snapshot.source).toMatch(/originals only, Cloud Translation unavailable/);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/translation unavailable/i), expect.stringMatching(/403 PERMISSION_DENIED/));
  });

  it('serves the originals and makes a single request when no translation key is configured', async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const fetchImpl = googleFetch();

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', translationKey: null, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(snapshot.reviewsByLanguage.fr.map((review) => review.original)).toEqual([null, null, null]);
  });

  it("maps Google's iw and yi tags to Hebrew and lets Google detect the language of an untagged review", async () => {
    const { fetchNewestGoogleReviews } = await loadSource();
    const originals = {
      status: 'OK',
      result: {
        reviews: [
          { author_name: 'Noam', rating: 5, text: 'ביקורת בעברית.', time: seconds('2026-11-03T10:00:00Z'), language: 'yi' }, // Google mislabels Hebrew as Yiddish
          { author_name: 'Eli', rating: 5, text: 'עוד ביקורת בעברית.', time: seconds('2026-11-02T10:00:00Z') }, // no language tag at all
          { author_name: 'Dana', text: 'Sparse but real.' }, // no time, no rating, no links
          { author_name: '  ', text: 'No author, dropped.', time: 1 },
        ],
      },
    };

    const snapshot = await fetchNewestGoogleReviews({ key: 'test-key', fetchImpl: googleFetch(originals) });

    expect(snapshot).toMatchObject({ overallRating: 0, totalReviewsCount: 0 });
    const [noam, eli, dana] = snapshot.reviewsByLanguage.en;
    expect(noam).toMatchObject({ quote: '[en] ביקורת בעברית.', language: 'en', original: { text: 'ביקורת בעברית.', language: 'he' } });
    expect(eli).toMatchObject({ quote: '[en] עוד ביקורת בעברית.', language: 'en', original: { text: 'עוד ביקורת בעברית.', language: 'he' } }); // detected
    expect(dana).toMatchObject({ quote: 'Sparse but real.', language: 'en', original: null, publishedAt: '', relativeTime: '', rating: 0, authorUrl: null, authorPhotoUrl: null });
    // Hebrew page: Noam is served as written; untagged Eli is sent to Google, comes back unchanged and counts as Hebrew.
    expect(snapshot.reviewsByLanguage.he[0]).toMatchObject({ author: 'Noam', quote: 'ביקורת בעברית.', language: 'he', original: null });
    expect(snapshot.reviewsByLanguage.he[1]).toMatchObject({ author: 'Eli', quote: 'עוד ביקורת בעברית.', language: 'he', original: null });
    expect(snapshot.reviewsByLanguage.en).toHaveLength(3);
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
  it('without a Places key and without a stored snapshot it reports zeros and no reviews, never calling Google', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews } = await loadCache('');

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

  it('without a stored snapshot it reads Google once per 06:00/17:00 Israel window and serves newest first', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers({ now: new Date('2026-11-09T09:00:00Z') }); // 11:00 Israel: the 06:00 window
    const { getCachedGoogleReviews } = await loadCache();

    const [hebrew, english] = await Promise.all([getCachedGoogleReviews('he'), getCachedGoogleReviews('en')]);
    await getCachedGoogleReviews('ar');

    // One read for the whole window (originals + the six languages), shared by concurrent requests.
    expect(fetchSpy).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);
    expect(hebrew).toMatchObject({ language: 'he', overallRating: 4.9, totalReviewsCount: 127 });
    expect(hebrew.reviews.map((review) => review.publishedAt)).toEqual([
      '2026-11-01T10:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
      '2026-09-01T10:00:00.000Z',
    ]);
    expect(english.source).toMatch(/2026-11-09T06 Israel window/);

    vi.setSystemTime(new Date('2026-11-09T14:59:00Z')); // 16:59 Israel: same window, no new read
    await getCachedGoogleReviews('en');
    expect(fetchSpy).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);

    vi.setSystemTime(new Date('2026-11-09T15:00:00Z')); // 17:00 Israel: the next window reads again
    const evening = await getCachedGoogleReviews('en');
    expect(fetchSpy).toHaveBeenCalledTimes(2 * (1 + REVIEW_LANGUAGES.length));
    expect(evening.source).toMatch(/2026-11-09T17 Israel window/);
    vi.useRealTimers();
  });

  it('keeps the previous window when Google refuses the next read, and reports zeros only when it never answered', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.useFakeTimers({ now: new Date('2026-11-09T09:00:00Z') });
    const { getCachedGoogleReviews } = await loadCache();

    expect((await getCachedGoogleReviews('en')).totalReviewsCount).toBe(127);
    fetchSpy.mockResolvedValue(new Response('temporarily unavailable', { status: 503 }));
    vi.setSystemTime(new Date('2026-11-09T15:00:00Z'));
    expect((await getCachedGoogleReviews('en')).totalReviewsCount).toBe(127);

    const cold = await loadCache();
    const empty = await cold.getCachedGoogleReviews('en');
    expect(empty).toMatchObject({ overallRating: 0, totalReviewsCount: 0, reviews: [] });
    expect(empty.source).toMatch(/refused/);
    vi.useRealTimers();
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

  it('reads Google once per window when the snapshot store itself is unavailable, without throwing at the route', async () => {
    const fetchSpy = googleFetch();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { getCachedGoogleReviews } = await loadCache();
    const store = await import('@/lib/reviews/reviews-snapshot-store');
    vi.spyOn(store, 'readReviewsSnapshot').mockRejectedValue(new Error('database down'));

    const snapshot = await getCachedGoogleReviews('fr');

    expect(fetchSpy).toHaveBeenCalledTimes(1 + REVIEW_LANGUAGES.length);
    expect(snapshot).toMatchObject({ language: 'fr', overallRating: 4.9, totalReviewsCount: 127 });
    expect(snapshot.source).toMatch(/no snapshot store/);
  });

  it('serves zeros when the store is unavailable and no Places key is configured', async () => {
    vi.stubGlobal('fetch', googleFetch());
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { getCachedGoogleReviews } = await loadCache('');
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
