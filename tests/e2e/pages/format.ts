/**
 * Formatting helpers that mirror what the UI renders, written as tolerant
 * patterns because each browser engine ships its own ICU data (a comma after
 * the weekday, NBSP versus space, bidi marks around the shekel sign).
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function noonUtc(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Calendar date (YYYY-MM-DD) in `timeZone`, shifted by `offsetDays`. */
export function zonedDate(timeZone: string, offsetDays = 0, from = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(from);
  const date = noonUtc(today);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** Calendar date in Israel, the timezone every browser project runs in. */
export function israelDate(offsetDays = 0, from = new Date()): string {
  return zonedDate('Asia/Jerusalem', offsetDays, from);
}

export function addDays(isoDate: string, days: number): string {
  const date = noonUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(isoDate: string): number {
  return noonUtc(isoDate).getUTCDay();
}

/** First date strictly after `isoDate` that falls on `weekday` (0 = Sunday). */
export function nextWeekdayAfter(isoDate: string, weekday: number): string {
  const offset = (weekday - weekdayOf(isoDate) + 7) % 7 || 7;
  return addDays(isoDate, offset);
}

/** Accessible name of a 14-day ribbon button, e.g. "Sat 31 Oct". */
export function ribbonLabel(isoDate: string): string {
  const date = noonUtc(isoDate);
  return `${DAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
}

/** Matches lib/utils formatDate output (en-GB), e.g. "Sat, 31 Oct 2026". */
export function displayDatePattern(isoDate: string): RegExp {
  const date = noonUtc(isoDate);
  return new RegExp(
    `${DAY_NAMES[date.getUTCDay()]},?\\s+${date.getUTCDate()}\\s+${MONTH_NAMES[date.getUTCMonth()]}\\s+${date.getUTCFullYear()}`
  );
}

/** Matches a shekel amount as rendered by formatCurrency (he-IL), e.g. "‏1,250 ‏₪". */
export function ilsPattern(amount: number): RegExp {
  return new RegExp(`(?<![\\d,])${escapeRegExp(amount.toLocaleString('en-US'))}[^\\d]{0,4}₪`);
}

/** Adds minutes to an HH:mm time, matching the scheduler's arithmetic. */
export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export { escapeRegExp };
