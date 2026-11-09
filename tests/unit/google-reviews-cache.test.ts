import { afterEach, describe, expect, it, vi } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';

async function loadCache(placesKey = 'test-google-places-key') {
  vi.resetModules();
  vi.stubEnv('GOOGLE_PLACES_API_KEY', placesKey);
  return import('@/lib/reviews/google-reviews-cache');
}

const PLACES_PAYLOAD = {
  rating: 4.9,
  userRatingCount: 127,
  reviews: [
    {
      name: 'places/test/reviews/older-five-star',
      rating: 5,
      text: { text: 'Older five-star feedback.', languageCode: 'en' },
      originalText: { text: 'Older five-star feedback.', languageCode: 'en' },
      relativePublishTimeDescription: '2 months ago',
      publishTime: '2026-09-01T10:00:00Z',
      authorAttribution: {
        displayName: 'Ari',
        uri: 'https://www.google.com/maps/contrib/1',
        photoUri: 'https://lh3.googleusercontent.com/a/ari=s128',
      },
    },
    {
      name: 'places/test/reviews/translated-four-star',
      rating: 4,
      // Google translated this one into the requested language; the original is Hebrew, which Google
      // still tags with the legacy code "iw" (as on the live listing).
      text: { text: 'Four-star feedback, translated.', languageCode: 'en' },
      originalText: { text: 'משוב של ארבעה כוכבים.', languageCode: 'iw' },
      relativePublishTimeDescription: 'a day ago',
      publishTime: '2026-11-01T10:00:00Z',
      authorAttribution: { displayName: 'Noam', photoUri: 'http://insecure.example/photo.jpg' },
    },
    {
      name: 'places/test/reviews/newer-five-star',
      rating: 5,
      text: { text: 'Newer five-star feedback.', languageCode: 'es' },
      relativePublishTimeDescription: 'a week ago',
      publishTime: '2026-10-01T10:00:00Z',
      authorAttribution: { displayName: 'Maya', uri: 'javascript:alert(1)' },
    },
    {
      name: 'places/test/reviews/invalid',
      rating: 5,
      text: { text: '', languageCode: 'en' },
      authorAttribution: { displayName: 'Hidden' },
    },
  ],
};

const placesResponse = () => new Response(JSON.stringify(PLACES_PAYLOAD), { status: 200 });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google reviews cache', () => {
  it('asks Google for the page language, keeps only Google-supplied fields, orders newest first and shares the refresh', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(placesResponse());
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews } = await loadCache();

    const first = await getCachedGoogleReviews(false, 'he');
    const second = await getCachedGoogleReviews(false, 'he');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [URL | string, RequestInit];
    expect(String(url)).toBe(`https://places.googleapis.com/v1/places/${FACILITY_INFO.placeId}?languageCode=he`);
    const fieldMask = (init.headers as Record<string, string>)['X-Goog-FieldMask'];
    expect(fieldMask).toContain('reviews.publishTime');
    expect(fieldMask).toContain('reviews.originalText');
    expect(fieldMask).toContain('reviews.authorAttribution');
    expect(first).toBe(second);
    expect(first).toMatchObject({
      language: 'he',
      overallRating: 4.9,
      totalReviewsCount: 127,
      directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    });
    // Newest first, whatever the rating; the empty review is dropped.
    expect(first.reviews.map((review) => review.id)).toEqual([
      'places/test/reviews/translated-four-star',
      'places/test/reviews/newer-five-star',
      'places/test/reviews/older-five-star',
    ]);
    expect(first.reviews.map((review) => review.publishedAt)).toEqual([
      '2026-11-01T10:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
      '2026-09-01T10:00:00.000Z',
    ]);
    expect(first.reviews[0]).not.toHaveProperty('publishedAtMs');
  });

  it('keeps the original text only when Google translated the review, and only safe https author links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(placesResponse()));
    const { getCachedGoogleReviews } = await loadCache();

    const { reviews } = await getCachedGoogleReviews(false, 'en');
    const [translated, newer, older] = reviews;

    expect(translated).toMatchObject({
      quote: 'Four-star feedback, translated.',
      language: 'en',
      original: { text: 'משוב של ארבעה כוכבים.', language: 'he' },
      authorUrl: null,
      authorPhotoUrl: null, // http, not https
    });
    expect(older).toMatchObject({
      original: null, // identical text: nothing to switch to
      authorUrl: 'https://www.google.com/maps/contrib/1',
      authorPhotoUrl: 'https://lh3.googleusercontent.com/a/ari=s128',
    });
    expect(newer).toMatchObject({ language: 'es', original: null, authorUrl: null, authorPhotoUrl: null });
  });

  it('caches each language separately so a Hebrew page never shows the English translation', async () => {
    const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(placesResponse()));
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews } = await loadCache();

    await getCachedGoogleReviews(false, 'en');
    await getCachedGoogleReviews(false, 'he');
    await getCachedGoogleReviews(false, 'en');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('languageCode'))).toEqual(['en', 'he']);
  });

  it('returns no review claims when Google rejects a refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('temporarily unavailable', { status: 503 })));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { getCachedGoogleReviews } = await loadCache();

    await expect(getCachedGoogleReviews()).resolves.toMatchObject({
      source: 'Google Places API refresh failed; no review data is served.',
      language: 'en',
      overallRating: 0,
      totalReviewsCount: 0,
      reviews: [],
    });
  });
});
