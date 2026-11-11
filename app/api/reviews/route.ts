import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { PersistenceError } from '@/lib/db/store';
import { getCachedGoogleReviews, ReviewsNotConfiguredError, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';
import { GoogleReviewsSourceError } from '@/lib/reviews/google-reviews-source';
import { isReviewLanguage } from '@/lib/reviews/review-language';

export const revalidate = 60; // Shared freshness: the data changes twice a day (06:00 and 17:00 Israel time).

/**
 * `?language=` selects the language Google translated the review texts into (one of the site's
 * six); it is part of the URL, not a header, so the shared cache keeps one entry per language.
 * The parameter is deliberately not `lang`: Wix Multilingual owns `?lang=` at the edge of the
 * Wix-hosted site and 301-strips the primary language (`?lang=he` → no query), which would hand
 * Hebrew visitors the English default. `lang` is still read as a legacy alias. The data
 * is the snapshot `POST /api/reviews/refresh` stored or, without a snapshot store, this server's
 * own once-per-window Google read (see `getCachedGoogleReviews`); a page view never triggers more
 * than one Google read per process per 06:00/17:00 Israel window.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('language') ?? searchParams.get('lang');
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
