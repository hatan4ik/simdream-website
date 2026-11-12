import { REFUND_POLICY } from './refund-policy';

/**
 * Israel wall-clock helpers for the refund rules. Pure and dependency-free: they use `Intl`
 * with the Asia/Jerusalem zone, so daylight-saving changes need no hand-kept table.
 */
const ZONE = REFUND_POLICY.timeZone;
const DAY_MS = 86_400_000;

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(instant: Date): WallClock {
  const read = Object.fromEntries(parts.formatToParts(instant).map((part) => [part.type, part.value]));
  return {
    year: Number(read.year),
    month: Number(read.month),
    day: Number(read.day),
    hour: Number(read.hour),
    minute: Number(read.minute),
    second: Number(read.second),
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Israel calendar date of an instant, `YYYY-MM-DD`. */
export function israelDateOf(instant: Date): string {
  const { year, month, day } = wallClock(instant);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Israel wall-clock time of an instant, `HH:mm`. */
export function israelTimeOf(instant: Date): string {
  const { hour, minute } = wallClock(instant);
  return `${pad(hour)}:${pad(minute)}`;
}

/** Israel's offset from UTC at an instant, in milliseconds (+2 h in winter, +3 h in summer). */
function israelOffsetMs(instantMs: number): number {
  const c = wallClock(new Date(instantMs));
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
  return asUtc - Math.floor(instantMs / 1_000) * 1_000;
}

/** True for a real `YYYY-MM-DD` calendar date. */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The instant at which the Israel wall clock reads `date` `time` (`YYYY-MM-DD`, `HH:mm`). */
export function israelLocalToInstant(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // The offset depends on the instant being sought; two passes settle it except inside a DST gap.
  const firstGuess = naive - israelOffsetMs(naive);
  return new Date(naive - israelOffsetMs(firstGuess));
}

/** Whole calendar days from `from` to `to` (both `YYYY-MM-DD`); negative when `to` is earlier. */
export function calendarDaysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

/** `date` shifted by whole calendar days. */
export function shiftCalendarDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Day of the week of a calendar date: 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

