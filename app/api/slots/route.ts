import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const durationStr = searchParams.get('duration') || '60';
    const includeEfficiency = searchParams.get('includeEfficiency') === 'true';
    const duration = parseInt(durationStr, 10);

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const slots = store.getAvailableSlots(date, duration);
    if (includeEfficiency) {
      const efficiency = store.getDailyEfficiencyReport(date);
      const durationAvailability = store.getDurationAvailability(date);
      return NextResponse.json({ slots, efficiency, durationAvailability });
    }

    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate slots' }, { status: 500 });
  }
}

