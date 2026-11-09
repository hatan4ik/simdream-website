import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getCachedGoogleReviews, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';
import { isReviewLanguage } from '@/lib/reviews/review-language';

export const revalidate = 60; // Shared freshness: the rating and review count are never older than about a minute.

/**
 * `?lang=` selects the language Google translates the review texts into (one of the site's six);
 * it is part of the URL, not a header, so the shared cache keeps one entry per language.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('lang');
  const language = isReviewLanguage(requested) ? requested : 'en';
  try {
    const data = await getCachedGoogleReviews(false, language);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve Google reviews snapshot' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const result = await syncGoogleReviews();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Failed to sync Google reviews' },
      { status: 500 }
    );
  }
}
