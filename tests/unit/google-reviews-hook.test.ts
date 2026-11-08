import { afterEach, describe, expect, it, vi } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';

const REVIEW = { id: 'r1', author: 'Maya', rating: 5, quote: 'Great flight.', relativeTime: 'a week ago', language: 'en' };

function feed(overrides: Record<string, unknown> = {}) {
  return { overallRating: 4.8, totalReviewsCount: 250, directReviewsUrl: 'https://google.test/reviews', reviews: [REVIEW], ...overrides };
}

/** A fresh module per test: the snapshot cache is module state, as it is on a real page load. */
async function loadHook(fetchImpl: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchImpl);
  return import('@/lib/reviews/use-google-reviews');
}

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Google reviews browser data', () => {
  it('shows the labelled last-known rating, with no review texts, until Google data arrives', async () => {
    const { displaySnapshot, LAST_KNOWN_GOOGLE_RATING } = await loadHook(vi.fn());

    expect(LAST_KNOWN_GOOGLE_RATING).toEqual({ overallRating: 5, totalReviewsCount: 422 });
    expect(displaySnapshot()).toEqual({
      overallRating: 5,
      totalReviewsCount: 422,
      directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
      reviews: [],
      live: false,
    });
  });

  it("replaces it with Google's numbers, marked live, as soon as the server returns them", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respond(feed()));
    const { loadGoogleReviews, displaySnapshot } = await loadHook(fetchSpy);

    const loaded = await loadGoogleReviews();

    expect(loaded).toMatchObject({ overallRating: 4.8, totalReviewsCount: 250, live: true });
    expect(loaded?.reviews).toHaveLength(1);
    expect(displaySnapshot()).toBe(loaded);
    expect(fetchSpy).toHaveBeenCalledWith('/api/reviews', expect.objectContaining({ cache: 'no-store' }));
  });

  it('accepts a live rating and count that come without any review text', async () => {
    const { loadGoogleReviews } = await loadHook(vi.fn().mockResolvedValue(respond(feed({ reviews: [] }))));

    await expect(loadGoogleReviews()).resolves.toMatchObject({ overallRating: 4.8, totalReviewsCount: 250, reviews: [], live: true });
  });

  it('keeps the last-known rating when the server has no Google data or answers badly', async () => {
    const unusable = [
      respond({ overallRating: 0, totalReviewsCount: 0, directReviewsUrl: 'https://google.test/reviews', reviews: [] }),
      respond(feed({ overallRating: 0 })),
      respond(feed({ totalReviewsCount: 0 })),
      respond(feed({ directReviewsUrl: undefined })),
      respond(feed({ reviews: 'none' })),
      respond(null),
      respond('text'),
      respond({ error: 'Failed to retrieve Google reviews snapshot' }, 500),
    ];
    for (const response of unusable) {
      const { loadGoogleReviews, displaySnapshot } = await loadHook(vi.fn().mockResolvedValue(response));

      await expect(loadGoogleReviews()).resolves.toBeNull();
      expect(displaySnapshot()).toMatchObject({ overallRating: 5, totalReviewsCount: 422, live: false });
    }
  });

  it('keeps the last-known rating when the request cannot be made at all', async () => {
    const { loadGoogleReviews, displaySnapshot } = await loadHook(vi.fn().mockRejectedValue(new Error('offline')));

    await expect(loadGoogleReviews()).resolves.toBeNull();
    expect(displaySnapshot()).toMatchObject({ totalReviewsCount: 422, live: false });
  });

  it('keeps the last good live numbers when a later refresh fails', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(respond(feed({ totalReviewsCount: 251 })))
      .mockResolvedValueOnce(respond({ error: 'down' }, 500));
    const { loadGoogleReviews, displaySnapshot } = await loadHook(fetchSpy);

    const first = await loadGoogleReviews();
    const refreshed = await loadGoogleReviews(true);

    expect(first).toMatchObject({ totalReviewsCount: 251, live: true });
    expect(refreshed).toBe(first);
    expect(displaySnapshot()).toBe(first);
  });

  it('shares one request between callers and reuses the loaded numbers until a refresh is forced', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(respond(feed())).mockResolvedValueOnce(respond(feed({ totalReviewsCount: 260 })));
    const { loadGoogleReviews } = await loadHook(fetchSpy);

    const [a, b] = await Promise.all([loadGoogleReviews(), loadGoogleReviews()]);
    expect(a).toBe(b);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await expect(loadGoogleReviews()).resolves.toBe(a);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await expect(loadGoogleReviews(true)).resolves.toMatchObject({ totalReviewsCount: 260, live: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
