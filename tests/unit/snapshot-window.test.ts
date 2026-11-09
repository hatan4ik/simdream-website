import { describe, expect, it } from 'vitest';
import { snapshotWindowId } from '@/lib/reviews/snapshot-window';

describe('Google reviews snapshot window (Israel wall clock)', () => {
  // Israel standard time is UTC+2 (winter); daylight time is UTC+3 (last Friday of March to the last Sunday of October).
  it.each([
    ['2026-11-09T03:59:59Z', '2026-11-08T17', 'winter, 05:59 Israel: still the previous evening window'],
    ['2026-11-09T04:00:00Z', '2026-11-09T06', 'winter, 06:00 Israel opens the morning window'],
    ['2026-11-09T14:59:59Z', '2026-11-09T06', 'winter, 16:59 Israel: still the morning window'],
    ['2026-11-09T15:00:00Z', '2026-11-09T17', 'winter, 17:00 Israel opens the evening window'],
    ['2026-11-09T21:59:59Z', '2026-11-09T17', 'winter, 23:59 Israel: evening window'],
    ['2026-11-09T22:00:00Z', '2026-11-09T17', 'winter, 00:00 Israel next day: evening window of the 9th'],
    ['2026-07-01T02:59:59Z', '2026-06-30T17', 'summer, 05:59 Israel: previous evening window'],
    ['2026-07-01T03:00:00Z', '2026-07-01T06', 'summer, 06:00 Israel opens the morning window'],
    ['2026-07-01T14:00:00Z', '2026-07-01T17', 'summer, 17:00 Israel opens the evening window'],
    ['2026-03-27T03:30:00Z', '2026-03-27T06', 'the day daylight time starts: 06:30 Israel is the morning window'],
    ['2026-10-25T04:30:00Z', '2026-10-25T06', 'the day daylight time ends: 06:30 Israel is the morning window'],
  ])('%s → %s (%s)', (iso, expected) => {
    expect(snapshotWindowId(new Date(iso))).toBe(expected);
  });

  it('gives every instant in one window the same id and changes exactly at the boundaries', () => {
    const ids = new Set<string>();
    for (let minutes = 0; minutes < 24 * 60; minutes += 1) {
      ids.add(snapshotWindowId(new Date(Date.UTC(2026, 10, 9, 0, minutes))));
    }
    // 2026-11-09 UTC spans Israel 02:00 of the 9th to 02:00 of the 10th: previous evening, morning, evening.
    expect([...ids]).toEqual(['2026-11-08T17', '2026-11-09T06', '2026-11-09T17']);
  });
});
