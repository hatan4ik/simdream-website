import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getCachedGoogleReviews, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';

export const revalidate = 900; // 15 minutes shared freshness for the browser carousel.

export async function GET() {
  try {
    const data = await getCachedGoogleReviews(false);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
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
