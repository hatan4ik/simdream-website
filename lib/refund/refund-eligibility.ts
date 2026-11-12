import { REFUND_POLICY } from './refund-policy';
import { subtractBusinessDays } from './business-days';
import {
  calendarDaysBetween,
  isCalendarDate,
  israelDateOf,
  israelLocalToInstant,
  israelTimeOf,
  shiftCalendarDate,
} from './israel-time';
import { computeSubscriptionRefund } from './subscription-refund';
import type {
  RefundBlocker,
  RefundCoverage,
  RefundEligibilityInput,
  RefundEvaluation,
  RefundFacts,
  RefundOutcome,
  RefundPriority,
  RefundReason,
  RefundStaffFlag,
} from './refund-types';

/**
 * The refund rules as a pure function. It tells the customer the LIKELY outcome and tells staff
 * how urgent the request is. It never approves, pays or changes anything: every request still
 * goes to a person (`needsStaffConfirmation` is always true).
 *
 * Time: all dates are Israel wall-clock dates. A "business day" is Sunday to Thursday with no
 * holiday calendar (REFUND_POLICY.businessWeek). The 14-day and 2-business-day limits are counted
 * by calendar date, the 24-hour limit by exact hours.
 */
const HOUR_MS = 3_600_000;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})[T ]([01]\d|2[0-3]):([0-5]\d)(?::\d{2})?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface Session {
  instant: Date;
  date: string;
  time: string;
  assumed: boolean;
}

function fromInstant(instant: Date, assumed: boolean): Session {
  return { instant, date: israelDateOf(instant), time: israelTimeOf(instant), assumed };
}

function resolveSession(value: RefundEligibilityInput['sessionDateTime']): Session | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : fromInstant(value, false);
  const text = value.trim();
  if (DATE_ONLY.test(text)) {
    if (!isCalendarDate(text)) return null;
    const time = REFUND_POLICY.assumedSessionTime;
    return { instant: israelLocalToInstant(text, time), date: text, time, assumed: true };
  }
  const wall = WALL_CLOCK.exec(text);
  if (wall) {
    if (!isCalendarDate(wall[1])) return null;
    const time = `${wall[2]}:${wall[3]}`;
    return { instant: israelLocalToInstant(wall[1], time), date: wall[1], time, assumed: false };
  }
  if (!ISO_WITH_OFFSET.test(text)) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : fromInstant(parsed, false);
}

function resolveOrderDate(value: RefundEligibilityInput['orderDate']): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : israelDateOf(value);
  const text = value.trim();
  if (DATE_ONLY.test(text)) return isCalendarDate(text) ? text : null;
  if (!ISO_WITH_OFFSET.test(text)) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : israelDateOf(parsed);
}

const earlier = (a: string | null, b: string | null): string | null => (a && b ? (a < b ? a : b) : (a ?? b));
const unique = <T>(items: T[]): T[] => [...new Set(items)];

interface Verdict {
  outcome: RefundOutcome;
  clauses: string[];
  coverage: RefundCoverage;
  alsoPossible?: RefundOutcome[];
  blockers?: RefundBlocker[];
  amounts?: RefundEvaluation['amounts'];
  flags?: RefundStaffFlag[];
}

function priorityFor(outcome: RefundOutcome, reason: RefundReason, facts: RefundFacts): RefundPriority {
  const upcoming = facts.hoursUntilSession !== null && facts.hoursUntilSession > 0;
  if (upcoming && (facts.hoursUntilSession as number) < REFUND_POLICY.urgentWithinHours) return 'urgent';
  if (outcome === 'centre_fault_review' || reason === 'duplicate_payment') return 'high';
  if (outcome === 'no_refund_window' && !upcoming) return 'low';
  return 'normal';
}

/** The timing rules (4.1 to 4.4) for a flight session that has not started. */
function judgeUpcomingFlight(facts: RefundFacts): Verdict {
  const { freeReschedule, rescheduleFee, fullRefund, noRefund } = REFUND_POLICY;
  const hours = facts.hoursUntilSession as number;

  if (facts.sessionIsToday) {
    return {
      outcome: 'no_refund_window',
      clauses: [noRefund.clause, rescheduleFee.clause],
      coverage: 'explicit',
      alsoPossible: ['reschedule_fee'],
      blockers: ['session_day_or_later'],
      amounts: { rescheduleFeeIls: rescheduleFee.amountIls },
    };
  }

  const blockers: RefundBlocker[] = [];
  if (facts.orderWithinRefundWindow === false) blockers.push('order_older_than_14_days');
  if (facts.meetsBusinessDayNotice === false) blockers.push('less_than_2_business_days');
  const freeMove = hours >= freeReschedule.minHoursBeforeSession;
  const moveOutcome: RefundOutcome = freeMove ? 'reschedule_free' : 'reschedule_fee';
  const moveClause = freeMove ? freeReschedule.clause : rescheduleFee.clause;
  const feeAmounts = freeMove ? {} : { rescheduleFeeIls: rescheduleFee.amountIls };

  if (blockers.length === 0) {
    const flags: RefundStaffFlag[] = facts.orderWithinRefundWindow === null ? ['order_date_unknown'] : [];
    return {
      outcome: 'full_refund_possible',
      clauses: [fullRefund.clause, moveClause],
      coverage: 'explicit',
      alsoPossible: [moveOutcome],
      amounts: { refundPercent: fullRefund.percent, ...feeAmounts },
      flags,
    };
  }

  return {
    outcome: moveOutcome,
    clauses: [moveClause, fullRefund.clause],
    coverage: 'explicit',
    blockers,
    amounts: feeAmounts,
    flags: blockers.includes('order_older_than_14_days') ? ['order_older_than_14_days'] : [],
  };
}

function judge(input: RefundEligibilityInput, facts: RefundFacts): Verdict {
  const { reason, productKind } = input;
  const { noRefund, endedEarly, subscription, centreFault, fullRefund, freeReschedule } = REFUND_POLICY;

  if (reason === 'centre_fault') {
    return {
      outcome: 'centre_fault_review',
      clauses: [...centreFault.clauses],
      coverage: 'explicit',
      amounts: { refundPercent: fullRefund.percent },
    };
  }
  if (reason === 'duplicate_payment') {
    return { outcome: 'manual_review', clauses: [], coverage: 'none', flags: ['duplicate_charge'] };
  }
  if (productKind === 'subscription') {
    const computed = computeSubscriptionRefund(input.subscription);
    return {
      outcome: 'subscription_prorata',
      clauses: [subscription.clause],
      coverage: 'explicit',
      amounts: computed ? { subscription: computed } : {},
      flags: computed ? [] : ['subscription_check_used_sessions'],
    };
  }
  if (productKind === 'voucher') {
    return { outcome: 'manual_review', clauses: [], coverage: 'none', flags: ['voucher_not_covered_by_rules'] };
  }

  if (facts.sessionDate === null) {
    return {
      outcome: 'manual_review',
      clauses: [freeReschedule.clause, fullRefund.clause],
      coverage: 'partial',
      flags: ['session_date_missing'],
    };
  }
  if (facts.sessionStarted) {
    return reason === 'other'
      ? { outcome: 'manual_review', clauses: [noRefund.clause, endedEarly.clause], coverage: 'partial', flags: ['session_passed'] }
      : {
          outcome: 'no_refund_window',
          clauses: [noRefund.clause],
          coverage: 'explicit',
          blockers: ['session_day_or_later'],
          flags: ['session_passed'],
        };
  }
  return judgeUpcomingFlight(facts);
}

/** Evaluates one refund request against the rules. Pure: the same input always gives the same answer. */
export function evaluateRefundEligibility(input: RefundEligibilityInput): RefundEvaluation {
  const { requestedAt } = input;
  if (!(requestedAt instanceof Date) || Number.isNaN(requestedAt.getTime())) {
    throw new RangeError('requestedAt must be a valid Date.');
  }
  const { fullRefund, freeReschedule } = REFUND_POLICY;
  const requestedOn = israelDateOf(requestedAt);
  const session = resolveSession(input.sessionDateTime);
  const orderDate = resolveOrderDate(input.orderDate);

  const daysSinceOrder = orderDate ? calendarDaysBetween(orderDate, requestedOn) : null;
  const orderWithinRefundWindow = daysSinceOrder === null ? null : daysSinceOrder <= fullRefund.maxDaysSinceOrder;
  const hoursUntil = session ? (session.instant.getTime() - requestedAt.getTime()) / HOUR_MS : null;
  const lastBusinessDayToCancel = session ? subtractBusinessDays(session.date, fullRefund.minBusinessDaysBeforeSession) : null;
  const orderLimit = orderDate ? shiftCalendarDate(orderDate, fullRefund.maxDaysSinceOrder) : null;
  const sessionStarted = hoursUntil !== null && hoursUntil <= 0;

  const facts: RefundFacts = {
    requestedOn,
    sessionDate: session?.date ?? null,
    sessionTime: session?.time ?? null,
    sessionTimeAssumed: session?.assumed ?? false,
    sessionInstant: session ? session.instant.toISOString() : null,
    hoursUntilSession: hoursUntil,
    sessionStarted,
    sessionIsToday: session ? session.date === requestedOn : false,
    freeRescheduleUntil:
      session && hoursUntil !== null && hoursUntil >= freeReschedule.minHoursBeforeSession
        ? new Date(session.instant.getTime() - freeReschedule.minHoursBeforeSession * HOUR_MS).toISOString()
        : null,
    daysSinceOrder,
    orderWithinRefundWindow,
    meetsBusinessDayNotice: lastBusinessDayToCancel === null ? null : requestedOn <= lastBusinessDayToCancel,
    fullRefundDeadline: earlier(lastBusinessDayToCancel, orderLimit),
  };

  const verdict = judge(input, facts);
  const flags = new Set<RefundStaffFlag>(verdict.flags ?? []);
  if (input.reason === 'illness') flags.add('illness');
  if (session?.assumed) flags.add('session_time_assumed');
  if (hoursUntil !== null && hoursUntil > 0 && hoursUntil < REFUND_POLICY.urgentWithinHours) flags.add('session_within_48h');

  return {
    outcome: verdict.outcome,
    alsoPossible: verdict.alsoPossible ?? [],
    clauses: unique(verdict.clauses),
    refundBlockers: verdict.blockers ?? [],
    coverage: verdict.coverage,
    amounts: verdict.amounts ?? {},
    facts,
    staff: { priority: priorityFor(verdict.outcome, input.reason, facts), flags: [...flags] },
    needsStaffConfirmation: true,
  };
}
