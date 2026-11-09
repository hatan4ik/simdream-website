import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSnapshotHour, israelHour, SNAPSHOT_HOURS } from '../../scripts/google-reviews-snapshot-hour.mjs';

const SCRIPT = fileURLToPath(new URL('../../scripts/google-reviews-snapshot-hour.mjs', import.meta.url));

/**
 * The workflow cron fires at 03:07, 04:07, 14:07 and 15:07 UTC every day. Exactly one of each pair
 * is 06:xx or 17:xx in Israel, depending on daylight saving (IDT = UTC+3 in summer, IST = UTC+2 in
 * winter), so the guard must pass one and skip the other in both seasons.
 */
describe('google-reviews-snapshot-hour', () => {
  it('names the two daily pulls', () => {
    expect(SNAPSHOT_HOURS).toEqual([6, 17]);
  });

  it.each([
    ['summer (IDT, UTC+3): 03:07Z is 06:07', '2026-07-15T03:07:00Z', 6, true],
    ['summer (IDT, UTC+3): 04:07Z is 07:07', '2026-07-15T04:07:00Z', 7, false],
    ['summer (IDT, UTC+3): 14:07Z is 17:07', '2026-07-15T14:07:00Z', 17, true],
    ['summer (IDT, UTC+3): 15:07Z is 18:07', '2026-07-15T15:07:00Z', 18, false],
    ['winter (IST, UTC+2): 03:07Z is 05:07', '2026-01-15T03:07:00Z', 5, false],
    ['winter (IST, UTC+2): 04:07Z is 06:07', '2026-01-15T04:07:00Z', 6, true],
    ['winter (IST, UTC+2): 14:07Z is 16:07', '2026-01-15T14:07:00Z', 16, false],
    ['winter (IST, UTC+2): 15:07Z is 17:07', '2026-01-15T15:07:00Z', 17, true],
    // The day the clocks go back (last Sunday of October 2026): the morning run is already on IST.
    ['fall-back day: 04:07Z is 06:07 IST', '2026-10-25T04:07:00Z', 6, true],
    ['fall-back day: 03:07Z is 05:07 IST', '2026-10-25T03:07:00Z', 5, false],
    // The day the clocks go forward (Friday 27 March 2026, 02:00 IST): the morning run is on IDT.
    ['spring-forward day: 03:07Z is 06:07 IDT', '2026-03-27T03:07:00Z', 6, true],
    ['spring-forward day: 04:07Z is 07:07 IDT', '2026-03-27T04:07:00Z', 7, false],
  ])('%s', (_label, iso, hour, expected) => {
    const now = new Date(iso);
    expect(israelHour(now)).toBe(hour);
    expect(isSnapshotHour(now)).toBe(expected);
  });

  it('never passes an hour other than 06 or 17 in either season', () => {
    for (const day of ['2026-07-15', '2026-01-15']) {
      for (let utcHour = 0; utcHour < 24; utcHour += 1) {
        const now = new Date(`${day}T${String(utcHour).padStart(2, '0')}:07:00Z`);
        expect(isSnapshotHour(now)).toBe(SNAPSHOT_HOURS.includes(israelHour(now)));
      }
    }
  });

  it('prints "run" or "skip" on stdout for the workflow and exits 0', () => {
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(['run\n', 'skip\n']).toContain(result.stdout);
    expect(result.stderr).toMatch(/in Israel/);
  });
});
