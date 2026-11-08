import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { BOOKING_HORIZON_MESSAGE, isBeyondBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { toPublicCapacityReport } from '@/lib/scheduler/kantorovich-engine';
import { isoDate } from '@/lib/validation';
import {
  getWixBackedKantorovichSlots,
  intersectKantorovichSlotsWithWix,
  isWixAvailabilityAdapterEnabled,
  listWixBookableSlotsForDuration,
} from '@/lib/wix';

const VALID_DURATIONS = new Set([30, 45, 60, 90, 120]);
const SUPPORTED_DURATIONS = [30, 45, 60, 90, 120] as const;

function availabilitySummary(slots: Awaited<ReturnType<typeof store.getAvailableSlots>>) {
  const available = slots.filter((slot) => slot.available);
  return {
    availableCount: available.length,
    minPriceIls: available.length ? Math.min(...available.map((slot) => slot.dynamicPriceIls || slot.basePriceIls)) : 0,
  };
}

async function getWixAdaptedSlots(date: string, duration: number) {
  const [wixResult, localResult] = await Promise.allSettled([
    listWixBookableSlotsForDuration(date, duration),
    store.getAvailableSlots(date, duration),
  ]);

  if (wixResult.status === 'fulfilled' && localResult.status === 'fulfilled') {
    return intersectKantorovichSlotsWithWix(localResult.value, wixResult.value);
  }

  if (wixResult.status === 'fulfilled') {
    return getWixBackedKantorovichSlots(date, duration, wixResult.value);
  }

  if (localResult.status === 'fulfilled') return localResult.value;

  throw wixResult.reason instanceof Error ? wixResult.reason : localResult.reason;
}

async function getWixAdaptedResponse(date: string, duration: number, includeEfficiency: boolean) {
  const durations: readonly number[] = includeEfficiency ? SUPPORTED_DURATIONS : [duration];
  const slotResults = await Promise.all(durations.map((candidate) => getWixAdaptedSlots(date, candidate)));
  const slots = slotResults[durations.indexOf(duration)]!;

  if (!includeEfficiency) return NextResponse.json(slots);

  const durationAvailability = Object.fromEntries(
    durations.map((candidate, index) => [candidate, availabilitySummary(slotResults[index]!)])
  );
  const efficiency = await store.getDailyEfficiencyReport(date).catch(() => null);

  // A Wix-only deployment has no local booking identities to build a reliable
  // efficiency report from. Omit it rather than presenting an empty calendar
  // as operational truth; the customer-facing slot list remains authoritative.
  return NextResponse.json({
    slots,
    durationAvailability,
    wixBookingsAuthoritative: true,
    ...(efficiency ? { efficiency: toPublicCapacityReport(efficiency) } : {}),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const duration = Number.parseInt(searchParams.get('duration') || '60', 10);
  const includeEfficiency = searchParams.get('includeEfficiency') === 'true';

  if (!date || !isoDate.safeParse(date).success || !VALID_DURATIONS.has(duration)) {
    return NextResponse.json({ error: 'Use a valid YYYY-MM-DD date and supported duration.' }, { status: 400 });
  }
  if (isBeyondBookingHorizon(date, israelToday())) {
    return NextResponse.json({ error: BOOKING_HORIZON_MESSAGE }, { status: 400 });
  }

  try {
    if (isWixAvailabilityAdapterEnabled()) {
      return await getWixAdaptedResponse(date, duration, includeEfficiency);
    }

    const slots = await store.getAvailableSlots(date, duration);
    if (includeEfficiency) {
      const [efficiency, durationAvailability] = await Promise.all([
        store.getDailyEfficiencyReport(date),
        store.getDurationAvailability(date),
      ]);
      // Public callers get capacity only. The full report (customer names, booking
      // references, revenue) is served by the admin-only /api/admin/schedule-efficiency.
      return NextResponse.json({
        slots,
        efficiency: toPublicCapacityReport(efficiency),
        durationAvailability,
        wixBookingsAuthoritative: false,
      });
    }

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Slot availability lookup failed', error);
    return NextResponse.json({ error: 'Availability is temporarily unavailable.' }, { status: 503 });
  }
}
