import { afterEach, describe, expect, it, vi } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';

async function loadCache(placesKey = 'test-google-places-key') {
  vi.resetModules();
  vi.stubEnv('GOOGLE_PLACES_API_KEY', placesKey);
  return import('@/lib/reviews/google-reviews-cache');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google reviews cache', () => {
  it('keeps only Google-supplied fields, orders high-rated current feedback, and shares the refresh', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          rating: 4.9,
          userRatingCount: 127,
          reviews: [
            {
              name: 'places/test/reviews/older-five-star',
              rating: 5,
              text: { text: 'Older five-star feedback.', languageCode: 'en' },
              relativePublishTimeDescription: '2 months ago',
              publishTime: '2026-09-01T10:00:00Z',
              authorAttribution: { displayName: 'Ari' },
            },
            {
              name: 'places/test/reviews/newer-five-star',
              rating: 5,
              text: { text: 'Newer five-star feedback.', languageCode: 'es' },
              relativePublishTimeDescription: 'a week ago',
              publishTime: '2026-10-01T10:00:00Z',
              authorAttribution: { displayName: 'Maya' },
            },
            {
              name: 'places/test/reviews/four-star',
              rating: 4,
              text: { text: 'Four-star feedback.', languageCode: 'ar' },
              relativePublishTimeDescription: 'a day ago',
              publishTime: '2026-11-01T10:00:00Z',
              authorAttribution: { displayName: 'Noam' },
            },
            {
              name: 'places/test/reviews/invalid',
              rating: 5,
              text: { text: '', languageCode: 'en' },
              authorAttribution: { displayName: 'Hidden' },
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { getCachedGoogleReviews } = await loadCache();

    const first = await getCachedGoogleReviews();
    const second = await getCachedGoogleReviews();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://places.googleapis.com/v1/places/${FACILITY_INFO.placeId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Goog-FieldMask': expect.stringContaining('reviews.publishTime'),
        }),
      })
    );
    expect(first).toBe(second);
    expect(first).toMatchObject({
      overallRating: 4.9,
      totalReviewsCount: 127,
      directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    });
    expect(first.reviews.map((review) => review.id)).toEqual([
      'places/test/reviews/newer-five-star',
      'places/test/reviews/older-five-star',
      'places/test/reviews/four-star',
    ]);
    expect(first.reviews.map((review) => review.language)).toEqual(['es', 'en', 'ar']);
    expect(first.reviews[0]).not.toHaveProperty('publishedAt');
  });

  it('returns no review claims when Google rejects a refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('temporarily unavailable', { status: 503 })));
    const { getCachedGoogleReviews } = await loadCache();

    await expect(getCachedGoogleReviews()).resolves.toMatchObject({
      source: 'Google Places API refresh failed; no review data is served.',
      overallRating: 0,
      totalReviewsCount: 0,
      reviews: [],
    });
  });
});
