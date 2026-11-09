/**
 * The twice-daily Google reviews cadence on the Israel wall clock: a new window opens at 06:00 and
 * at 17:00 Asia/Jerusalem (the same hours `scripts/google-reviews-snapshot-hour.mjs` lets the
 * GitHub cron through). The window id names the boundary that opened the current window, so any
 * two instants in the same window share an id and a cached read is reused until the next boundary.
 */
export const ISRAEL_TIME_ZONE = 'Asia/Jerusalem';
export const SNAPSHOT_HOURS = [6, 17] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function israelParts(now: Date): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { day: `${read('year')}-${read('month')}-${read('day')}`, hour: Number(read('hour')) };
}

/**
 * `YYYY-MM-DDT06` or `YYYY-MM-DDT17` on the Israel calendar: the boundary that opened the window
 * `now` falls in. Before 06:00 the window is the previous day's 17:00 one.
 */
export function snapshotWindowId(now: Date = new Date()): string {
  const { day, hour } = israelParts(now);
  if (hour >= SNAPSHOT_HOURS[1]) return `${day}T17`;
  if (hour >= SNAPSHOT_HOURS[0]) return `${day}T06`;
  return `${israelParts(new Date(now.getTime() - DAY_MS)).day}T17`;
}
