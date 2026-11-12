import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import {
  BIRTHDAY_DISCOUNT_PERCENT,
  BIRTHDAY_LOOKAHEAD_DAYS,
  BIRTHDAY_LOOKBACK_DAYS,
  BIRTHDAY_MAX_PILOT_AGE_YEARS,
  BIRTHDAY_MIN_PILOT_AGE_YEARS,
  DEFAULT_BIRTHDAY_POLICY,
  evaluateBirthdayDiscount,
  isBirthdayDiscountEarned,
  type BirthdayPolicy,
} from '@/lib/discounts/birthday';

/** Fixed "today" so no case depends on the day the suite runs. */
const TODAY = '2026-11-11';
const evaluate = (birthDate: string, flightDate: string, policy?: BirthdayPolicy) =>
  evaluateBirthdayDiscount({ birthDate, flightDate, today: TODAY }, policy);
const WITH_LOOKAHEAD_7: BirthdayPolicy = { ...DEFAULT_BIRTHDAY_POLICY, lookaheadDays: 7 };

describe('policy constants', () => {
  it('pins the owner-vetoable decisions', () => {
    expect(BIRTHDAY_DISCOUNT_PERCENT).toBe(15);
    expect(BIRTHDAY_LOOKBACK_DAYS).toBe(14);
    expect(BIRTHDAY_LOOKAHEAD_DAYS).toBe(0);
    expect(BIRTHDAY_MIN_PILOT_AGE_YEARS).toBe(10);
    expect(BIRTHDAY_MAX_PILOT_AGE_YEARS).toBe(110);
  });
});

describe('same calendar month', () => {
  it('qualifies a birthday earlier in the flight month', () => {
    expect(evaluate('1990-11-02', '2026-11-20')).toEqual({
      valid: true,
      eligible: true,
      reason: 'same_month',
      percent: 15,
      birthdayDate: '2026-11-02',
      windowStart: '2026-11-01',
      windowEnd: '2026-11-30',
      daysFromBirthday: 18,
    });
  });

  it('qualifies a birthday later in the flight month and reports it as ahead', () => {
    const result = evaluate('1990-11-25', '2026-11-03');
    expect(result).toMatchObject({ eligible: true, reason: 'same_month', daysFromBirthday: -22 });
    // The grace after the birthday still extends the window into December.
    expect(result.windowStart).toBe('2026-11-01');
    expect(result.windowEnd).toBe('2026-12-09');
  });

  it('qualifies the first and the last day of the month on both sides', () => {
    expect(evaluate('1990-11-01', '2026-11-30')).toMatchObject({ eligible: true, reason: 'same_month' });
    expect(evaluate('1990-11-30', '2026-11-01')).toMatchObject({ eligible: true, reason: 'same_month' });
    expect(evaluate('1990-11-15', '2026-11-15')).toMatchObject({ eligible: true, reason: 'same_month', daysFromBirthday: 0 });
  });

  it('is decided by the flight month, not by when the booking is made', () => {
    // Same birthday, same "today": only the flight date moves the verdict.
    expect(evaluate('1990-11-15', '2026-11-20').eligible).toBe(true);
    expect(evaluate('1990-11-15', '2027-11-20').eligible).toBe(true); // the next birthday month
    expect(evaluate('1990-11-15', '2027-06-20').eligible).toBe(false); // booked now for June
  });

  it('does not qualify other months', () => {
    expect(evaluate('1990-10-15', '2026-12-15')).toMatchObject({ eligible: false, reason: 'none', percent: 0 });
  });
});

describe('backward grace of 14 days', () => {
  it('qualifies a birthday on the last day of the previous month for a flight on the first', () => {
    expect(evaluate('1990-10-31', '2026-11-01')).toMatchObject({
      eligible: true,
      reason: 'grace_before',
      daysFromBirthday: 1,
      birthdayDate: '2026-10-31',
      windowStart: '2026-10-01',
      windowEnd: '2026-11-14',
    });
  });

  it('includes exactly 14 days and excludes 15', () => {
    expect(evaluate('1990-10-28', '2026-11-11')).toMatchObject({ eligible: true, reason: 'grace_before', daysFromBirthday: 14 });
    expect(evaluate('1990-10-28', '2026-11-12')).toMatchObject({ eligible: false, reason: 'none', daysFromBirthday: 15 });
    expect(evaluate('1990-10-31', '2026-11-14').eligible).toBe(true);
    expect(evaluate('1990-10-31', '2026-11-15').eligible).toBe(false);
  });

  it('works for every month boundary of a year (14 days in, 15 days out)', () => {
    for (let month = 1; month <= 12; month += 1) {
      const last = new Date(Date.UTC(2026, month, 0)).getUTCDate(); // last day of `month`
      const birth = `1990-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
      const flightYear = month === 12 ? 2027 : 2026;
      const nextMonth = month === 12 ? 1 : month + 1;
      const flightAt = (day: number) => `${flightYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      expect(evaluate(birth, flightAt(14)), `${birth} -> ${flightAt(14)}`).toMatchObject({ eligible: true, reason: 'grace_before' });
      expect(evaluate(birth, flightAt(15)), `${birth} -> ${flightAt(15)}`).toMatchObject({ eligible: false });
    }
  });

  it('treats a mid-month birthday whose grace stays inside its own month as same_month, never grace', () => {
    expect(evaluate('1990-10-10', '2026-10-24')).toMatchObject({ reason: 'same_month' });
  });

  it('does not reach back into a birthday of the previous month beyond the grace', () => {
    expect(evaluate('1990-10-05', '2026-11-05')).toMatchObject({ eligible: false, reason: 'none' });
  });
});

describe('year boundaries', () => {
  it('lets a December birthday cover a January flight (previous-year occurrence)', () => {
    expect(evaluate('1990-12-28', '2027-01-03')).toMatchObject({
      eligible: true,
      reason: 'grace_before',
      birthdayDate: '2026-12-28',
      daysFromBirthday: 6,
      windowStart: '2026-12-01',
      windowEnd: '2027-01-11',
    });
    expect(evaluate('1990-12-28', '2027-01-11').eligible).toBe(true); // 14 days
    expect(evaluate('1990-12-28', '2027-01-12')).toMatchObject({ eligible: false, birthdayDate: '2027-12-28' }); // 15 days
    expect(evaluate('1990-12-31', '2027-01-14').eligible).toBe(true);
    expect(evaluate('1990-12-31', '2027-01-15').eligible).toBe(false);
  });

  it('does not let a January flight use a December birthday that is still ahead', () => {
    expect(evaluate('1990-12-02', '2027-01-20')).toMatchObject({ eligible: false, reason: 'none' });
  });

  it('keeps a December birthday eligible for a December flight', () => {
    expect(evaluate('1990-12-20', '2026-12-05')).toMatchObject({ eligible: true, reason: 'same_month' });
  });
});

describe('forward grace (off by default, supported)', () => {
  it('is off by default', () => {
    expect(evaluate('1990-12-01', '2026-11-30')).toMatchObject({ eligible: false, reason: 'none' });
  });

  it('qualifies a birthday just after the month end when enabled', () => {
    expect(evaluate('1990-12-01', '2026-11-30', WITH_LOOKAHEAD_7)).toMatchObject({
      eligible: true,
      reason: 'grace_after',
      daysFromBirthday: -1,
      birthdayDate: '2026-12-01',
      windowStart: '2026-11-24',
      windowEnd: '2026-12-31',
    });
    expect(evaluate('1990-12-07', '2026-11-30', WITH_LOOKAHEAD_7).eligible).toBe(true); // 7 days ahead
    expect(evaluate('1990-12-08', '2026-11-30', WITH_LOOKAHEAD_7).eligible).toBe(false); // 8 days ahead
  });

  it('reaches into the next year (January birthday, late December flight)', () => {
    expect(evaluate('1990-01-02', '2026-12-28', WITH_LOOKAHEAD_7)).toMatchObject({
      eligible: true,
      reason: 'grace_after',
      birthdayDate: '2027-01-02',
      daysFromBirthday: -5,
    });
  });

  it('keeps same_month ahead of the grace reasons', () => {
    expect(evaluate('1990-11-29', '2026-11-30', WITH_LOOKAHEAD_7).reason).toBe('same_month');
  });
});

describe('29 February birthdays', () => {
  it('count as 28 February in a common year', () => {
    expect(evaluate('2000-02-29', '2027-02-10')).toMatchObject({ eligible: true, reason: 'same_month', birthdayDate: '2027-02-28' });
    expect(evaluate('2000-02-29', '2027-03-14')).toMatchObject({ eligible: true, reason: 'grace_before', daysFromBirthday: 14 });
    expect(evaluate('2000-02-29', '2027-03-15').eligible).toBe(false);
  });

  it('stay 29 February in a leap year', () => {
    expect(evaluate('2000-02-29', '2028-02-10')).toMatchObject({ eligible: true, birthdayDate: '2028-02-29' });
    expect(evaluate('2000-02-29', '2028-03-14')).toMatchObject({ eligible: true, daysFromBirthday: 14 });
    expect(evaluate('2000-02-29', '2028-03-15').eligible).toBe(false);
  });

  it('keep the whole of February eligible every year', () => {
    for (const flight of ['2027-02-01', '2027-02-28', '2028-02-01', '2028-02-29']) {
      expect(evaluate('2000-02-29', flight).eligible, flight).toBe(true);
    }
  });

  it('turn a 29 February baby 10 on 28 February of a common year', () => {
    expect(evaluate('2016-02-29', '2026-02-28', undefined)).toMatchObject({ valid: true });
    expect(evaluate('2016-02-29', '2026-02-27')).toMatchObject({ valid: false, error: 'pilot_too_young' });
  });
});

describe('Israel daylight-saving days', () => {
  // Israel switched to summer time on 2026-03-27 and back on 2026-10-25. Calendar dates are compared
  // as plain dates, so a 23- or 25-hour day can never shift the 14-day edge.
  it('keeps the edge exact across the spring change', () => {
    expect(evaluate('1990-03-20', '2026-04-03')).toMatchObject({ eligible: true, daysFromBirthday: 14 });
    expect(evaluate('1990-03-20', '2026-04-04')).toMatchObject({ eligible: false, daysFromBirthday: 15 });
  });

  it('keeps the edge exact across the autumn change', () => {
    expect(evaluate('1990-10-20', '2026-11-03')).toMatchObject({ eligible: true, daysFromBirthday: 14 });
    expect(evaluate('1990-10-20', '2026-11-04')).toMatchObject({ eligible: false, daysFromBirthday: 15 });
  });

  it('evaluates flights on the change days themselves', () => {
    expect(evaluate('1990-03-26', '2026-03-27')).toMatchObject({ eligible: true, reason: 'same_month' });
    expect(evaluate('1990-10-11', '2026-10-25')).toMatchObject({ eligible: true, reason: 'same_month' });
  });

  it('gives the same answer in any process time zone', () => {
    const original = process.env.TZ;
    try {
      const answers = ['Asia/Jerusalem', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC'].map((zone) => {
        process.env.TZ = zone;
        return JSON.stringify(evaluate('1990-10-28', '2026-11-11'));
      });
      expect(new Set(answers).size).toBe(1);
    } finally {
      process.env.TZ = original;
    }
  });
});

describe('pilot age plausibility', () => {
  it('accepts exactly 10 on the flight date and rejects the day before the 10th birthday', () => {
    expect(evaluate('2016-11-11', '2026-11-11')).toMatchObject({ valid: true, eligible: true });
    expect(evaluate('2016-11-12', '2026-11-11')).toMatchObject({ valid: false, error: 'pilot_too_young', eligible: false, percent: 0 });
  });

  it('judges the age on the FLIGHT date, not on today', () => {
    // 9 years old today, 10 on the flight a few weeks ahead.
    expect(evaluate('2016-12-01', '2026-12-05')).toMatchObject({ valid: true });
    expect(evaluate('2016-12-10', '2026-12-05')).toMatchObject({ valid: false, error: 'pilot_too_young' });
  });

  it('rejects a young child and a birth date after the flight', () => {
    expect(evaluate('2024-01-01', '2026-11-20')).toMatchObject({ valid: false, error: 'pilot_too_young' });
    expect(evaluate('2026-11-05', '2026-11-04')).toMatchObject({ valid: false });
  });

  it('accepts exactly 110 and rejects 111', () => {
    expect(evaluate('1916-11-11', '2026-11-11')).toMatchObject({ valid: true });
    expect(evaluate('1915-11-11', '2026-11-11')).toMatchObject({ valid: false, error: 'pilot_too_old', eligible: false });
    expect(evaluate('1850-05-05', '2026-11-11')).toMatchObject({ valid: false, error: 'pilot_too_old' });
  });
});

describe('invalid and future input', () => {
  it('names the unusable birth date', () => {
    for (const birthDate of ['', 'abc', '1990-02-30', '1990-13-01', '1990-1-1', '2026-02-29']) {
      expect(evaluate(birthDate, '2026-11-20'), birthDate).toEqual({
        valid: false,
        error: 'invalid_birth_date',
        eligible: false,
        reason: 'none',
        percent: 0,
        birthdayDate: null,
        windowStart: null,
        windowEnd: null,
        daysFromBirthday: null,
      });
    }
  });

  it('names the unusable flight date', () => {
    for (const flightDate of ['', 'soon', '2026-11-31', '2026-02-29', '20261120']) {
      expect(evaluate('1990-11-20', flightDate), flightDate).toMatchObject({ valid: false, error: 'invalid_flight_date', eligible: false });
    }
  });

  it('rejects a birth date after today, but allows today itself', () => {
    expect(evaluate('2026-11-12', '2026-12-20')).toMatchObject({ valid: false, error: 'birth_date_in_future' });
    expect(evaluate('2027-01-01', '2027-02-01')).toMatchObject({ valid: false, error: 'birth_date_in_future' });
    expect(evaluate('2026-11-11', '2036-11-11')).toMatchObject({ valid: true }); // born today, flying at 10
  });

  it('reads today from the Israel clock when none is injected', () => {
    vi.useFakeTimers();
    try {
      // 2026-11-11 22:30 UTC is already 2026-11-12 00:30 in Israel, so 2026-11-12 is "today", not the future.
      vi.setSystemTime(new Date('2026-11-11T22:30:00Z'));
      expect(evaluateBirthdayDiscount({ birthDate: '2026-11-12', flightDate: '2036-11-12' })).toMatchObject({ valid: true });
      expect(evaluateBirthdayDiscount({ birthDate: '2026-11-13', flightDate: '2036-11-13' })).toMatchObject({
        valid: false,
        error: 'birth_date_in_future',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports the validation error before anything about eligibility', () => {
    expect(evaluate('not-a-date', 'also-not')).toMatchObject({ error: 'invalid_birth_date' });
  });
});

describe('isBirthdayDiscountEarned', () => {
  it('is true only for a valid and eligible evaluation', () => {
    expect(isBirthdayDiscountEarned({ birthDate: '1990-11-15', flightDate: '2026-11-20', today: TODAY })).toBe(true);
    expect(isBirthdayDiscountEarned({ birthDate: '1990-06-15', flightDate: '2026-11-20', today: TODAY })).toBe(false);
    expect(isBirthdayDiscountEarned({ birthDate: 'nope', flightDate: '2026-11-20', today: TODAY })).toBe(false);
  });
});

/**
 * An independent oracle built on UTC date arithmetic (Date.UTC), sharing no code with the engine's
 * Hinnant day numbers: it must agree with the engine on every sampled pair.
 */
function oracle(birthMonth: number, birthDay: number, flightIso: string, lookback: number, lookahead: number) {
  const [fy, fm, fd] = flightIso.split('-').map(Number);
  const flightMs = Date.UTC(fy, fm - 1, fd);
  const leap = (y: number) => new Date(Date.UTC(y, 1, 29)).getUTCMonth() === 1;
  const occurrence = (year: number) => {
    const day = birthMonth === 2 && birthDay === 29 && !leap(year) ? 28 : birthDay;
    return Date.UTC(year, birthMonth - 1, day);
  };
  if (birthMonth === fm) return 'same_month';
  for (const year of [fy - 1, fy, fy + 1]) {
    const days = Math.round((flightMs - occurrence(year)) / 86_400_000);
    if (days >= 1 && days <= lookback) return 'grace_before';
  }
  for (const year of [fy - 1, fy, fy + 1]) {
    const days = Math.round((occurrence(year) - flightMs) / 86_400_000);
    if (days >= 1 && days <= lookahead) return 'grace_after';
  }
  return 'none';
}

describe('property: agrees with an independent UTC oracle', () => {
  const dateArb = fc
    .integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2032, 11, 31) })
    .map((ms) => new Date(ms).toISOString().slice(0, 10));
  const birthArb = fc.record({
    year: fc.integer({ min: 1950, max: 2012 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 31 }),
  });

  it.each([
    { lookbackDays: 14, lookaheadDays: 0 },
    { lookbackDays: 14, lookaheadDays: 7 },
    { lookbackDays: 3, lookaheadDays: 20 },
    { lookbackDays: 0, lookaheadDays: 0 },
  ])('with lookback $lookbackDays and lookahead $lookaheadDays', (grace) => {
    const policy: BirthdayPolicy = { ...DEFAULT_BIRTHDAY_POLICY, ...grace };
    fc.assert(
      fc.property(birthArb, dateArb, ({ year, month, day }, flight) => {
        const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const birth = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
        const result = evaluate(birth, flight, policy);
        expect(result.valid).toBe(true);
        expect(result.reason).toBe(oracle(month, Math.min(day, last), flight, grace.lookbackDays, grace.lookaheadDays));
        expect(result.eligible).toBe(result.reason !== 'none');
        expect(result.percent).toBe(result.eligible ? 15 : 0);
        if (result.eligible) {
          // The flight date always sits inside the window that is reported.
          expect(flight >= result.windowStart! && flight <= result.windowEnd!).toBe(true);
        }
      }),
      { numRuns: 600 }
    );
  });
});
