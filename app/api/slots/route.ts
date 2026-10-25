import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

const VALID_DURATIONS = new Set([20, 30, 45, 60, 90, 120]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const durationStr = searchParams.get('duration') || '60';
    const includeEfficiency = searchParams.get('includeEfficiency') === 'true';
    const duration = Number.parseInt(durationStr, 10);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !VALID_DURATIONS.has(duration)) {
      return NextResponse.json({ error: 'Use a valid YYYY-MM-DD date and supported duration.' }, { status: 400 });
    }

    const slots = await store.getAvailableSlots(date, duration);
    if (includeEfficiency) {
      const [efficiency, durationAvailability] = await Promise.all([
        store.getDailyEfficiencyReport(date),
        store.getDurationAvailability(date),
      ]);
      return NextResponse.json({ slots, efficiency, durationAvailability });
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error('SLOTS API ERROR:', error);
    return NextResponse.json({
      error: 'Failed to generate slots',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
