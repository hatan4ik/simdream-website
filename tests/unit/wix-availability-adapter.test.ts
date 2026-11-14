import { describe, expect, it } from 'vitest';
import { generateKantorovichSlots } from '@/lib/scheduler/kantorovich-engine';
import { intersectKantorovichSlotsWithWix } from '@/lib/wix/availability-adapter';

describe('Wix availability adapter', () => {
  it('retains the Kantorovich grid and only exposes starts Wix says are bookable', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const adapted = intersectKantorovichSlotsWithWix(local, [
      { localStartDate: '2026-11-09T10:15:00', localEndDate: '2026-11-09T11:15:00', bookable: true },
      { localStartDate: '2026-11-09T11:30:00', localEndDate: '2026-11-09T12:30:00', bookable: false },
    ]);

    expect(adapted.map((slot) => slot.startTime)).toEqual(local.map((slot) => slot.startTime));
    expect(adapted.find((slot) => slot.startTime === '10:15')?.available).toBe(true);
    expect(adapted.find((slot) => slot.startTime === '11:30')?.available).toBe(false);
    expect(adapted.find((slot) => slot.startTime === '12:45')?.available).toBe(false);
  });

  it('does not make a locally unavailable start bookable', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const locallyClosed = local.map((slot) =>
      slot.startTime === '10:15' ? { ...slot, available: false as const, disabledReason: 'orphan_gap' as const } : slot
    );
    const adapted = intersectKantorovichSlotsWithWix(locallyClosed, [
      { localStartDate: '2026-11-09T10:15:00', localEndDate: '2026-11-09T11:15:00', bookable: true },
    ]);

    expect(locallyClosed.find((slot) => slot.startTime === '10:15')?.available).toBe(false);
    expect(adapted.find((slot) => slot.startTime === '10:15')?.available).toBe(false);
  });

  it('does not expose the discounted 45-minute promotion on Wednesday even when Wix returns a raw bookable slot', () => {
    const local = generateKantorovichSlots('2026-11-11', 45, []);
    const adapted = intersectKantorovichSlotsWithWix(local, [
      { localStartDate: '2026-11-11T10:00:00', localEndDate: '2026-11-11T10:45:00', bookable: true },
    ]);

    expect(local.find((slot) => slot.startTime === '10:00')).toMatchObject({
      available: false,
      disabledReason: 'promo_days_only',
    });
    expect(adapted.find((slot) => slot.startTime === '10:00')).toMatchObject({
      available: false,
      disabledReason: 'promo_days_only',
    });
  });

  it('caps maxAvailableMinutes before the earliest subsequent Wix-unavailable slot', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const adapted = intersectKantorovichSlotsWithWix(local, [
      { localStartDate: '2026-11-09T10:15:00', localEndDate: '2026-11-09T11:15:00', bookable: true },
      { localStartDate: '2026-11-09T11:30:00', localEndDate: '2026-11-09T12:30:00', bookable: false },
    ]);

    const slot1015 = adapted.find((slot) => slot.startTime === '10:15');
    expect(slot1015?.available).toBe(true);
    expect(slot1015?.maxAvailableMinutes).toBe(60);
  });

  it('keeps maxAvailableMinutes intact when all subsequent slots are open in Wix', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const wixAllOpen = local.map((slot) => ({
      localStartDate: `2026-11-09T${slot.startTime}:00`,
      localEndDate: `2026-11-09T${slot.endTime}:00`,
      bookable: true,
    }));

    const adapted = intersectKantorovichSlotsWithWix(local, wixAllOpen);
    const local1015 = local.find((slot) => slot.startTime === '10:15');
    const adapted1015 = adapted.find((slot) => slot.startTime === '10:15');

    expect(adapted1015?.available).toBe(true);
    expect(adapted1015?.maxAvailableMinutes).toBe(local1015?.maxAvailableMinutes);
  });
});
