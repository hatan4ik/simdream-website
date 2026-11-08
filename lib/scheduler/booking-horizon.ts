const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export const BOOKING_HORIZON_MESSAGE = 'Flights can be booked up to one year ahead. Please choose an earlier date.';

/**
 * The last day a flight can be booked: the same calendar date one year after `todayYmd`
 * (Israel date). A leap day rolls back to 28 February. Empty input, the pre-hydration state
 * of the booking page, means the horizon is not known yet and returns an empty string.
 */
export function maxBookableDate(todayYmd: string): string {
  const match = YMD.exec(todayYmd);
  if (!match) return '';
  const year = Number(match[1]) + 1;
  const month = match[2];
  const lastDayOfMonth = new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
  const day = String(Math.min(Number(match[3]), lastDayOfMonth)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True when `date` lies past the one-year booking horizon. Unknown today never rejects. */
export function isBeyondBookingHorizon(date: string, todayYmd: string): boolean {
  const max = maxBookableDate(todayYmd);
  return max !== '' && date > max;
}

/** `date`, or the last bookable day when it lies past the horizon. */
export function clampToBookingHorizon(date: string, todayYmd: string): string {
  return isBeyondBookingHorizon(date, todayYmd) ? maxBookableDate(todayYmd) : date;
}
