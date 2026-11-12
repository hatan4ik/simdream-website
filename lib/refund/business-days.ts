import { REFUND_POLICY } from './refund-policy';
import { shiftCalendarDate, weekdayOf } from './israel-time';

/**
 * Business days under the refund rules: Sunday to Thursday, no holiday calendar (see
 * `REFUND_POLICY.businessWeek`). Dates are Israel calendar dates, `YYYY-MM-DD`.
 */
export function isBusinessDay(date: string): boolean {
  return !REFUND_POLICY.businessWeek.weekendDays.includes(weekdayOf(date));
}

/**
 * The calendar date that lies `count` business days before `date`. Stepping back one calendar
 * day at a time, only business days are counted, so `date` itself never counts and a weekend
 * session reaches back past the weekend: Thursday - 2 = Tuesday, Sunday - 2 = Wednesday.
 */
export function subtractBusinessDays(date: string, count: number): string {
  let cursor = date;
  let remaining = count;
  while (remaining > 0) {
    cursor = shiftCalendarDate(cursor, -1);
    if (isBusinessDay(cursor)) remaining -= 1;
  }
  return cursor;
}
