'use client';

import { useEffect, useState } from 'react';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { useLanguage } from '@/lib/i18n/language-context';
import lastKnownRating from '@/lib/reviews/last-known-rating.json';
import type { ReviewLanguage } from '@/lib/reviews/review-language';

export interface LiveGoogleReview {
  id: string;
  author: string;
  authorUrl?: string | null;
  authorPhotoUrl?: string | null;
  rating: number;
  /** Review text in the page language (Google's translation, or the original when already that language). */
  quote: string;
  relativeTime: string;
  /** RFC 3339 publish time, when Google supplied one. */
  publishedAt?: string;
  language: ReviewLanguage;
  /** The text as written, when it differs from `quote`. */
  original?: { text: string; language: ReviewLanguage } | null;
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
 * The aggregate shown on the Google listing (grade and count only, never review text). It is the
 * only thing shown while the server has no Google data (the Places key is not configured, or a
 * refresh failed), so the bar never draws an empty rating. It is never presented as a fresh fetch,
 * and Google's own numbers replace it as soon as /api/reviews returns them. The numbers live in
 * last-known-rating.json, which .github/workflows/google-rating-refresh.yml refreshes weekly from
 * the official Places API (New); do not edit them by hand.
 */
export const LAST_KNOWN_GOOGLE_RATING = lastKnownRating;

const LAST_KNOWN_SNAPSHOT: LiveGoogleReviewsSnapshot = {
  ...LAST_KNOWN_GOOGLE_RATING,
  directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
  reviews: [],
  live: false,
};

/** A tab left open is refreshed when it is shown again once its numbers are older than this. */
const STALE_AFTER_MS = 60_000;

// One snapshot per language: the review texts are translated by Google into the page language, so
// switching language asks the server again while the rating and count stay the same numbers.
const cachedSnapshots = new Map<ReviewLanguage, LiveGoogleReviewsSnapshot>();
const cachedAt = new Map<ReviewLanguage, number>();
const snapshotRequests = new Map<ReviewLanguage, Promise<LiveGoogleReviewsSnapshot | null>>();

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

/** The last good snapshot for this language, else for any language (the numbers are the same). */
function lastGoodSnapshot(language: ReviewLanguage): LiveGoogleReviewsSnapshot | null {
  return cachedSnapshots.get(language) ?? cachedSnapshots.values().next().value ?? null;
}

/**
 * Fetch the public Google snapshot in the page language. A page load starts with an empty module
 * cache, so every open or refresh asks the server for the stored rating and review count (the
 * server never calls Google for a page view: it serves the twice-daily snapshot). One request and
 * one response per language; the header utility bar is the only reader. A failed request keeps
 * the last good numbers instead of blanking them.
 */
export async function loadGoogleReviews(force = false, language: ReviewLanguage = 'en'): Promise<LiveGoogleReviewsSnapshot | null> {
  const cached = cachedSnapshots.get(language);
  if (!force && cached) return cached;
  const inFlight = snapshotRequests.get(language);
  if (inFlight) return inFlight;

  const request = fetch(`/api/reviews?lang=${language}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) return lastGoodSnapshot(language);
      const data = await response.json();
      if (!isUsableFeed(data)) return lastGoodSnapshot(language);
      const snapshot: LiveGoogleReviewsSnapshot = { ...data, live: true };
      cachedSnapshots.set(language, snapshot);
      cachedAt.set(language, Date.now());
      return snapshot;
    })
    .catch(() => lastGoodSnapshot(language))
    .finally(() => {
      snapshotRequests.delete(language);
    });
  snapshotRequests.set(language, request);

  return request;
}

/** What the bar shows right now: the newest snapshot, else the last good one, else the last-known rating. */
export function displaySnapshot(
  next: LiveGoogleReviewsSnapshot | null = null,
  language: ReviewLanguage = 'en'
): LiveGoogleReviewsSnapshot {
  return next ?? lastGoodSnapshot(language) ?? LAST_KNOWN_SNAPSHOT;
}

/**
 * Browser-facing Google review data in the page language. It starts from the current numbers, or
 * the labelled last-known rating, so the first paint already shows the grade and count. There are
 * no made-up review texts: `reviews` is empty unless Google supplied them.
 */
export function useGoogleReviews(): LiveGoogleReviewsSnapshot {
  const { language, languageResolved } = useLanguage();
  const [snapshot, setSnapshot] = useState<LiveGoogleReviewsSnapshot>(() => displaySnapshot(null, language));

  useEffect(() => {
    // Wait for the saved language: fetching for the server default and again for the visitor's
    // language would cost two Places lookups per page open.
    if (!languageResolved) return;
    let mounted = true;
    const apply = (nextSnapshot: LiveGoogleReviewsSnapshot | null) => {
      if (mounted) setSnapshot(displaySnapshot(nextSnapshot, language));
    };
    setSnapshot(displaySnapshot(null, language));
    void loadGoogleReviews(false, language).then(apply);

    // Coming back to a tab that has been open for a while shows the current count again.
    const refreshWhenShown = () => {
      if (document.visibilityState !== 'visible' || Date.now() - (cachedAt.get(language) ?? 0) < STALE_AFTER_MS) return;
      void loadGoogleReviews(true, language).then(apply);
    };
    document.addEventListener('visibilitychange', refreshWhenShown);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', refreshWhenShown);
    };
  }, [language, languageResolved]);

  return snapshot;
}
