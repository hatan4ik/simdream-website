import { describe, expect, it } from 'vitest';
import { clampToBookingHorizon, isBeyondBookingHorizon, maxBookableDate } from '@/lib/scheduler/booking-horizon';

describe('booking horizon', () => {
  it('ends on the same calendar date one year from today', () => {
    expect(maxBookableDate('2026-11-08')).toBe('2027-11-08');
    expect(maxBookableDate('2026-12-31')).toBe('2027-12-31');
    expect(maxBookableDate('2027-02-28')).toBe('2028-02-28');
  });

  it('rolls a leap day back to 28 February when the next year has none', () => {
    expect(maxBookableDate('2028-02-29')).toBe('2029-02-28');
    expect(maxBookableDate('2027-02-28')).toBe('2028-02-28');
  });

  it('is unknown, and never rejects, before today is known', () => {
    expect(maxBookableDate('')).toBe('');
    expect(maxBookableDate('not-a-date')).toBe('');
    expect(isBeyondBookingHorizon('2099-01-01', '')).toBe(false);
    expect(clampToBookingHorizon('2099-01-01', '')).toBe('2099-01-01');
  });

  it('accepts the last day and rejects the day after it', () => {
    expect(isBeyondBookingHorizon('2027-11-08', '2026-11-08')).toBe(false);
    expect(isBeyondBookingHorizon('2027-11-09', '2026-11-08')).toBe(true);
    expect(isBeyondBookingHorizon('2026-11-08', '2026-11-08')).toBe(false);
  });

  it('clamps a later date to the last bookable day and leaves earlier dates alone', () => {
    expect(clampToBookingHorizon('2030-06-01', '2026-11-08')).toBe('2027-11-08');
    expect(clampToBookingHorizon('2027-03-14', '2026-11-08')).toBe('2027-03-14');
  });
});
