import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { toPublicCapacityReport } from '@/lib/scheduler/kantorovich-engine';
import { isoDate } from '@/lib/validation';

const VALID_DURATIONS = new Set([20, 30, 45, 60, 90, 120]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const duration = Number.parseInt(searchParams.get('duration') || '60', 10);
  const includeEfficiency = searchParams.get('includeEfficiency') === 'true';

  if (!date || !isoDate.safeParse(date).success || !VALID_DURATIONS.has(duration)) {
    return NextResponse.json({ error: 'Use a valid YYYY-MM-DD date and supported duration.' }, { status: 400 });
  }

  try {
    const slots = await store.getAvailableSlots(date, duration);
    if (includeEfficiency) {
      const [efficiency, durationAvailability] = await Promise.all([
        store.getDailyEfficiencyReport(date),
        store.getDurationAvailability(date),
      ]);
      // Public callers get capacity only. The full report (customer names, booking
      // references, revenue) is served by the admin-only /api/admin/schedule-efficiency.
      return NextResponse.json({ slots, efficiency: toPublicCapacityReport(efficiency), durationAvailability });
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Slot availability lookup failed', error);
    return NextResponse.json({ error: 'Availability is temporarily unavailable.' }, { status: 503 });
  }
}
