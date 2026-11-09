import 'server-only';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import { isReviewLanguage, REVIEW_LANGUAGES, type ReviewLanguage } from './review-language';

/**
 * Google is the only source of review texts, and it is read here alone. Place Details in
 * Places API (New) returns "up to five reviews, sorted by relevance" and offers no sort
 * parameter (https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places,
 * `reviews[]`), so the five it picks are months-old favourites. The legacy Place Details web
 * service is the one Google endpoint with `reviews_sort=newest`
 * (https://developers.google.com/maps/documentation/places/web-service/legacy/details); it needs
 * "Places API" (legacy, `places-backend.googleapis.com`) enabled on the Cloud project and in the
 * key's API restriction. Each call asks for the Atmosphere fields only (`reviews,rating,
 * user_ratings_total`). Nothing is scraped from google.com/maps.
 */
const LEGACY_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
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

/** One Google pull: the aggregate plus the newest reviews translated into each of the six page languages. */
export interface StoredReviewsSnapshot {
  /** When Google was read (RFC 3339). */
  fetchedAt: string;
  source: string;
  overallRating: number;
  totalReviewsCount: number;
  reviewsByLanguage: Record<ReviewLanguage, GoogleReview[]>;
}

interface LegacyPlaceReview {
  author_name?: string;
  author_url?: string;
  profile_photo_url?: string;
  rating?: number;
  relative_time_description?: string;
  text?: string;
  /** Seconds since the Unix epoch. */
  time?: number;
  language?: string;
  original_language?: string;
  translated?: boolean;
}

interface LegacyPlaceDetailsResponse {
  status?: string;
  error_message?: string;
  result?: { rating?: number; user_ratings_total?: number; reviews?: LegacyPlaceReview[] };
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface FetchGoogleReviewsOptions {
  key: string;
  fetchImpl?: FetchLike;
  now?: Date;
}

export class GoogleReviewsSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleReviewsSourceError';
  }
}

export function configuredPlacesKey(): string | null {
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

/** Legacy reviews carry no id: the publish second plus a hash of the author name identifies one across languages. */
function reviewId(review: LegacyPlaceReview): string {
  let hash = 5381;
  for (const char of review.author_name ?? '') hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return `google-${review.time ?? 0}-${hash.toString(36)}`;
}

function publishedAtMs(review: LegacyPlaceReview): number {
  return typeof review.time === 'number' && Number.isFinite(review.time) && review.time > 0 ? review.time * 1000 : 0;
}

/**
 * Newest first, strictly by publish time (Google's `reviews_sort=newest` is kept as a safety net,
 * never trusted): ties fall back to the higher rating, then the longer text.
 */
export function sortNewestFirst<T extends { publishedAt: string; rating: number; characterCount: number }>(reviews: readonly T[]): T[] {
  const time = (review: T) => {
    const parsed = Date.parse(review.publishedAt);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return [...reviews].sort((a, b) => time(b) - time(a) || b.rating - a.rating || b.characterCount - a.characterCount);
}

function placeDetailsUrl(key: string, params: Record<string, string>): string {
  const url = new URL(LEGACY_PLACE_DETAILS_URL);
  url.searchParams.set('place_id', FACILITY_INFO.placeId);
  url.searchParams.set('fields', 'reviews,rating,user_ratings_total');
  url.searchParams.set('reviews_sort', 'newest');
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', key);
  return url.toString();
}

async function readPlaceDetails(fetchImpl: FetchLike, url: string): Promise<NonNullable<LegacyPlaceDetailsResponse['result']>> {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new GoogleReviewsSourceError(`Google Places returned ${response.status}.`);
  const payload = (await response.json()) as LegacyPlaceDetailsResponse;
  if (payload.status !== 'OK' || !payload.result) {
    // The error message is Google's own text about the request (quota, key restriction); never the key.
    throw new GoogleReviewsSourceError(`Google Places answered ${payload.status ?? 'no status'}${payload.error_message ? `: ${payload.error_message}` : ''}.`);
  }
  return payload.result;
}

/**
 * Reads the newest reviews from Google once for each of the six page languages (Google translates
 * `text` into `language` and marks `translated`) plus once untranslated, so every review keeps the
 * text as written for the "Show original" switch. Star-only reviews (no text) are not quotable and
 * are dropped. Seven Atmosphere requests per call; the snapshot workflow makes two calls a day.
 */
export async function fetchNewestGoogleReviews({ key, fetchImpl = fetch, now = new Date() }: FetchGoogleReviewsOptions): Promise<StoredReviewsSnapshot> {
  const originals = await readPlaceDetails(fetchImpl, placeDetailsUrl(key, { reviews_no_translations: 'true' }));
  const originalById = new Map<string, { text: string; language: ReviewLanguage | undefined }>();
  for (const review of originals.reviews ?? []) {
    const text = review.text?.trim();
    if (!text) continue;
    const written = review.original_language ?? review.language;
    originalById.set(reviewId(review), { text, language: written ? reviewLanguage(written, 'en') : undefined });
  }

  const reviewsByLanguage = {} as Record<ReviewLanguage, GoogleReview[]>;
  for (const language of REVIEW_LANGUAGES) {
    const localized = await readPlaceDetails(fetchImpl, placeDetailsUrl(key, { language }));
    const reviews = (localized.reviews ?? [])
      .map((review): GoogleReview | null => {
        const quote = review.text?.trim();
        const author = review.author_name?.trim();
        if (!quote || !author) return null;
        const id = reviewId(review);
        const quoteLanguage = reviewLanguage(review.language, language);
        const written = originalById.get(id);
        const original =
          written && written.text !== quote
            ? { text: written.text, language: written.language ?? reviewLanguage(review.original_language, quoteLanguage) }
            : null;
        const publishedMs = publishedAtMs(review);
        return {
          id,
          author,
          authorUrl: safeHttpsUrl(review.author_url),
          authorPhotoUrl: safeHttpsUrl(review.profile_photo_url, GOOGLE_AUTHOR_PHOTO_HOSTS),
          rating: typeof review.rating === 'number' ? review.rating : 0,
          quote,
          relativeTime: review.relative_time_description || '',
          publishedAt: publishedMs ? new Date(publishedMs).toISOString() : '',
          language: quoteLanguage,
          original,
          characterCount: quote.length,
        };
      })
      .filter((review): review is GoogleReview => review !== null);
    reviewsByLanguage[language] = sortNewestFirst(reviews);
  }

  return {
    fetchedAt: now.toISOString(),
    source: `Google Places API, legacy Place Details with reviews_sort=newest (Place ID: ${FACILITY_INFO.placeId})`,
    overallRating: typeof originals.rating === 'number' ? originals.rating : 0,
    totalReviewsCount: typeof originals.user_ratings_total === 'number' ? originals.user_ratings_total : 0,
    reviewsByLanguage,
  };
}
