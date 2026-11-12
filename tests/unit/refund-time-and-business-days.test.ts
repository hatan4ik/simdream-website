import { describe, expect, it } from 'vitest';
import { isBusinessDay, subtractBusinessDays } from '@/lib/refund/business-days';
import {
  calendarDaysBetween,
  isCalendarDate,
  israelDateOf,
  israelLocalToInstant,
  israelTimeOf,
  shiftCalendarDate,
  weekdayOf,
} from '@/lib/refund/israel-time';
import { computeSubscriptionRefund } from '@/lib/refund/subscription-refund';
import { REFUND_POLICY } from '@/lib/refund/refund-policy';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

describe('Israel wall-clock helpers', () => {
  it('reads the calendar date and time in Asia/Jerusalem, winter (UTC+2) and summer (UTC+3)', () => {
    expect(israelDateOf(new Date('2026-12-07T22:30:00Z'))).toBe('2026-12-08');
    expect(israelTimeOf(new Date('2026-12-07T22:30:00Z'))).toBe('00:30');
    expect(israelDateOf(new Date('2026-07-07T20:59:00Z'))).toBe('2026-07-07');
    expect(israelDateOf(new Date('2026-07-07T21:00:00Z'))).toBe('2026-07-08');
    expect(israelTimeOf(new Date('2026-07-07T21:00:00Z'))).toBe('00:00');
  });

  it('turns an Israel wall-clock time back into the right instant on both sides of a DST change', () => {
    expect(israelLocalToInstant('2026-12-10', '10:00').toISOString()).toBe('2026-12-10T08:00:00.000Z');
    expect(israelLocalToInstant('2026-07-10', '10:00').toISOString()).toBe('2026-07-10T07:00:00.000Z');
    // DST ends Sunday 25 Oct 2026 at 02:00: Saturday is still +03:00, Sunday noon is +02:00.
    expect(israelLocalToInstant('2026-10-24', '12:00').toISOString()).toBe('2026-10-24T09:00:00.000Z');
    expect(israelLocalToInstant('2026-10-25', '12:00').toISOString()).toBe('2026-10-25T10:00:00.000Z');
    // DST starts Friday 27 Mar 2026 at 02:00.
    expect(israelLocalToInstant('2026-03-26', '12:00').toISOString()).toBe('2026-03-26T10:00:00.000Z');
    expect(israelLocalToInstant('2026-03-27', '12:00').toISOString()).toBe('2026-03-27T09:00:00.000Z');
  });

  it('round-trips every quarter hour of a day', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      expect(israelTimeOf(israelLocalToInstant('2026-12-10', time))).toBe(time);
      expect(israelTimeOf(israelLocalToInstant('2026-07-10', time))).toBe(time);
    }
  });

  it('does calendar arithmetic without time zones', () => {
    expect(calendarDaysBetween('2026-12-01', '2026-12-15')).toBe(14);
    expect(calendarDaysBetween('2026-12-15', '2026-12-01')).toBe(-14);
    expect(calendarDaysBetween('2026-10-20', '2026-10-30')).toBe(10);
    expect(shiftCalendarDate('2026-12-30', 3)).toBe('2027-01-02');
    expect(shiftCalendarDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-12-06')).toBe(0);
    expect(weekdayOf('2026-12-11')).toBe(5);
  });

  it('accepts only real calendar dates', () => {
    expect(isCalendarDate('2026-12-31')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('12/31/2026')).toBe(false);
  });
});

describe('business days (Sunday to Thursday, no holiday calendar)', () => {
  it('treats Friday and Saturday as the weekend', () => {
    const week = ['2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12'];
    expect(week.map(isBusinessDay)).toEqual([true, true, true, true, true, false, false]);
  });

  it('counts back over the weekend without counting the session day itself', () => {
    expect(subtractBusinessDays('2026-12-10', 2)).toBe('2026-12-08'); // Thursday -> Tuesday
    expect(subtractBusinessDays('2026-12-14', 2)).toBe('2026-12-10'); // Monday -> Thursday
    expect(subtractBusinessDays('2026-12-13', 2)).toBe('2026-12-09'); // Sunday -> Wednesday
    expect(subtractBusinessDays('2026-12-12', 2)).toBe('2026-12-09'); // Saturday -> Wednesday
    expect(subtractBusinessDays('2026-12-11', 2)).toBe('2026-12-09'); // Friday -> Wednesday
    expect(subtractBusinessDays('2026-12-08', 2)).toBe('2026-12-06'); // Tuesday -> Sunday
    expect(subtractBusinessDays('2026-12-10', 0)).toBe('2026-12-10');
  });
});

describe('subscription refund (rule 4.6)', () => {
  it('subtracts the FULL price of the sessions already used from what was paid', () => {
    expect(computeSubscriptionRefund({ paidIls: 4_000, usedSessions: { 60: 2, 90: 1 } })).toEqual({
      usedValueIls: 650 * 2 + 850,
      refundIls: 4_000 - (650 * 2 + 850),
    });
    expect(computeSubscriptionRefund({ paidIls: 2_000, usedSessions: { 30: 1 } })).toEqual({ usedValueIls: 450, refundIls: 1_550 });
    expect(computeSubscriptionRefund({ paidIls: 1_000, usedSessions: {} })).toEqual({ usedValueIls: 0, refundIls: 1_000 });
  });

  it('never refunds below zero', () => {
    expect(computeSubscriptionRefund({ paidIls: 500, usedSessions: { 90: 1 } })).toEqual({ usedValueIls: 850, refundIls: 0 });
  });

  it('answers null while an amount is unknown or malformed', () => {
    expect(computeSubscriptionRefund(undefined)).toBeNull();
    expect(computeSubscriptionRefund({ usedSessions: { 60: 1 } })).toBeNull();
    expect(computeSubscriptionRefund({ paidIls: 1_000 })).toBeNull();
    expect(computeSubscriptionRefund({ paidIls: -1, usedSessions: {} })).toBeNull();
    expect(computeSubscriptionRefund({ paidIls: 1_000, usedSessions: { 60: -1 } })).toBeNull();
    expect(computeSubscriptionRefund({ paidIls: 1_000, usedSessions: { 60: 1.5 } })).toBeNull();
  });
});

describe('policy constants', () => {
  it('matches the owner rules text', () => {
    expect(REFUND_POLICY.freeReschedule).toMatchObject({ clause: '4.1', minHoursBeforeSession: 24 });
    expect(REFUND_POLICY.rescheduleFee).toMatchObject({ clause: '4.2', amountIls: 150 });
    expect(REFUND_POLICY.fullRefund).toMatchObject({
      clause: '4.3',
      percent: 100,
      maxDaysSinceOrder: 14,
      minBusinessDaysBeforeSession: 2,
    });
    expect(REFUND_POLICY.noRefund.clause).toBe('4.4');
    expect(REFUND_POLICY.subscription.fullSessionPriceIls).toEqual({ 30: 450, 60: 650, 90: 850 });
    expect(REFUND_POLICY.response).toMatchObject({ clause: '12.1', days: 14 });
  });

  it('agrees with the booking registry for the 30 and 90 minute sessions', () => {
    // The 60-minute entry is deliberately not compared: rule 4.6 says 650, the registry sells 690.
    // That difference is an open question for the owner (docs/modules/refund-form.md).
    const price = (minutes: number) => SIMULATOR_PACKAGES.find((pkg) => pkg.durationMinutes === minutes && !pkg.id.includes('pro') && !pkg.id.includes('fear'))?.priceIls;
    expect(REFUND_POLICY.subscription.fullSessionPriceIls[30]).toBe(price(30));
    expect(REFUND_POLICY.subscription.fullSessionPriceIls[90]).toBe(price(90));
  });
});
