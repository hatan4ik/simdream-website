// Israel-hour guard for .github/workflows/google-reviews-snapshot.yml. GitHub cron runs in UTC and
// cannot follow daylight saving, so the workflow fires at both candidate UTC hours for 06:00 and
// 17:00 Israel time and asks this script whether the local hour is one of the two. Exit 0 and "run"
// on stdout when it is, exit 0 and "skip" otherwise, so the step can gate the refresh.
import { pathToFileURL } from 'node:url';

export const ISRAEL_TIME_ZONE = 'Asia/Jerusalem';
/** The two daily pulls, on the Israel wall clock. */
export const SNAPSHOT_HOURS = [6, 17];

/** @param {Date} [now] @returns {number} the hour (0–23) on the Israel wall clock */
export function israelHour(now = new Date()) {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: ISRAEL_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value;
  return Number(hour);
}

/** @param {Date} [now] @returns {boolean} true when Israel is in one of the two snapshot hours */
export function isSnapshotHour(now = new Date()) {
  return SNAPSHOT_HOURS.includes(israelHour(now));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const now = new Date();
  const hour = israelHour(now);
  const run = SNAPSHOT_HOURS.includes(hour);
  console.error(`${now.toISOString()} is ${String(hour).padStart(2, '0')}:xx in Israel: ${run ? 'snapshot hour' : 'not a snapshot hour'}.`);
  process.stdout.write(run ? 'run\n' : 'skip\n');
}
