import 'server-only';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import {
  configuredPlacesKey,
  configuredTranslationKey,
  fetchNewestGoogleReviews,
  type GoogleReview,
  type StoredReviewsSnapshot,
} from './google-reviews-source';
import { readReviewsSnapshot, saveReviewsSnapshot } from './reviews-snapshot-store';
import type { ReviewLanguage } from './review-language';
import { snapshotWindowId } from './snapshot-window';

export type { GoogleReview, StoredReviewsSnapshot } from './google-reviews-source';

/**
 * `GET /api/reviews` serves the snapshot that the twice-daily refresh (06:00 and 17:00 Israel time,
 * `.github/workflows/google-reviews-snapshot.yml` calling `POST /api/reviews/refresh`) wrote to the
 * snapshot store; that stored row is memoised per process for a minute so a busy page does not
 * read the database on every request, and the memo is dropped as soon as this process writes a
 * new snapshot.
 *
 * Without a stored snapshot (no refresh yet, or no snapshot store at all, which is the case on a
 * Wix site with no Supabase variables) the server keeps the same cadence itself: it reads Google
 * once per process per window (`snapshotWindowId()`, the 06:00 and 17:00 Israel boundaries) with
 * the same newest-first source, and serves that read until the next boundary. Visitors therefore
 * always see live, newest-first reviews; the stored snapshot only removes the per-process reads.
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
let liveWindow: { windowId: string; snapshot: StoredReviewsSnapshot } | null = null;
let liveInFlight: Promise<StoredReviewsSnapshot | null> | null = null;

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
 * One Google read per process per 06:00/17:00 Israel window, shared by concurrent requests. A
 * refused read keeps the previous window's snapshot (stale beats empty); the first read in a cold
 * process that Google refuses yields null.
 */
async function liveWindowSnapshot(now: number): Promise<StoredReviewsSnapshot | null> {
  const key = configuredPlacesKey();
  if (!key) return null;
  const windowId = snapshotWindowId(new Date(now));
  if (liveWindow?.windowId === windowId) return liveWindow.snapshot;
  if (liveInFlight) return liveInFlight;
  liveInFlight = fetchNewestGoogleReviews({ key, translationKey: configuredTranslationKey(), now: new Date(now) })
    .then((snapshot) => {
      liveWindow = {
        windowId,
        snapshot: { ...snapshot, source: `${snapshot.source} (read by this server for the ${windowId} Israel window; no snapshot store)` },
      };
      return liveWindow.snapshot;
    })
    .catch((error: unknown) => {
      console.warn('Google reviews window read failed; serving the previous window if any', error instanceof Error ? error.message : error);
      return liveWindow?.snapshot ?? null;
    })
    .finally(() => {
      liveInFlight = null;
    });
  return liveInFlight;
}

/**
 * The snapshot in the page language: the stored twice-daily snapshot when one exists, otherwise
 * this server's own once-per-window Google read. Only with no Places key, or when Google refuses
 * the very first read, does it report zeros and no reviews, and the browser then shows its labelled
 * last-known rating instead. Never throws.
 */
export async function getCachedGoogleReviews(language: ReviewLanguage = 'en'): Promise<GoogleReviewsSnapshot> {
  const now = Date.now();
  let storeUnavailable = false;
  try {
    const stored = await storedSnapshot(now);
    if (stored) return toSnapshot(stored, language);
  } catch (error) {
    storeUnavailable = true;
    console.warn('Google reviews snapshot store is unavailable; reading Google once per window instead', error instanceof Error ? error.message : error);
  }
  const live = await liveWindowSnapshot(now);
  if (live) return toSnapshot(live, language);
  if (!configuredPlacesKey()) {
    return unavailableSnapshot(now, language, storeUnavailable
      ? 'Google reviews snapshot storage is unavailable and GOOGLE_PLACES_API_KEY is not configured; no review data is served.'
      : 'No Google reviews snapshot has been stored yet and GOOGLE_PLACES_API_KEY is not configured; no review data is served.');
  }
  return unavailableSnapshot(now, language, 'Google refused the reviews read for this window; no review data is served until the next window.');
}

/**
 * Reads Google once (all six languages, newest first) and replaces the stored snapshot. Throws
 * `ReviewsNotConfiguredError` without a Places key, `PersistenceError` when production has no
 * storage, and `GoogleReviewsSourceError` when Google refuses; the caller maps those to statuses.
 */
export async function refreshGoogleReviewsSnapshot(now = new Date()): Promise<StoredReviewsSnapshot> {
  const key = configuredPlacesKey();
  if (!key) throw new ReviewsNotConfiguredError();
  const snapshot = await fetchNewestGoogleReviews({ key, translationKey: configuredTranslationKey(), now });
  await saveReviewsSnapshot(snapshot);
  memo = { readAt: now.getTime(), snapshot };
  liveWindow = null;
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
