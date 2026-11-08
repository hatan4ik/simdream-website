import { describe, expect, it } from 'vitest';
import {
  calendarMonthCells,
  calendarNavigationLabels,
  calendarDayLabel,
  calendarWeekDays,
  calendarWeekdayNames,
  formatCalendarDate,
  formatCalendarDayNumber,
  formatCalendarMonth,
  monthStartForYmd,
} from '@/lib/i18n/calendar-presentation';

describe('localized calendar presentation', () => {
  it('uses Sunday-first weeks for English and Monday-first weeks for French and Russian', () => {
    expect(calendarWeekDays('2026-11-04', 'en').map((day) => day.dateStr)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    expect(calendarWeekDays('2026-11-04', 'fr')[0]?.dateStr).toBe('2026-11-02');
    expect(calendarWeekDays('2026-11-04', 'ru')[0]?.dateStr).toBe('2026-11-02');
    expect(calendarWeekdayNames('en')).toHaveLength(7);
  });

  it('builds a stable six-week month grid with selectable adjacent future dates', () => {
    const cells = calendarMonthCells(new Date(2026, 9, 1), 'en', '2026-10-20');

    expect(cells).toHaveLength(42);
    expect(cells[0]?.dateStr).toBe('2026-09-27');
    expect(cells.at(-1)?.dateStr).toBe('2026-11-07');
    expect(cells.find((cell) => cell.dateStr === '2026-11-02')).toMatchObject({
      isCurrentMonth: false,
      isPast: false,
    });
  });

  it('formats dates in the visitor language without cross-script contamination', () => {
    expect(formatCalendarDate('2026-11-04', 'he')).toMatch(/[\u0590-\u05FF]/);
    expect(formatCalendarDate('2026-11-04', 'ar')).toMatch(/[\u0600-\u06FF]/);
  });

  it('keeps week pager controls complete and isolated in all six languages', () => {
    for (const language of ['en', 'he', 'ru', 'fr', 'ar', 'es'] as const) {
      const labels = calendarNavigationLabels(language);
      expect(labels.previousWeek).not.toHaveLength(0);
      expect(labels.nextWeek).not.toHaveLength(0);
      expect(labels.today).not.toHaveLength(0);
      expect(labels.horizonNote).not.toHaveLength(0);
    }

    expect(calendarNavigationLabels('he').nextWeek).toMatch(/[\u0590-\u05FF]/);
    expect(calendarNavigationLabels('ar').nextWeek).toMatch(/[\u0600-\u06FF]/);
    for (const key of ['today', 'horizonNote'] as const) {
      expect(calendarNavigationLabels('he')[key]).toMatch(/[\u0590-\u05FF]/);
      expect(calendarNavigationLabels('he')[key]).not.toMatch(/[\u0600-\u06FF]/);
      expect(calendarNavigationLabels('ar')[key]).toMatch(/[\u0600-\u06FF]/);
      expect(calendarNavigationLabels('ar')[key]).not.toMatch(/[\u0590-\u05FF]/);
    }
  });

  it('flags month cells past the one-year booking horizon', () => {
    const cells = calendarMonthCells(new Date(2027, 10, 1), 'en', '2026-11-08');

    expect(cells.find((cell) => cell.dateStr === '2027-11-08')?.isBeyondHorizon).toBe(false);
    expect(cells.find((cell) => cell.dateStr === '2027-11-09')?.isBeyondHorizon).toBe(true);
    expect(calendarMonthCells(new Date(2026, 10, 1), 'en', '2026-11-08').some((cell) => cell.isBeyondHorizon)).toBe(false);
  });

  it('retains safe, readable output when an upstream calendar value is malformed', () => {
    expect(formatCalendarDate('not-a-date', 'es')).toBe('not-a-date');
    expect(calendarDayLabel('not-a-date', 'en')).toBe('not-a-date');
    expect(formatCalendarDayNumber(12, 'es')).toBe('12');
    expect(formatCalendarMonth(new Date(2026, 10, 1), 'es')).toMatch(/2026/);
    expect(monthStartForYmd('not-a-date')).toBeInstanceOf(Date);
  });
});
