import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { isoDate } from '@/lib/validation';

/**
 * Admin-only daily efficiency report for the dispatch board: the full timeline with
 * pilot names, booking references, gap alerts and revenue. The public /api/slots
 * serves a capacity-only projection of the same report.
 */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const date = new URL(request.url).searchParams.get('date');
  if (!date || !isoDate.safeParse(date).success) {
    return NextResponse.json({ error: 'Use a valid YYYY-MM-DD date.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await store.getDailyEfficiencyReport(date), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Schedule efficiency report failed', error);
    return NextResponse.json({ error: 'The efficiency report is temporarily unavailable.' }, { status: 503 });
  }
}
