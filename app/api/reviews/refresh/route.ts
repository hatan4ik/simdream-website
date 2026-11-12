import { NextResponse } from 'next/server';
import { hasUsableValue } from '@/lib/config/server-env';
import { PersistenceError } from '@/lib/db/store';
import { refreshGoogleReviewsSnapshot, ReviewsNotConfiguredError } from '@/lib/reviews/google-reviews-cache';
import { GoogleReviewsSourceError } from '@/lib/reviews/google-reviews-source';
import { REVIEW_LANGUAGES } from '@/lib/reviews/review-language';
import { constantTimeEqual } from '@/lib/security/constant-time';

/** A token shorter than this is a guess, not a secret; the route stays disabled until a real one is set. */
const MIN_REFRESH_TOKEN_LENGTH = 32;
const REALM = 'Sim Dream reviews refresh';
const NO_STORE = { 'Cache-Control': 'no-store' };

type TokenCheck = 'authorized' | 'unauthorized' | 'not_configured';

function checkRefreshToken(request: Request): TokenCheck {
  const expected = process.env.REVIEWS_REFRESH_TOKEN?.trim();
  if (!hasUsableValue(expected) || expected.length < MIN_REFRESH_TOKEN_LENGTH) return 'not_configured';
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  return presented && constantTimeEqual(presented, expected) ? 'authorized' : 'unauthorized';
}

/**
 * The only path from Google to the site. `.github/workflows/google-reviews-snapshot.yml` calls it
 * twice a day (06:00 and 17:00 Israel time) with the `REVIEWS_REFRESH_TOKEN` repository secret,
 * which must equal the Wix site's environment variable of the same name. Fails closed: 503 until
 * the token, the Places key and (in production) storage are configured; 401 for any other caller.
 */
export async function POST(request: Request) {
  const check = checkRefreshToken(request);
  if (check === 'not_configured') {
    return NextResponse.json(
      { error: 'Review refresh is disabled until REVIEWS_REFRESH_TOKEN is configured.' },
      { status: 503, headers: NO_STORE }
    );
  }
  if (check === 'unauthorized') {
    return NextResponse.json(
      { error: 'Review refresh authentication required' },
      { status: 401, headers: { ...NO_STORE, 'WWW-Authenticate': `Bearer realm="${REALM}"` } }
    );
  }

  try {
    const snapshot = await refreshGoogleReviewsSnapshot();
    return NextResponse.json(
      {
        success: true,
        fetchedAt: snapshot.fetchedAt,
        rating: snapshot.overallRating,
        totalReviews: snapshot.totalReviewsCount,
        reviewCount: Object.fromEntries(REVIEW_LANGUAGES.map((language) => [language, snapshot.reviewsByLanguage[language].length])),
        newestPublishedAt: snapshot.reviewsByLanguage.en[0]?.publishedAt ?? null,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    if (error instanceof ReviewsNotConfiguredError) {
      return NextResponse.json({ error: 'Google Places API is not configured.' }, { status: 503, headers: NO_STORE });
    }
    if (error instanceof PersistenceError) {
      return NextResponse.json({ error: 'Persistent storage is unavailable.' }, { status: 503, headers: NO_STORE });
    }
    if (error instanceof GoogleReviewsSourceError) {
      console.error('Google reviews refresh failed', error.message);
      return NextResponse.json({ error: 'Google Places refused the refresh.' }, { status: 502, headers: NO_STORE });
    }
    console.error('Google reviews refresh failed', error);
    return NextResponse.json({ error: 'Failed to refresh Google reviews' }, { status: 500, headers: NO_STORE });
  }
}
