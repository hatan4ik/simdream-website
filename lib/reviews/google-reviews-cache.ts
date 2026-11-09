import 'server-only';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import { isReviewLanguage, type ReviewLanguage } from './review-language';

/**
 * Browser-facing feed freshness. Every page open or refresh asks this route for the current Google
 * rating and review count; one shared Places lookup per minute and language keeps that effectively
 * live while a busy day still costs a few hundred Places calls, not one per visitor.
 */
const CACHE_TTL_MS = 60 * 1000;
const PLACEHOLDER_VALUES = ['your_', 'your-', 'example', 'placeholder', '...'];

/** Google Maps author photos are served from this host (allowed in the CSP img-src, proxy.ts). */
const GOOGLE_AUTHOR_PHOTO_HOSTS = ['lh3.googleusercontent.com'];

export interface GoogleReview {
  id: string;
  author: string;
  /** Google Maps profile of the author, for the policy's author attribution. */
  authorUrl: string | null;
  authorPhotoUrl: string | null;
  rating: number;
  /** The review text in the requested language: Google's translation, or the original when it already is that language. */
  quote: string;
  relativeTime: string;
  /** RFC 3339 publish time from Google, or an empty string when Google supplied none. */
  publishedAt: string;
  /** Language of `quote`. */
  language: ReviewLanguage;
  /** The text as written when it differs from `quote`, so a reader can switch to the original (Places policy). */
  original: { text: string; language: ReviewLanguage } | null;
  characterCount: number;
}

export interface GoogleReviewsSnapshot {
  lastUpdated: string;
  source: string;
  /** Language the review texts were requested in. */
  language: ReviewLanguage;
  overallRating: number;
  totalReviewsCount: number;
  directReviewsUrl: string;
  reviews: GoogleReview[];
}

interface ReviewsCacheStore {
  timestamp: number;
  snapshot: GoogleReviewsSnapshot;
}

interface GooglePlacesLocalizedText {
  text?: string;
  languageCode?: string;
}

interface GooglePlacesReview {
  name?: string;
  rating?: number;
  text?: GooglePlacesLocalizedText;
  originalText?: GooglePlacesLocalizedText;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
}

interface GooglePlacesResponse {
  rating?: number;
  userRatingCount?: number;
  reviews?: GooglePlacesReview[];
}

const memoryCache = new Map<ReviewLanguage, ReviewsCacheStore>();

function configuredPlacesKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key && !PLACEHOLDER_VALUES.some((placeholder) => key.includes(placeholder)) ? key : null;
}

// Google still tags Hebrew with the legacy BCP-47 code "iw" (seen on the live listing); the page uses "he".
const LEGACY_LANGUAGE_CODES: Record<string, ReviewLanguage> = { iw: 'he' };

function reviewLanguage(value: string | undefined, fallback: ReviewLanguage): ReviewLanguage {
  const language = value?.toLowerCase().slice(0, 2) ?? '';
  const normalized = LEGACY_LANGUAGE_CODES[language] ?? language;
  return isReviewLanguage(normalized) ? normalized : fallback;
}

function safeHttpsUrl(value: string | undefined, allowedHosts?: readonly string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (allowedHosts && !allowedHosts.includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

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

async function fetchGooglePlacesSnapshot(now: number, language: ReviewLanguage): Promise<GoogleReviewsSnapshot | null> {
  const key = configuredPlacesKey();
  if (!key) return null;

  // `languageCode` makes Google return `text` translated into the visitor's language and `originalText`
  // as written, so the page can offer "show original" without translating anything itself.
  const url = new URL(`https://places.googleapis.com/v1/places/${FACILITY_INFO.placeId}`);
  url.searchParams.set('languageCode', language);
  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'rating,userRatingCount,reviews.name,reviews.rating,reviews.text,reviews.originalText,reviews.relativePublishTimeDescription,reviews.authorAttribution,reviews.publishTime',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Google Places returned ${response.status}.`);

  const payload = await response.json() as GooglePlacesResponse;
  const reviews = (payload.reviews || [])
    .map((review, index): (GoogleReview & { publishedAtMs: number }) | null => {
      const quote = review.text?.text?.trim();
      const author = review.authorAttribution?.displayName?.trim();
      if (!quote || !author) return null;
      const parsedPublishedAt = review.publishTime ? Date.parse(review.publishTime) : Number.NaN;
      const publishedAtMs = Number.isFinite(parsedPublishedAt) ? parsedPublishedAt : 0;
      const quoteLanguage = reviewLanguage(review.text?.languageCode, language);
      const originalText = review.originalText?.text?.trim();
      const original =
        originalText && originalText !== quote
          ? { text: originalText, language: reviewLanguage(review.originalText?.languageCode, quoteLanguage) }
          : null;
      return {
        id: review.name || `google-${index}`,
        author,
        authorUrl: safeHttpsUrl(review.authorAttribution?.uri),
        authorPhotoUrl: safeHttpsUrl(review.authorAttribution?.photoUri, GOOGLE_AUTHOR_PHOTO_HOSTS),
        rating: typeof review.rating === 'number' ? review.rating : 0,
        quote,
        relativeTime: review.relativePublishTimeDescription || '',
        publishedAt: publishedAtMs ? new Date(publishedAtMs).toISOString() : '',
        language: quoteLanguage,
        original,
        characterCount: quote.length,
        publishedAtMs,
      };
    })
    .filter((review): review is GoogleReview & { publishedAtMs: number } => review !== null)
    // Google returns at most five relevance-ranked reviews; they are shown newest first. The page
    // says so next to them (Places policy: state how reviews are ordered).
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs || b.rating - a.rating || b.characterCount - a.characterCount)
    .map(({ publishedAtMs: _publishedAtMs, ...review }) => review);

  return {
    lastUpdated: new Date(now).toISOString(),
    source: `Google Places API (Place ID: ${FACILITY_INFO.placeId})`,
    language,
    overallRating: typeof payload.rating === 'number' ? payload.rating : 0,
    totalReviewsCount: typeof payload.userRatingCount === 'number' ? payload.userRatingCount : 0,
    directReviewsUrl: FACILITY_INFO.googleReviewsDirectUrl,
    reviews,
  };
}

/** Returns only data supplied by Google Places; absent or failed refreshes return no review claims. */
export async function getCachedGoogleReviews(
  forceRefresh = false,
  language: ReviewLanguage = 'en'
): Promise<GoogleReviewsSnapshot> {
  const now = Date.now();
  const cached = memoryCache.get(language);
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  let snapshot: GoogleReviewsSnapshot;
  try {
    snapshot =
      (await fetchGooglePlacesSnapshot(now, language)) ||
      unavailableSnapshot(now, language, 'Google Places API is not configured; no review data is served.');
  } catch {
    console.warn('Google Places refresh failed; no review data is served');
    snapshot = unavailableSnapshot(now, language, 'Google Places API refresh failed; no review data is served.');
  }
  memoryCache.set(language, { timestamp: now, snapshot });
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
