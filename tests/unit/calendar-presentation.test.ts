import { describe, expect, it } from 'vitest';
import {
  calendarMonthCells,
  calendarWeekDays,
  calendarWeekdayNames,
  formatCalendarDate,
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
});
