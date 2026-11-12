import type { Language } from '@/lib/i18n/translations';

/** What the customer bought. Drives which part of the rules applies. */
export const REFUND_PRODUCT_KINDS = ['flight', 'voucher', 'subscription'] as const;
export type RefundProductKind = (typeof REFUND_PRODUCT_KINDS)[number];

/** Why the customer asks. `gift_voucher` and `subscription` exist only for those product kinds. */
export const REFUND_REASONS = [
  'change_of_plans',
  'illness',
  'centre_fault',
  'duplicate_payment',
  'gift_voucher',
  'subscription',
  'other',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/** The likely outcome of the request under the rules. It informs; it never decides or pays. */
export const REFUND_OUTCOMES = [
  'full_refund_possible',
  'reschedule_free',
  'reschedule_fee',
  'no_refund_window',
  'centre_fault_review',
  'subscription_prorata',
  'manual_review',
] as const;
export type RefundOutcome = (typeof REFUND_OUTCOMES)[number];

export type RefundPriority = 'urgent' | 'high' | 'normal' | 'low';

/** Why a full refund is not (or not yet certainly) available. */
export type RefundBlocker =
  | 'order_older_than_14_days'
  | 'less_than_2_business_days'
  | 'session_day_or_later'
  | 'session_time_unknown';

/** Notes for the staff member who reads the request. Never shown to the customer as a promise. */
export type RefundStaffFlag =
  | 'illness'
  | 'duplicate_charge'
  | 'order_not_verified'
  | 'order_date_unknown'
  | 'session_date_missing'
  | 'session_time_assumed'
  | 'session_passed'
  | 'session_within_48h'
  | 'order_older_than_14_days'
  | 'voucher_not_covered_by_rules'
  | 'subscription_check_used_sessions';

/** How directly the rules text covers the case. */
export type RefundCoverage = 'explicit' | 'partial' | 'none';

export interface SubscriptionRefund {
  /** Sum of the FULL prices of the sessions already used (4.6). */
  usedValueIls: number;
  /** Paid amount minus used value, never below zero. */
  refundIls: number;
}

export interface RefundEligibilityInput {
  productKind: RefundProductKind;
  reason: RefundReason;
  /** Order date: Israel calendar date `YYYY-MM-DD`, an ISO instant, or a Date. Unknown for unverified orders. */
  orderDate?: string | Date | null;
  /**
   * Session start: a Date or ISO instant with offset, an Israel wall-clock `YYYY-MM-DDTHH:mm`, or a bare
   * `YYYY-MM-DD` (the opening time is assumed). Empty when the customer has no session.
   */
  sessionDateTime?: string | Date | null;
  /** The moment the customer asks. The server passes its own clock, never the browser's. */
  requestedAt: Date;
  /** Subscription refunds only: what was paid and how many sessions of each length were used. */
  subscription?: { paidIls?: number; usedSessions?: Partial<Record<30 | 60 | 90, number>> };
}

export interface RefundFacts {
  /** Israel calendar date of the request. */
  requestedOn: string;
  sessionDate: string | null;
  sessionTime: string | null;
  /** True when only a date was given and the opening time was assumed. */
  sessionTimeAssumed: boolean;
  /** Session start as an ISO instant, or null without a session. */
  sessionInstant: string | null;
  hoursUntilSession: number | null;
  sessionStarted: boolean;
  sessionIsToday: boolean;
  /** ISO instant until which a date change is free (session start minus 24 h), while it is still ahead. */
  freeRescheduleUntil: string | null;
  daysSinceOrder: number | null;
  orderWithinRefundWindow: boolean | null;
  meetsBusinessDayNotice: boolean | null;
  /** Last Israel date a full refund could still be requested, from whichever limits are known. */
  fullRefundDeadline: string | null;
}

export interface RefundEvaluation {
  outcome: RefundOutcome;
  /** Other remedies open to the customer, for example a free reschedule instead of a refund. */
  alsoPossible: RefundOutcome[];
  /** Clause numbers behind the outcome, most relevant first. */
  clauses: string[];
  refundBlockers: RefundBlocker[];
  coverage: RefundCoverage;
  amounts: {
    rescheduleFeeIls?: number;
    refundPercent?: number;
    subscription?: SubscriptionRefund;
  };
  facts: RefundFacts;
  staff: { priority: RefundPriority; flags: RefundStaffFlag[] };
  /** Always true: nothing is ever refunded or changed without a person confirming it. */
  needsStaffConfirmation: true;
}

/** Customer-facing language of the request (for the reply and the acknowledgement). */
export type RefundLanguage = Language;
