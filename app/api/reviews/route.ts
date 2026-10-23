import { NextResponse } from 'next/server';
import { getCachedGoogleReviews, syncGoogleReviews } from '@/lib/reviews/google-reviews-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours ISR (once a day)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    const data = await getCachedGoogleReviews(force);
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

export async function POST() {
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

