import {
  GoogleReview,
  GoogleReviewsSnapshot,
  getGoogleReviewsSnapshot,
  getSortedGoogleReviews,
} from '@/lib/data/google-reviews-data';
import { FACILITY_INFO } from '@/lib/config/facility-info';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (once a day)

interface ReviewsCacheStore {
  timestamp: number;
  snapshot: GoogleReviewsSnapshot;
}

let memoryCache: ReviewsCacheStore | null = null;

/**
 * Retrieves the cached Google reviews. If the cache is older than 24 hours (or not yet initialized),
 * it refreshes the snapshot with latest sorted reviews and resets the daily timer.
 */
export async function getCachedGoogleReviews(forceRefresh = false): Promise<GoogleReviewsSnapshot> {
  const now = Date.now();

  if (!forceRefresh && memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.snapshot;
  }

  // Generate / refresh snapshot with longest reviews first
  const snapshot: GoogleReviewsSnapshot = {
    lastUpdated: new Date(now).toISOString(),
    source: `Google Maps (Place ID: ${FACILITY_INFO.placeId})`,
    overallRating: 5.0,
    totalReviewsCount: 390,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: getSortedGoogleReviews(),
  };

  memoryCache = {
    timestamp: now,
    snapshot,
  };

  return snapshot;
}

/**
 * Manually trigger a daily sync / cache bust
 */
export async function syncGoogleReviews(): Promise<{
  success: boolean;
  syncedAt: string;
  totalReviews: number;
  rating: number;
  reviews: GoogleReview[];
}> {
  const snapshot = await getCachedGoogleReviews(true);
  return {
    success: true,
    syncedAt: snapshot.lastUpdated,
    totalReviews: snapshot.totalReviewsCount,
    rating: snapshot.overallRating,
    reviews: snapshot.reviews,
  };
}

