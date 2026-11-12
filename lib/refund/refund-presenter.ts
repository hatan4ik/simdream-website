import type { Language } from '@/lib/i18n/translations';
import { fillCopy } from './copy/fill-copy';
import type { RefundCopy } from './copy/refund-copy-types';
import { formatInstantInIsrael, formatSessionDate } from './refund-format';
import { REFUND_POLICY } from './refund-policy';
import type { RefundEvaluation, RefundOutcome } from './refund-types';

/**
 * Turns a policy evaluation into the words of the "what to expect" panel. Pure: the same
 * evaluation, copy and language always give the same view, so the panel can be tested without a
 * browser. Every number comes from REFUND_POLICY; none is written in the copy files.
 */
export type PanelTone = 'positive' | 'info' | 'caution' | 'neutral';

export interface PanelView {
  outcome: RefundOutcome;
  tone: PanelTone;
  headline: string;
  body: string;
  /** Why a full refund is not available, one line each. */
  blockers: string[];
  /** Facts the customer can check: session, days since the order, deadlines. */
  details: string[];
  /** "Rules, clause 4.3, 4.1", or null when no clause applies. */
  clauses: string | null;
  /** The "keep your flight" suggestion, shown while a free reschedule is still open. */
  nudge: { title: string; body: string } | null;
  /** Whole-panel assumption warning: the session time was not given. */
  timeAssumed: boolean;
}

const TONES: Record<RefundOutcome, PanelTone> = {
  full_refund_possible: 'positive',
  reschedule_free: 'info',
  reschedule_fee: 'caution',
  no_refund_window: 'caution',
  centre_fault_review: 'info',
  subscription_prorata: 'info',
  manual_review: 'neutral',
};

export function describeEvaluation(evaluation: RefundEvaluation, copy: RefundCopy, language: Language): PanelView {
  const { fullRefund, freeReschedule, rescheduleFee, subscription } = REFUND_POLICY;
  const { facts } = evaluation;
  const until = facts.freeRescheduleUntil ? formatInstantInIsrael(language, facts.freeRescheduleUntil) : '';
  const values = {
    days: fullRefund.maxDaysSinceOrder,
    businessDays: fullRefund.minBusinessDaysBeforeSession,
    hours: freeReschedule.minHoursBeforeSession,
    fee: rescheduleFee.amountIls,
    p30: subscription.fullSessionPriceIls[30],
    p60: subscription.fullSessionPriceIls[60],
    p90: subscription.fullSessionPriceIls[90],
    until,
  };

  const text = copy.panel.outcomes[evaluation.outcome];
  let body = fillCopy(text.body, values);
  if (evaluation.outcome === 'manual_review') {
    const { flags } = evaluation.staff;
    const manual = copy.panel.manual;
    if (flags.includes('voucher_not_covered_by_rules')) body = manual.voucher;
    else if (flags.includes('duplicate_charge')) body = manual.duplicate;
    else if (flags.includes('session_date_missing')) body = manual.noDate;
    else if (flags.includes('session_passed')) body = manual.sessionOver;
  }

  const details: string[] = [];
  const { facts: factCopy } = copy.panel;
  if (facts.sessionDate) {
    details.push(
      fillCopy(factCopy.session, { date: formatSessionDate(language, facts.sessionDate), time: facts.sessionTime ?? '' })
    );
  }
  if (facts.daysSinceOrder !== null && facts.daysSinceOrder >= 0) {
    details.push(fillCopy(factCopy.orderAge, { days: facts.daysSinceOrder }));
  }
  if (until) details.push(fillCopy(factCopy.freeUntil, { until }));
  if (evaluation.outcome === 'full_refund_possible' && facts.fullRefundDeadline) {
    details.push(fillCopy(factCopy.fullRefundUntil, { deadline: formatSessionDate(language, facts.fullRefundDeadline) }));
  }

  const nudged =
    facts.freeRescheduleUntil !== null &&
    (evaluation.outcome === 'reschedule_free' || evaluation.alsoPossible.includes('reschedule_free'));

  return {
    outcome: evaluation.outcome,
    tone: TONES[evaluation.outcome],
    headline: fillCopy(text.headline, values),
    body,
    blockers: evaluation.refundBlockers
      .filter((blocker) => blocker === 'order_older_than_14_days' || blocker === 'less_than_2_business_days')
      .map((blocker) => fillCopy(copy.panel.blockers[blocker], values)),
    details,
    clauses: evaluation.clauses.length ? fillCopy(factCopy.clauses, { clauses: evaluation.clauses.join(', ') }) : null,
    nudge: nudged ? { title: copy.panel.nudge.title, body: fillCopy(copy.panel.nudge.body, values) } : null,
    timeAssumed: facts.sessionTimeAssumed,
  };
}
