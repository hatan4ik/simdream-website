import 'server-only';

import { GoogleReview, GoogleReviewsSnapshot, getSortedGoogleReviews } from '@/lib/data/google-reviews-data';
import { FACILITY_INFO } from '@/lib/config/facility-info';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PLACEHOLDER_VALUES = ['your_', 'your-', 'example', 'placeholder', '...'];

interface ReviewsCacheStore {
  timestamp: number;
  snapshot: GoogleReviewsSnapshot;
}

interface GooglePlacesReview {
  name?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string };
}

interface GooglePlacesResponse {
  rating?: number;
  userRatingCount?: number;
  reviews?: GooglePlacesReview[];
}

let memoryCache: ReviewsCacheStore | null = null;

function configuredPlacesKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key && !PLACEHOLDER_VALUES.some((placeholder) => key.includes(placeholder)) ? key : null;
}

function reviewLanguage(value: string | undefined): GoogleReview['language'] {
  const language = value?.toLowerCase().slice(0, 2);
  return language === 'he' || language === 'ru' || language === 'fr' || language === 'ar' ? language : 'en';
}

function localFallbackSnapshot(now: number): GoogleReviewsSnapshot {
  return {
    lastUpdated: new Date(now).toISOString(),
    source: 'Local review snapshot (Google Places API is not configured)',
    overallRating: FACILITY_INFO.googleRating,
    totalReviewsCount: FACILITY_INFO.googleRatingCount,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: getSortedGoogleReviews(),
  };
}

async function fetchGooglePlacesSnapshot(now: number): Promise<GoogleReviewsSnapshot | null> {
  const key = configuredPlacesKey();
  if (!key) return null;

  const response = await fetch(`https://places.googleapis.com/v1/places/${FACILITY_INFO.placeId}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
    },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`Google Places returned ${response.status}.`);

  const payload = await response.json() as GooglePlacesResponse;
  const reviews = (payload.reviews || [])
    .map((review, index): GoogleReview | null => {
      const quote = review.text?.text?.trim();
      if (!quote) return null;
      return {
        id: review.name || `google-${index}`,
        author: review.authorAttribution?.displayName || 'Google reviewer',
        rating: typeof review.rating === 'number' ? review.rating : 0,
        quote,
        role: 'Google Maps review',
        relativeTime: review.relativePublishTimeDescription || '',
        language: reviewLanguage(review.text?.languageCode),
        characterCount: quote.length,
      };
    })
    .filter((review): review is GoogleReview => review !== null)
    .sort((a, b) => b.characterCount - a.characterCount);

  return {
    lastUpdated: new Date(now).toISOString(),
    source: `Google Places API (Place ID: ${FACILITY_INFO.placeId})`,
    overallRating: typeof payload.rating === 'number' ? payload.rating : FACILITY_INFO.googleRating,
    totalReviewsCount: typeof payload.userRatingCount === 'number'
      ? payload.userRatingCount
      : FACILITY_INFO.googleRatingCount,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews: reviews.length ? reviews : getSortedGoogleReviews(),
  };
}

/** Returns a sorted Google Places snapshot, with an explicitly-labelled local fallback. */
export async function getCachedGoogleReviews(forceRefresh = false): Promise<GoogleReviewsSnapshot> {
  const now = Date.now();
  if (!forceRefresh && memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.snapshot;
  }

  let snapshot: GoogleReviewsSnapshot;
  try {
    snapshot = (await fetchGooglePlacesSnapshot(now)) || localFallbackSnapshot(now);
  } catch (error) {
    console.warn('Google Places refresh failed; using local review snapshot');
    snapshot = localFallbackSnapshot(now);
  }
  memoryCache = { timestamp: now, snapshot };
  return snapshot;
}

export async function syncGoogleReviews() {
  const snapshot = await getCachedGoogleReviews(true);
  return {
    success: true,
    syncedAt: snapshot.lastUpdated,
    totalReviews: snapshot.totalReviewsCount,
    rating: snapshot.overallRating,
    reviews: snapshot.reviews,
  };
}
