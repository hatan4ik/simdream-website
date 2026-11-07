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

let cachedSnapshot: LiveGoogleReviewsSnapshot | null = null;
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
 * Fetch the public Google snapshot once per browser session. The utility bar and
 * the home-page carousel consume the same immutable response, avoiding duplicate
 * API calls and ensuring their rating/count never disagree during a visit.
 */
async function loadGoogleReviews(): Promise<LiveGoogleReviewsSnapshot | null> {
  if (cachedSnapshot) return cachedSnapshot;
  if (snapshotRequest) return snapshotRequest;

  snapshotRequest = fetch('/api/reviews', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      if (!isUsableSnapshot(data)) return null;
      cachedSnapshot = data;
      return data;
    })
    .catch(() => null)
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
    void loadGoogleReviews().then((nextSnapshot) => {
      if (mounted) setSnapshot(nextSnapshot);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return snapshot;
}
