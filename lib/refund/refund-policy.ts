import { FACILITY_INFO } from '@/lib/config/facility-info';

/**
 * Every number the refund rules (תקנון, section 4 "שינוי וביטול הזמנה", 5.1 and 4.6) define, in one
 * place and with its clause. The policy functions read only this object, so a change of rules is a
 * one-line change here and a test run, never a hunt through the UI.
 *
 * Source of truth: the owner's original Hebrew rules text. Clause numbers follow that text.
 * `/rules#refunds` (the rules page) states the same terms in the six languages.
 */
export const REFUND_POLICY = {
  /** Where the rules clause lives; the form links here from its declaration. */
  rulesPath: '/rules#refunds',
  privacyPath: '/privacy-policy',

  /** 4.1: a session can be moved free of charge when the request arrives this many hours ahead. */
  freeReschedule: { clause: '4.1', minHoursBeforeSession: 24 },

  /** 4.2: a change requested inside that window costs a fee and depends on calendar availability. */
  rescheduleFee: { clause: '4.2', amountIls: 150 },

  /**
   * 4.3: a full (100%) refund needs BOTH: no more than `maxDaysSinceOrder` days since the order,
   * AND the cancellation at least `minBusinessDaysBeforeSession` business days before the session.
   * Day counting is by Israel calendar date: an order placed on the 1st can still be cancelled
   * through the 15th (14 days later) and not on the 16th (boundary decision, see docs/modules).
   */
  fullRefund: { clause: '4.3', percent: 100, maxDaysSinceOrder: 14, minBusinessDaysBeforeSession: 2 },

  /** 4.4: cancelling on the session day itself, or not showing up, earns no refund. */
  noRefund: { clause: '4.4' },

  /** 4.5: ending a session early. Any refund is pro rata, by the base price of the time delivered. */
  endedEarly: { clause: '4.5' },

  /**
   * 4.6: the subscription discount holds only if every session is used. A refund for an unused
   * subscription is computed from the FULL price of the sessions already used.
   * NOTE: the rules list 60 min at 650, while the booking registry sells 60 min at 690.
   * Kept as the rules state it; flagged as an open question for the owner.
   */
  subscription: { clause: '4.6', fullSessionPriceIls: { 30: 450, 60: 650, 90: 850 } as Record<number, number> },

  /** 5.1 / 5.2: a cancellation or delay that is the centre's fault earns a full refund or a new date. */
  centreFault: { clauses: ['5.1', '5.2'] as const },

  /** 12.1: a dispute starts with a written request to the centre, which has this long to answer. */
  response: { clause: '12.1', days: 14 },

  /**
   * "Business day" assumption: the Israeli working week runs Sunday to Thursday, so Friday and
   * Saturday are the weekend (0 = Sunday ... 6 = Saturday). No holiday calendar is applied; the
   * rules name none and inventing one would be a legal decision. Staff add holidays by hand.
   */
  businessWeek: { weekendDays: [5, 6] as readonly number[] },

  /** All dates and times are read on the Israel wall clock. */
  timeZone: 'Asia/Jerusalem',

  /**
   * A session given only by date is read at the facility's opening time, the earliest it could
   * start, and the result is marked as assumed so nobody is promised more than the rules give.
   */
  assumedSessionTime: FACILITY_INFO.hours.daily.open,

  /** Staff triage: a session closer than this (and not yet started) makes a request urgent. */
  urgentWithinHours: 48,
} as const;

export type RefundClause = string;
