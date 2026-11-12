import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysInMonth,
  formatIsoDate,
  fromDayNumber,
  isLeapYear,
  parseIsoDate,
  toDayNumber,
} from '@/lib/discounts/birthday/civil-date';

describe('parseIsoDate', () => {
  it.each(['2026-11-11', '2000-02-29', '1999-12-31', '1000-01-01'])('accepts %s', (value) => {
    expect(parseIsoDate(value)).not.toBeNull();
  });

  it.each([
    '',
    ' 2026-11-11',
    '2026-11-11 ',
    '2026-1-1',
    '26-11-11',
    '2026/11/11',
    '2026-11-11T00:00:00Z',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-11-31',
    '2026-02-29', // not a leap year
    '1900-02-29', // century, not a leap year
    '0999-12-31',
    '2026-11-1٢', // Arabic-Indic digit
    'tomorrow',
  ])('rejects %j', (value) => {
    expect(parseIsoDate(value)).toBeNull();
  });

  it('rejects non-strings', () => {
    for (const value of [null, undefined, 20261111, {}, [], new Date()]) expect(parseIsoDate(value)).toBeNull();
  });

  it('round-trips through formatIsoDate', () => {
    expect(formatIsoDate(parseIsoDate('2026-03-07')!)).toBe('2026-03-07');
  });
});

describe('leap years and month lengths', () => {
  it('follows the Gregorian rule', () => {
    expect([1900, 2000, 2024, 2026, 2100].map(isLeapYear)).toEqual([false, true, true, false, false]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect([1, 3, 5, 7, 8, 10, 12].every((month) => daysInMonth(2026, month) === 31)).toBe(true);
    expect([4, 6, 9, 11].every((month) => daysInMonth(2026, month) === 30)).toBe(true);
  });
});

describe('day numbers', () => {
  it('anchors 1970-01-01 at zero', () => {
    expect(toDayNumber({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(toDayNumber({ year: 1969, month: 12, day: 31 })).toBe(-1);
  });

  it('agrees with UTC midnight arithmetic on every day from 1900 to 2100', () => {
    const start = Date.UTC(1900, 0, 1);
    const end = Date.UTC(2100, 11, 31);
    for (let ms = start; ms <= end; ms += 86_400_000) {
      const utc = new Date(ms);
      const civil = { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
      const dayNumber = toDayNumber(civil);
      expect(dayNumber).toBe(ms / 86_400_000);
      expect(fromDayNumber(dayNumber)).toEqual(civil);
    }
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(formatIsoDate(addDays(parseIsoDate('2026-12-31')!, 1))).toBe('2027-01-01');
    expect(formatIsoDate(addDays(parseIsoDate('2027-01-01')!, -1))).toBe('2026-12-31');
    expect(formatIsoDate(addDays(parseIsoDate('2028-02-28')!, 1))).toBe('2028-02-29');
    expect(formatIsoDate(addDays(parseIsoDate('2027-02-28')!, 1))).toBe('2027-03-01');
    expect(formatIsoDate(addDays(parseIsoDate('2026-10-28')!, 14))).toBe('2026-11-11');
  });

  it('is its own inverse for any offset', () => {
    fc.assert(
      fc.property(fc.integer({ min: -60_000, max: 60_000 }), fc.integer({ min: -4000, max: 4000 }), (base, offset) => {
        const date = fromDayNumber(base);
        expect(toDayNumber(addDays(addDays(date, offset), -offset))).toBe(base);
      })
    );
  });
});
