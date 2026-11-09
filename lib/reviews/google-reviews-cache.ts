import 'server-only';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import {
  configuredPlacesKey,
  fetchNewestGoogleReviews,
  type GoogleReview,
  type StoredReviewsSnapshot,
} from './google-reviews-source';
import { readReviewsSnapshot, saveReviewsSnapshot } from './reviews-snapshot-store';
import type { ReviewLanguage } from './review-language';

export type { GoogleReview, StoredReviewsSnapshot } from './google-reviews-source';

/**
 * Visitors never reach Google. `GET /api/reviews` serves the stored snapshot that the twice-daily
 * refresh (06:00 and 17:00 Israel time, `.github/workflows/google-reviews-snapshot.yml` calling
 * `POST /api/reviews/refresh`) wrote to the snapshot store. This module only memoises that stored
 * row per process for a minute so a busy page does not read the database on every request; the
 * memo is dropped as soon as this process writes a new snapshot.
 */
const READ_MEMO_TTL_MS = 60 * 1000;

export interface GoogleReviewsSnapshot {
  /** When Google was last read for this snapshot. */
  lastUpdated: string;
  source: string;
  /** Language the review texts were requested in. */
  language: ReviewLanguage;
  overallRating: number;
  totalReviewsCount: number;
  directReviewsUrl: string;
  reviews: GoogleReview[];
}

export class ReviewsNotConfiguredError extends Error {
  constructor() {
    super('GOOGLE_PLACES_API_KEY is not configured.');
    this.name = 'ReviewsNotConfiguredError';
  }
}

let memo: { readAt: number; snapshot: StoredReviewsSnapshot | null } | null = null;

function unavailableSnapshot(now: number, language: ReviewLanguage, reason: string): GoogleReviewsSnapshot {
  return {
    lastUpdated: new Date(now).toISOString(),
    source: reason,
    language,
    overallRating: 0,
    totalReviewsCount: 0,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: [],
  };
}

function toSnapshot(stored: StoredReviewsSnapshot, language: ReviewLanguage): GoogleReviewsSnapshot {
  return {
    lastUpdated: stored.fetchedAt,
    source: stored.source,
    language,
    overallRating: stored.overallRating,
    totalReviewsCount: stored.totalReviewsCount,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: stored.reviewsByLanguage[language] ?? [],
  };
}

async function storedSnapshot(now: number): Promise<StoredReviewsSnapshot | null> {
  if (memo && now - memo.readAt < READ_MEMO_TTL_MS) return memo.snapshot;
  const snapshot = await readReviewsSnapshot();
  memo = { readAt: now, snapshot };
  return snapshot;
}

/**
 * The stored snapshot in the page language; never a Google call. Without a stored snapshot (or
 * with storage unavailable) it reports zeros and no reviews, and the browser shows its labelled
 * last-known rating instead.
 */
export async function getCachedGoogleReviews(language: ReviewLanguage = 'en'): Promise<GoogleReviewsSnapshot> {
  const now = Date.now();
  try {
    const stored = await storedSnapshot(now);
    if (stored) return toSnapshot(stored, language);
    return unavailableSnapshot(now, language, 'No Google reviews snapshot has been stored yet; no review data is served.');
  } catch (error) {
    console.warn('Google reviews snapshot is unavailable; no review data is served', error instanceof Error ? error.message : error);
    return unavailableSnapshot(now, language, 'Google reviews snapshot storage is unavailable; no review data is served.');
  }
}

/**
 * Reads Google once (all six languages, newest first) and replaces the stored snapshot. Throws
 * `ReviewsNotConfiguredError` without a Places key, `PersistenceError` when production has no
 * storage, and `GoogleReviewsSourceError` when Google refuses; the caller maps those to statuses.
 */
export async function refreshGoogleReviewsSnapshot(now = new Date()): Promise<StoredReviewsSnapshot> {
  const key = configuredPlacesKey();
  if (!key) throw new ReviewsNotConfiguredError();
  const snapshot = await fetchNewestGoogleReviews({ key, now });
  await saveReviewsSnapshot(snapshot);
  memo = { readAt: now.getTime(), snapshot };
  return snapshot;
}

/**
 * Admin sync (`POST /api/reviews`): refreshes from Google when a key is configured, otherwise
 * reports the stored state so an operator sees `refreshed: false` instead of a stale success.
 */
export async function syncGoogleReviews() {
  const refreshed = configuredPlacesKey() !== null;
  if (refreshed) await refreshGoogleReviewsSnapshot();
  const snapshot = await getCachedGoogleReviews('en');
  return {
    success: true as const,
    refreshed,
    syncedAt: snapshot.lastUpdated,
    totalReviews: snapshot.totalReviewsCount,
    rating: snapshot.overallRating,
    reviews: snapshot.reviews,
  };
}
