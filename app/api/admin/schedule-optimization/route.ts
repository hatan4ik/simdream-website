import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { readJsonBody } from '@/lib/http/read-json-body';
import { optimizeTiledCapacity } from '@/lib/scheduler/tiled-interval-optimizer';
import { adminScheduleOptimizationSchema, validationError } from '@/lib/validation';

/** Eight draft requests are under 2 KiB; an authenticated operator gets a looser cap. */
const OPTIMIZATION_MAX_BODY_BYTES = 64 * 1024;

/**
 * Admin-only optimizer preview. It is intentionally read-only: existing
 * bookings remain immutable and the response is only a recommendation.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const read = await readJsonBody(request, { maxBytes: OPTIMIZATION_MAX_BODY_BYTES });
  if (!read.ok) return read.response;

  const parsed = adminScheduleOptimizationSchema.safeParse(read.body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const preview = optimizeTiledCapacity({
      date: parsed.data.date,
      requests: parsed.data.requests,
      existingBookings: await store.getBookings(parsed.data.date),
    });
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Schedule optimization preview failed', error);
    return NextResponse.json({ error: 'Unable to optimize the draft schedule right now.' }, { status: 503 });
  }
}
