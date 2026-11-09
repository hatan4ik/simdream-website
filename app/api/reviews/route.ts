import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { PersistenceError } from '@/lib/db/store';
import { getCachedGoogleReviews, ReviewsNotConfiguredError, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';
import { GoogleReviewsSourceError } from '@/lib/reviews/google-reviews-source';
import { isReviewLanguage } from '@/lib/reviews/review-language';

export const revalidate = 60; // Shared freshness: visitors read the stored snapshot, which changes twice a day.

/**
 * `?lang=` selects the language Google translated the review texts into (one of the site's six);
 * it is part of the URL, not a header, so the shared cache keeps one entry per language. A page
 * view never calls Google: the data is the snapshot that `POST /api/reviews/refresh` stored.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('lang');
  const language = isReviewLanguage(requested) ? requested : 'en';
  // getCachedGoogleReviews never throws: an unavailable store answers zeros, so the bar always paints.
  const data = await getCachedGoogleReviews(language);
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}

/** Admin sync: refreshes the snapshot from Google when a key is configured, else reports the stored state. */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const result = await syncGoogleReviews();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ReviewsNotConfiguredError || error instanceof PersistenceError) {
      return NextResponse.json({ error: 'Google reviews refresh is unavailable.' }, { status: 503 });
    }
    if (error instanceof GoogleReviewsSourceError) {
      console.error('Google reviews admin sync failed', error.message);
      return NextResponse.json({ error: 'Google Places refused the refresh.' }, { status: 502 });
    }
    return NextResponse.json(
      { error: 'Failed to sync Google reviews' },
      { status: 500 }
    );
  }
}
