import { describe, expect, it } from 'vitest';
import { generateKantorovichSlots } from '@/lib/scheduler/kantorovich-engine';
import { intersectKantorovichSlotsWithWix } from '@/lib/wix/availability-adapter';

describe('Wix availability adapter', () => {
  it('retains the Kantorovich grid and only exposes starts Wix says are bookable', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const adapted = intersectKantorovichSlotsWithWix(local, [
      { localStartDate: '2026-11-09T10:00:00', localEndDate: '2026-11-09T11:00:00', bookable: true },
      { localStartDate: '2026-11-09T11:15:00', localEndDate: '2026-11-09T12:15:00', bookable: false },
    ]);

    expect(adapted.map((slot) => slot.startTime)).toEqual(local.map((slot) => slot.startTime));
    expect(adapted.find((slot) => slot.startTime === '10:00')?.available).toBe(true);
    expect(adapted.find((slot) => slot.startTime === '11:15')?.available).toBe(false);
    expect(adapted.find((slot) => slot.startTime === '12:30')?.available).toBe(false);
  });

  it('does not make a locally invalid zero-waste start bookable', () => {
    const local = generateKantorovichSlots('2026-11-09', 60, []);
    const adapted = intersectKantorovichSlotsWithWix(local, [
      { localStartDate: '2026-11-09T21:15:00', localEndDate: '2026-11-09T22:15:00', bookable: true },
    ]);

    expect(local.find((slot) => slot.startTime === '21:15')?.available).toBe(false);
    expect(adapted.find((slot) => slot.startTime === '21:15')?.available).toBe(false);
  });
});
