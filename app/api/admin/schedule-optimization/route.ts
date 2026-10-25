import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { optimizeTiledCapacity } from '@/lib/scheduler/tiled-interval-optimizer';
import { adminScheduleOptimizationSchema, validationError } from '@/lib/validation';

/**
 * Admin-only optimizer preview. It is intentionally read-only: existing
 * bookings remain immutable and the response is only a recommendation.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = adminScheduleOptimizationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const preview = optimizeTiledCapacity({
      date: parsed.data.date,
      requests: parsed.data.requests,
      existingBookings: await store.getBookings(),
    });
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Schedule optimization preview failed', error);
    return NextResponse.json({ error: 'Unable to optimize the draft schedule right now.' }, { status: 503 });
  }
}
