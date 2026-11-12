import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateRefundEligibility } from '@/lib/refund/refund-eligibility';
import type { RefundEligibilityInput } from '@/lib/refund/refund-types';

/**
 * Calendar used below (Israel, winter time UTC+2):
 *   Sun 6 Dec, Mon 7, Tue 8, Wed 9, Thu 10, Fri 11, Sat 12, Sun 13, Mon 14, Tue 15, Wed 16, Thu 17 Dec 2026.
 */
const at = (date: string, time = '10:00') => new Date(`${date}T${time}:00+02:00`);

function flight(overrides: Partial<RefundEligibilityInput> & Pick<RefundEligibilityInput, 'requestedAt'>) {
  return evaluateRefundEligibility({
    productKind: 'flight',
    reason: 'change_of_plans',
    orderDate: '2026-12-01',
    sessionDateTime: '2026-12-17T10:00',
    ...overrides,
  });
}

describe('flight sessions: the timing rules (4.1 to 4.4)', () => {
  it('offers a full refund (4.3) when the order is recent and 2 business days remain, with a free move as the alternative', () => {
    const result = flight({ requestedAt: at('2026-12-07') });
    expect(result.outcome).toBe('full_refund_possible');
    expect(result.alsoPossible).toEqual(['reschedule_free']);
    expect(result.clauses).toEqual(['4.3', '4.1']);
    expect(result.amounts).toEqual({ refundPercent: 100 });
    expect(result.coverage).toBe('explicit');
    expect(result.needsStaffConfirmation).toBe(true);
    expect(result.facts).toMatchObject({ daysSinceOrder: 6, orderWithinRefundWindow: true, meetsBusinessDayNotice: true });
    expect(result.facts.freeRescheduleUntil).toBe('2026-12-16T08:00:00.000Z');
  });

  describe('the 14-day limit counts calendar days since the order (day 14 is in, day 15 is out)', () => {
    it.each([
      ['2026-12-14', 13, true],
      ['2026-12-15', 14, true],
      ['2026-12-16', 15, false],
    ])('requested on %s is day %i', (requestedDate, days, within) => {
      const result = flight({ requestedAt: at(requestedDate), sessionDateTime: '2026-12-31T10:00' });
      expect(result.facts.daysSinceOrder).toBe(days);
      expect(result.facts.orderWithinRefundWindow).toBe(within);
      expect(result.outcome).toBe(within ? 'full_refund_possible' : 'reschedule_free');
      expect(result.refundBlockers).toEqual(within ? [] : ['order_older_than_14_days']);
    });

    it('reads the order date on the Israel calendar even when it was placed late at night', () => {
      // 22:30 UTC on 30 Nov is 00:30 on 1 Dec in Israel.
      const result = flight({ requestedAt: at('2026-12-15'), orderDate: '2026-11-30T22:30:00Z', sessionDateTime: '2026-12-31T10:00' });
      expect(result.facts.daysSinceOrder).toBe(14);
    });
  });

  describe('the 24-hour line (4.1 versus 4.2) uses exact hours', () => {
    const session = { sessionDateTime: '2026-12-09T10:00', orderDate: '2026-12-08' } as const;

    it('is free at exactly 24 hours', () => {
      const result = flight({ ...session, requestedAt: at('2026-12-08') });
      expect(result.facts.hoursUntilSession).toBe(24);
      expect(result.outcome).toBe('reschedule_free');
      expect(result.clauses[0]).toBe('4.1');
    });

    it('costs 150 ILS one minute later, and depends on availability (4.2)', () => {
      const result = flight({ ...session, requestedAt: at('2026-12-08', '10:01') });
      expect(result.outcome).toBe('reschedule_fee');
      expect(result.amounts).toEqual({ rescheduleFeeIls: 150 });
      expect(result.clauses[0]).toBe('4.2');
      expect(result.refundBlockers).toEqual(['less_than_2_business_days']);
      expect(result.facts.freeRescheduleUntil).toBeNull();
    });

    it('counts real elapsed hours across the autumn clock change (25 h between two noons)', () => {
      // Saturday 24 Oct 12:00 (+03:00) to Sunday 25 Oct 12:00 (+02:00) is 25 hours, not 24.
      const free = flight({
        orderDate: '2026-10-20',
        sessionDateTime: '2026-10-25T12:00',
        requestedAt: new Date('2026-10-24T12:00:00+03:00'),
      });
      expect(free.facts.hoursUntilSession).toBe(25);
      expect(free.outcome).toBe('reschedule_free');
      const fee = flight({
        orderDate: '2026-10-20',
        sessionDateTime: '2026-10-25T12:00',
        requestedAt: new Date('2026-10-24T13:30:00+03:00'),
      });
      expect(fee.facts.hoursUntilSession).toBe(23.5);
      expect(fee.outcome).toBe('reschedule_fee');
    });

    it('counts real elapsed hours across the spring clock change (23 h between two noons)', () => {
      const result = flight({
        orderDate: '2026-03-20',
        sessionDateTime: '2026-03-27T12:00',
        requestedAt: new Date('2026-03-26T12:00:00+02:00'),
      });
      expect(result.facts.hoursUntilSession).toBe(23);
      expect(result.outcome).toBe('reschedule_fee');
    });
  });

  describe('2 business days before the session (Sunday to Thursday)', () => {
    it('Sunday session: Wednesday is the last day (the weekend is skipped)', () => {
      const session = { sessionDateTime: '2026-12-13T10:00', orderDate: '2026-12-01' } as const;
      const wednesday = flight({ ...session, requestedAt: at('2026-12-09', '23:30') });
      expect(wednesday.outcome).toBe('full_refund_possible');
      expect(wednesday.facts.fullRefundDeadline).toBe('2026-12-09');
      const thursday = flight({ ...session, requestedAt: at('2026-12-10', '09:00') });
      expect(thursday.outcome).toBe('reschedule_free');
      expect(thursday.refundBlockers).toEqual(['less_than_2_business_days']);
    });

    it('Monday session: Thursday is the last day, Friday is too late', () => {
      const session = { sessionDateTime: '2026-12-14T10:00', orderDate: '2026-12-01' } as const;
      expect(flight({ ...session, requestedAt: at('2026-12-10') }).outcome).toBe('full_refund_possible');
      expect(flight({ ...session, requestedAt: at('2026-12-11') }).outcome).toBe('reschedule_free');
    });

    it('Thursday session: Tuesday is the last day, Wednesday is too late', () => {
      const session = { sessionDateTime: '2026-12-10T10:00', orderDate: '2026-12-01' } as const;
      expect(flight({ ...session, requestedAt: at('2026-12-08', '23:00') }).outcome).toBe('full_refund_possible');
      expect(flight({ ...session, requestedAt: at('2026-12-09') }).outcome).toBe('reschedule_free');
    });

    it('a request sent on the weekend counts against the same cutoff', () => {
      const session = { sessionDateTime: '2026-12-15T10:00', orderDate: '2026-12-01' } as const;
      expect(flight({ ...session, requestedAt: at('2026-12-12') }).outcome).toBe('full_refund_possible'); // Saturday, cutoff Sunday
      expect(flight({ ...session, requestedAt: at('2026-12-14') }).outcome).toBe('reschedule_free');
    });

    it('reports the earlier of the two limits as the deadline', () => {
      // Order on 1 Dec: day 14 is 15 Dec; a Thursday 31 Dec session allows until Tuesday 29 Dec.
      const result = flight({ requestedAt: at('2026-12-07'), sessionDateTime: '2026-12-31T10:00' });
      expect(result.facts.fullRefundDeadline).toBe('2026-12-15');
    });
  });

  describe('the session day, a no-show and a session that already happened (4.4)', () => {
    it('gives no refund on the session day, with a paid reschedule while the session is still ahead', () => {
      const result = flight({ requestedAt: at('2026-12-09', '08:00'), sessionDateTime: '2026-12-09T18:00' });
      expect(result.outcome).toBe('no_refund_window');
      expect(result.clauses).toEqual(['4.4', '4.2']);
      expect(result.alsoPossible).toEqual(['reschedule_fee']);
      expect(result.amounts).toEqual({ rescheduleFeeIls: 150 });
      expect(result.facts.sessionIsToday).toBe(true);
    });

    it('gives no refund after the start time (no-show)', () => {
      const result = flight({ requestedAt: at('2026-12-09', '19:00'), sessionDateTime: '2026-12-09T18:00' });
      expect(result.outcome).toBe('no_refund_window');
      expect(result.alsoPossible).toEqual([]);
      expect(result.staff.flags).toContain('session_passed');
    });

    it('treats the exact start moment as started', () => {
      const result = flight({ requestedAt: at('2026-12-09', '18:00'), sessionDateTime: '2026-12-09T18:00' });
      expect(result.facts.sessionStarted).toBe(true);
      expect(result.outcome).toBe('no_refund_window');
    });

    it('sends a past session with the reason "other" to a person (the customer may have ended early, 4.5)', () => {
      const result = flight({ requestedAt: at('2026-12-12'), sessionDateTime: '2026-12-09T18:00', reason: 'other' });
      expect(result.outcome).toBe('manual_review');
      expect(result.clauses).toEqual(['4.4', '4.5']);
      expect(result.coverage).toBe('partial');
    });
  });

  it('reads a bare session date at the opening time and marks it as assumed', () => {
    const result = flight({ requestedAt: at('2026-12-07'), sessionDateTime: '2026-12-17' });
    expect(result.facts).toMatchObject({ sessionDate: '2026-12-17', sessionTime: '09:00', sessionTimeAssumed: true });
    expect(result.staff.flags).toContain('session_time_assumed');
  });

  it('accepts an instant with an offset and a Date as the session start', () => {
    const fromOffset = flight({ requestedAt: at('2026-12-07'), sessionDateTime: '2026-12-17T08:00:00.000Z' });
    const fromDate = flight({ requestedAt: at('2026-12-07'), sessionDateTime: new Date('2026-12-17T08:00:00Z') });
    expect(fromOffset.facts).toMatchObject({ sessionDate: '2026-12-17', sessionTime: '10:00', sessionTimeAssumed: false });
    expect(fromDate.facts.sessionInstant).toBe(fromOffset.facts.sessionInstant);
  });

  it('still answers when the order date is unknown, and says so for staff', () => {
    const result = flight({ requestedAt: at('2026-12-07'), orderDate: null });
    expect(result.outcome).toBe('full_refund_possible');
    expect(result.facts.orderWithinRefundWindow).toBeNull();
    expect(result.staff.flags).toContain('order_date_unknown');
  });

  it('sends a flight without a usable session date to a person', () => {
    for (const sessionDateTime of [undefined, null, '', 'tomorrow', '2026-02-30']) {
      const result = flight({ requestedAt: at('2026-12-07'), sessionDateTime });
      expect(result.outcome).toBe('manual_review');
      expect(result.staff.flags).toContain('session_date_missing');
    }
  });

  it('flags illness for staff without changing the timing outcome', () => {
    const result = flight({ requestedAt: at('2026-12-07'), reason: 'illness' });
    expect(result.outcome).toBe('full_refund_possible');
    expect(result.staff.flags).toContain('illness');
  });
});

describe('the other products and reasons', () => {
  it('routes a centre fault to review under 5.1 and 5.2 whatever the timing', () => {
    for (const requestedAt of [at('2026-12-07'), at('2026-12-09', '19:00')]) {
      const result = flight({ requestedAt, reason: 'centre_fault', sessionDateTime: '2026-12-09T18:00' });
      expect(result.outcome).toBe('centre_fault_review');
      expect(result.clauses).toEqual(['5.1', '5.2']);
      expect(result.amounts.refundPercent).toBe(100);
    }
    expect(flight({ requestedAt: at('2026-12-07'), reason: 'centre_fault' }).staff.priority).toBe('high');
  });

  it('computes a subscription refund from the full price of the sessions used (4.6)', () => {
    const result = evaluateRefundEligibility({
      productKind: 'subscription',
      reason: 'subscription',
      requestedAt: at('2026-12-07'),
      subscription: { paidIls: 4_000, usedSessions: { 60: 1, 90: 1 } },
    });
    expect(result.outcome).toBe('subscription_prorata');
    expect(result.clauses).toEqual(['4.6']);
    expect(result.amounts.subscription).toEqual({ usedValueIls: 1_500, refundIls: 2_500 });
    expect(result.staff.flags).not.toContain('subscription_check_used_sessions');
  });

  it('asks staff to read the used sessions when they are not known', () => {
    const result = evaluateRefundEligibility({ productKind: 'subscription', reason: 'subscription', requestedAt: at('2026-12-07') });
    expect(result.outcome).toBe('subscription_prorata');
    expect(result.amounts).toEqual({});
    expect(result.staff.flags).toContain('subscription_check_used_sessions');
  });

  it('sends a gift voucher to a person, because the rules text does not describe voucher refunds', () => {
    const result = evaluateRefundEligibility({
      productKind: 'voucher',
      reason: 'gift_voucher',
      orderDate: '2026-12-01',
      requestedAt: at('2026-12-20'),
    });
    expect(result.outcome).toBe('manual_review');
    expect(result.coverage).toBe('none');
    expect(result.clauses).toEqual([]);
    expect(result.facts.orderWithinRefundWindow).toBe(false);
    expect(result.staff.flags).toContain('voucher_not_covered_by_rules');
  });

  it('sends a duplicate payment to a person with high priority', () => {
    const result = flight({ requestedAt: at('2026-12-07'), reason: 'duplicate_payment' });
    expect(result.outcome).toBe('manual_review');
    expect(result.coverage).toBe('none');
    expect(result.staff.priority).toBe('high');
    expect(result.staff.flags).toContain('duplicate_charge');
  });
});

describe('staff priority', () => {
  it('is urgent for any upcoming session inside 48 hours', () => {
    const result = flight({ requestedAt: at('2026-12-08', '09:00'), sessionDateTime: '2026-12-09T18:00' });
    expect(result.staff.priority).toBe('urgent');
    expect(result.staff.flags).toContain('session_within_48h');
  });

  it('is normal for an ordinary upcoming request and low for a session that is over', () => {
    expect(flight({ requestedAt: at('2026-12-07') }).staff.priority).toBe('normal');
    expect(flight({ requestedAt: at('2026-12-10'), sessionDateTime: '2026-12-09T18:00' }).staff.priority).toBe('low');
  });

  it('keeps a centre fault high after the session and urgent before it', () => {
    expect(flight({ requestedAt: at('2026-12-10'), sessionDateTime: '2026-12-09T18:00', reason: 'centre_fault' }).staff.priority).toBe('high');
    expect(flight({ requestedAt: at('2026-12-09', '08:00'), sessionDateTime: '2026-12-09T18:00', reason: 'centre_fault' }).staff.priority).toBe('urgent');
  });
});

describe('input handling', () => {
  it('rejects an invalid request moment', () => {
    expect(() => flight({ requestedAt: new Date('nope') })).toThrow(RangeError);
  });

  it('is deterministic', () => {
    const input = { requestedAt: at('2026-12-07') };
    expect(flight(input)).toEqual(flight(input));
  });
});

describe('invariants over random requests', () => {
  const minutes = fc.integer({ min: 0, max: 60 * 24 * 40 });
  const base = Date.parse('2026-12-01T00:00:00+02:00');

  it('never promises a full refund inside 24 hours, on the session day, or after the start', () => {
    fc.assert(
      fc.property(minutes, minutes, (requestMinutes, sessionMinutes) => {
        const requestedAt = new Date(base + requestMinutes * 60_000);
        const session = new Date(base + sessionMinutes * 60_000);
        const result = evaluateRefundEligibility({
          productKind: 'flight',
          reason: 'change_of_plans',
          orderDate: '2026-12-01',
          sessionDateTime: session,
          requestedAt,
        });
        expect(result.needsStaffConfirmation).toBe(true);
        if (result.outcome === 'full_refund_possible') {
          expect(result.facts.hoursUntilSession as number).toBeGreaterThanOrEqual(24);
          expect(result.facts.sessionIsToday).toBe(false);
          expect(result.facts.sessionStarted).toBe(false);
          expect(result.facts.daysSinceOrder as number).toBeLessThanOrEqual(14);
        }
        if (result.facts.hoursUntilSession !== null && result.facts.hoursUntilSession > 0 && result.facts.hoursUntilSession < 24) {
          expect(['reschedule_fee', 'no_refund_window']).toContain(result.outcome);
        }
        if (result.facts.hoursUntilSession !== null && result.facts.hoursUntilSession >= 24 && result.outcome === 'reschedule_fee') {
          throw new Error('a request 24 hours or more ahead must never cost the fee');
        }
      }),
      { numRuns: 400 }
    );
  });
});
