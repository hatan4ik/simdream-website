import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getCachedGoogleReviews, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';

export const revalidate = 86400; // 24 hours ISR (once a day)

export async function GET() {
  try {
    const data = await getCachedGoogleReviews(false);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
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
  const denied = requireAdmin(request);
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
