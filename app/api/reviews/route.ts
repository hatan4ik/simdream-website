import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getCachedGoogleReviews, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';

export const revalidate = 60; // Shared freshness: the rating and review count are never older than about a minute.

export async function GET() {
  try {
    const data = await getCachedGoogleReviews(false);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sync Google reviews' },
      { status: 500 }
    );
  }
}
