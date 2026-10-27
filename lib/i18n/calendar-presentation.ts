import type { Language } from './translations';

export const CALENDAR_LOCALES: Record<Language, string> = {
  // Israel-facing English has historically used the site's UK-style date order;
  // week-start behavior remains Sunday to match the customer calendar expectation.
  en: 'en-GB',
  he: 'he-IL',
  ru: 'ru-RU',
  fr: 'fr-FR',
  ar: 'ar-IL',
};

/** Sunday is customary in Israel and the US; French and Russian calendars begin on Monday. */
const WEEK_STARTS_ON: Record<Language, number> = {
  en: 0,
  he: 0,
  ru: 1,
  fr: 1,
  ar: 0,
};

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  dayLabel: string;
  weekdayLabel: string;
  monthShortLabel: string;
}

export interface CalendarMonthCell extends CalendarDay {
  isCurrentMonth: boolean;
  isPast: boolean;
}

function dateAtUtcNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 12));
}

function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return dateAtUtcNoon(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function formatter(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(CALENDAR_LOCALES[language], { timeZone: 'UTC', ...options });
}

export function calendarWeekStart(language: Language): number {
  return WEEK_STARTS_ON[language];
}

export function calendarWeekdayNames(language: Language): string[] {
  const weekStart = calendarWeekStart(language);
  return Array.from({ length: 7 }, (_, index) =>
    formatter(language, { weekday: 'short' }).format(dateAtUtcNoon(2023, 0, 1 + weekStart + index))
  );
}

export function formatCalendarMonth(date: Date, language: Language): string {
  return formatter(language, { month: 'long', year: 'numeric' }).format(
    dateAtUtcNoon(date.getFullYear(), date.getMonth(), 1)
  );
}

export function formatCalendarDayNumber(day: number, language: Language): string {
  return new Intl.NumberFormat(CALENDAR_LOCALES[language], { useGrouping: false }).format(day);
}

export function formatCalendarDate(ymd: string, language: Language): string {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  return formatter(language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** A terse but complete accessible name for a selectable calendar date. */
export function calendarDayLabel(ymd: string, language: Language): string {
  const date = parseYmd(ymd);
  if (!date) return ymd;

  // Preserve the established English label in browser journeys while every other locale follows ICU conventions.
  if (language === 'en') {
    const weekday = formatter(language, { weekday: 'short' }).format(date);
    const month = formatter(language, { month: 'short' }).format(date);
    return `${weekday} ${date.getUTCDate()} ${month}`;
  }

  return formatter(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function calendarWeekDays(selectedDate: string, language: Language): CalendarDay[] {
  const selected = parseYmd(selectedDate) ?? dateAtUtcNoon(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const startOffset = (selected.getUTCDay() - calendarWeekStart(language) + 7) % 7;
  const weekStart = dateAtUtcNoon(
    selected.getUTCFullYear(),
    selected.getUTCMonth(),
    selected.getUTCDate() - startOffset
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = dateAtUtcNoon(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + index);
    const dateStr = formatYmd(date);
    return {
      dateStr,
      dayNumber: date.getUTCDate(),
      dayLabel: calendarDayLabel(dateStr, language),
      weekdayLabel: formatter(language, { weekday: 'short' }).format(date),
      monthShortLabel: formatter(language, { month: 'short' }).format(date),
    };
  });
}

export function calendarMonthCells(viewMonthDate: Date, language: Language, todayYmd: string): CalendarMonthCell[] {
  const year = viewMonthDate.getFullYear();
  const month = viewMonthDate.getMonth();
  const first = dateAtUtcNoon(year, month, 1);
  const leadingDays = (first.getUTCDay() - calendarWeekStart(language) + 7) % 7;
  const gridStart = dateAtUtcNoon(year, month, 1 - leadingDays);

  // A fixed six-week grid keeps the calendar stable and makes early next-month dates directly selectable.
  return Array.from({ length: 42 }, (_, index) => {
    const date = dateAtUtcNoon(gridStart.getUTCFullYear(), gridStart.getUTCMonth(), gridStart.getUTCDate() + index);
    const dateStr = formatYmd(date);
    return {
      dateStr,
      dayNumber: date.getUTCDate(),
      dayLabel: calendarDayLabel(dateStr, language),
      weekdayLabel: formatter(language, { weekday: 'short' }).format(date),
      monthShortLabel: formatter(language, { month: 'short' }).format(date),
      isCurrentMonth: date.getUTCMonth() === month,
      isPast: dateStr < todayYmd,
    };
  });
}

export function monthStartForYmd(ymd: string): Date {
  const date = parseYmd(ymd);
  return date
    ? new Date(date.getUTCFullYear(), date.getUTCMonth(), 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}
