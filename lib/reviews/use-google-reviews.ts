'use client';

import { useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n/translations';

export interface LiveGoogleReview {
  id: string;
  author: string;
  rating: number;
  quote: string;
  relativeTime: string;
  language: Language;
}

export interface LiveGoogleReviewsSnapshot {
  overallRating: number;
  totalReviewsCount: number;
  directReviewsUrl: string;
  reviews: LiveGoogleReview[];
}

/** A tab left open is refreshed when it is shown again once its numbers are older than this. */
const STALE_AFTER_MS = 60_000;

let cachedSnapshot: LiveGoogleReviewsSnapshot | null = null;
let cachedAt = 0;
let snapshotRequest: Promise<LiveGoogleReviewsSnapshot | null> | null = null;

function isUsableSnapshot(value: unknown): value is LiveGoogleReviewsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<LiveGoogleReviewsSnapshot>;
  return (
    typeof snapshot.overallRating === 'number' &&
    snapshot.overallRating > 0 &&
    typeof snapshot.totalReviewsCount === 'number' &&
    snapshot.totalReviewsCount > 0 &&
    typeof snapshot.directReviewsUrl === 'string' &&
    Array.isArray(snapshot.reviews) &&
    snapshot.reviews.length > 0
  );
}

/**
 * Fetch the public Google snapshot. A page load starts with an empty module cache, so every open or
 * refresh asks the server for the current rating and review count. The utility bar and the home-page
 * carousel share one request and one response, so their numbers never disagree during a visit.
 * A failed refresh keeps the last good numbers instead of blanking them.
 */
async function loadGoogleReviews(force = false): Promise<LiveGoogleReviewsSnapshot | null> {
  if (!force && cachedSnapshot) return cachedSnapshot;
  if (snapshotRequest) return snapshotRequest;

  snapshotRequest = fetch('/api/reviews', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) return cachedSnapshot;
      const data = await response.json();
      if (!isUsableSnapshot(data)) return cachedSnapshot;
      cachedSnapshot = data;
      cachedAt = Date.now();
      return data;
    })
    .catch(() => cachedSnapshot)
    .finally(() => {
      snapshotRequest = null;
    });

  return snapshotRequest;
}

/**
 * Browser-facing Google review data. A missing/failed source intentionally has
 * no made-up local review fallback: callers can offer the direct Google link.
 */
export function useGoogleReviews(): LiveGoogleReviewsSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveGoogleReviewsSnapshot | null>(() => cachedSnapshot);

  useEffect(() => {
    let mounted = true;
    const apply = (nextSnapshot: LiveGoogleReviewsSnapshot | null) => {
      if (mounted) setSnapshot(nextSnapshot);
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
