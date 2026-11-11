import 'server-only';

import { FACILITY_INFO } from '@/lib/config/facility-info';
import { REVIEW_LANGUAGES, type ReviewLanguage } from './review-language';
import { reviewLanguageFromGoogle, ReviewTranslationError, translateTexts } from './review-translation';

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
 *
 * Google never translates reviews (see `review-translation.ts`): the one newest-first read is made
 * untranslated, and Google Cloud Translation renders each review into the page languages it was
 * not written in. When translation is unavailable (API not enabled, quota, outage) the originals
 * are served as they are, so the bar never goes empty for a translation problem.
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
  /** Key for Cloud Translation; defaults to the Places key (one key, two APIs allowed on it). */
  translationKey?: string | null;
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

/** `GOOGLE_TRANSLATE_API_KEY` when set, else the Places key (the same key may allow both APIs). */
export function configuredTranslationKey(): string | null {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  return key && !PLACEHOLDER_VALUES.some((placeholder) => key.includes(placeholder)) ? key : configuredPlacesKey();
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
 * Reads the newest reviews from Google once, untranslated, then asks Cloud Translation for each
 * page language once with every review not written in it. Star-only reviews (no text) are not
 * quotable and are dropped. A review keeps the same id in every language so the "Show original"
 * state follows it. One Atmosphere request plus at most six translation requests per call; the
 * snapshot workflow makes two calls a day.
 */
export async function fetchNewestGoogleReviews({ key, translationKey = key, fetchImpl = fetch, now = new Date() }: FetchGoogleReviewsOptions): Promise<StoredReviewsSnapshot> {
  const originals = await readPlaceDetails(fetchImpl, placeDetailsUrl(key, { reviews_no_translations: 'true' }));

  const written = (originals.reviews ?? [])
    .map((review) => {
      const text = review.text?.trim();
      const author = review.author_name?.trim();
      if (!text || !author) return null;
      const publishedMs = publishedAtMs(review);
      return {
        id: reviewId(review),
        author,
        authorUrl: safeHttpsUrl(review.author_url),
        authorPhotoUrl: safeHttpsUrl(review.profile_photo_url, GOOGLE_AUTHOR_PHOTO_HOSTS),
        rating: typeof review.rating === 'number' ? review.rating : 0,
        relativeTime: review.relative_time_description || '',
        publishedAt: publishedMs ? new Date(publishedMs).toISOString() : '',
        text,
        language: reviewLanguageFromGoogle(review.original_language ?? review.language),
      };
    })
    .filter((review): review is NonNullable<typeof review> => review !== null);

  let translationFailure: string | null = null;
  const reviewsByLanguage = {} as Record<ReviewLanguage, GoogleReview[]>;
  for (const language of REVIEW_LANGUAGES) {
    const foreign = written.filter((review) => review.language !== language);
    const translated = new Map<string, { text: string; detectedLanguage: ReviewLanguage | null }>();
    if (foreign.length > 0 && translationKey && translationFailure === null) {
      try {
        const results = await translateTexts({ key: translationKey, texts: foreign.map((review) => review.text), target: language, fetchImpl });
        foreign.forEach((review, index) => translated.set(review.id, results[index]));
      } catch (error) {
        // One warning per refresh; every language then serves the originals until the next refresh.
        translationFailure = error instanceof ReviewTranslationError ? error.message : 'Cloud Translation request failed.';
        console.warn('Google reviews translation unavailable; serving originals', translationFailure);
      }
    }
    reviewsByLanguage[language] = sortNewestFirst(
      written.map(({ text, language: writtenLanguage, ...core }): GoogleReview => {
        const translation = translated.get(core.id);
        const originalLanguage = writtenLanguage ?? translation?.detectedLanguage ?? language;
        if (!translation || translation.text === text) {
          return { ...core, quote: text, language: originalLanguage, original: null, characterCount: text.length };
        }
        return {
          ...core,
          quote: translation.text,
          language,
          original: { text, language: originalLanguage },
          characterCount: translation.text.length,
        };
      })
    );
  }

  return {
    fetchedAt: now.toISOString(),
    source: `Google Places API, legacy Place Details with reviews_sort=newest (Place ID: ${FACILITY_INFO.placeId})${translationFailure ? '; originals only, Cloud Translation unavailable' : '; translations by Google Cloud Translation'}`,
    overallRating: typeof originals.rating === 'number' ? originals.rating : 0,
    totalReviewsCount: typeof originals.user_ratings_total === 'number' ? originals.user_ratings_total : 0,
    reviewsByLanguage,
  };
}
