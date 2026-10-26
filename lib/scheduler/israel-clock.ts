// The simulator operates on Israel wall-clock time whatever time zone the server runs in.
const ISRAEL_TIME_ZONE = 'Asia/Jerusalem';

/** Today's calendar date in Israel (YYYY-MM-DD). */
export function israelToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Minutes since midnight on the Israel wall clock. */
export function israelMinutesNow(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ISRAEL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

/** True when a departure (Israel date and HH:mm) has already left. Earlier dates count as departed. */
export function hasDeparted(date: string, startTime: string, now = new Date()): boolean {
  const today = israelToday(now);
  if (date !== today) return date < today;
  const [hours, minutes] = startTime.split(':').map(Number);
  return hours * 60 + minutes <= israelMinutesNow(now);
}
