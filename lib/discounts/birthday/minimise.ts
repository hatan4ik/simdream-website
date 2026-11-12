import { parseIsoDate } from './civil-date';

export interface BirthdayMonthDay {
  month: number;
  day: number;
}

/**
 * Data minimisation: the full date of birth is used to validate and evaluate the offer, then only the
 * month and day (and the "discount applied" flag) may be persisted. Returns null for an unusable date.
 */
export function toBirthdayMonthDay(birthDate: string): BirthdayMonthDay | null {
  const parsed = parseIsoDate(birthDate);
  return parsed ? { month: parsed.month, day: parsed.day } : null;
}
