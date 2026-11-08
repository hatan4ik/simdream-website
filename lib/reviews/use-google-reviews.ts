'use client';

import { useEffect, useState } from 'react';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { Language } from '@/lib/i18n/translations';

export interface LiveGoogleReview {
  id: string;
  author: string;
  rating: number;
  quote: string;
  relativeTime: string;
  language: Language;
}

type GoogleReviewsFeed = {
  overallRating: number;
  totalReviewsCount: number;
  directReviewsUrl: string;
  reviews: LiveGoogleReview[];
};

export interface LiveGoogleReviewsSnapshot extends GoogleReviewsFeed {
  /** True when the numbers came from Google through /api/reviews, false for the last-known rating below. */
  live: boolean;
}

/**
 * The aggregate shown on the Google listing, read from the screenshot the owner supplied on
 * 2026-11-08 (5.0 from 422 reviews). It is the only thing shown while the server has no Google data
 * (the Places key is not configured, or a refresh failed), so the bar never draws an empty rating.
 * It carries no review text, is never presented as a fresh fetch, and Google's own numbers replace
 * it as soon as /api/reviews returns them. Update it when the listing's totals change.
 */
export const LAST_KNOWN_GOOGLE_RATING = { overallRating: 5, totalReviewsCount: 422 } as const;

const LAST_KNOWN_SNAPSHOT: LiveGoogleReviewsSnapshot = {
  ...LAST_KNOWN_GOOGLE_RATING,
  directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
  reviews: [],
  live: false,
};

/** A tab left open is refreshed when it is shown again once its numbers are older than this. */
const STALE_AFTER_MS = 60_000;

let cachedSnapshot: LiveGoogleReviewsSnapshot | null = null;
let cachedAt = 0;
let snapshotRequest: Promise<LiveGoogleReviewsSnapshot | null> | null = null;

/** A feed is usable when Google supplied a rating and a count; the review texts may be absent. */
function isUsableFeed(value: unknown): value is GoogleReviewsFeed {
  if (!value || typeof value !== 'object') return false;
  const feed = value as Partial<GoogleReviewsFeed>;
  return (
    typeof feed.overallRating === 'number' &&
    feed.overallRating > 0 &&
    typeof feed.totalReviewsCount === 'number' &&
    feed.totalReviewsCount > 0 &&
    typeof feed.directReviewsUrl === 'string' &&
    Array.isArray(feed.reviews)
  );
}

/**
 * Fetch the public Google snapshot. A page load starts with an empty module cache, so every open or
 * refresh asks the server for the current rating and review count. The utility bar and the home-page
 * carousel share one request and one response, so their numbers never disagree during a visit.
 * A failed refresh keeps the last good numbers instead of blanking them.
 */
export async function loadGoogleReviews(force = false): Promise<LiveGoogleReviewsSnapshot | null> {
  if (!force && cachedSnapshot) return cachedSnapshot;
  if (snapshotRequest) return snapshotRequest;

  snapshotRequest = fetch('/api/reviews', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) return cachedSnapshot;
      const data = await response.json();
      if (!isUsableFeed(data)) return cachedSnapshot;
      cachedSnapshot = { ...data, live: true };
      cachedAt = Date.now();
      return cachedSnapshot;
    })
    .catch(() => cachedSnapshot)
    .finally(() => {
      snapshotRequest = null;
    });

  return snapshotRequest;
}

/** What the bar shows right now: the newest snapshot, else the last good one, else the last-known rating. */
export function displaySnapshot(next: LiveGoogleReviewsSnapshot | null = null): LiveGoogleReviewsSnapshot {
  return next ?? cachedSnapshot ?? LAST_KNOWN_SNAPSHOT;
}

/**
 * Browser-facing Google review data. It starts from the current numbers, or the labelled last-known
 * rating, so the first paint already shows the grade and count. There are no made-up review texts:
 * `reviews` is empty unless Google supplied them.
 */
export function useGoogleReviews(): LiveGoogleReviewsSnapshot {
  const [snapshot, setSnapshot] = useState<LiveGoogleReviewsSnapshot>(() => displaySnapshot());

  useEffect(() => {
    let mounted = true;
    const apply = (nextSnapshot: LiveGoogleReviewsSnapshot | null) => {
      if (mounted) setSnapshot(displaySnapshot(nextSnapshot));
    };
    void loadGoogleReviews().then(apply);

    // Coming back to a tab that has been open for a while shows the current count again.
    const refreshWhenShown = () => {
      if (document.visibilityState !== 'visible' || Date.now() - cachedAt < STALE_AFTER_MS) return;
      void loadGoogleReviews(true).then(apply);
    };
    document.addEventListener('visibilitychange', refreshWhenShown);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', refreshWhenShown);
    };
  }, []);

  return snapshot;
}
