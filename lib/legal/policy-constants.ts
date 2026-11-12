/**
 * The refund and rescheduling terms of rules clauses 4.1 to 4.6, as numbers.
 *
 * These come from the owner's original rules text. They are legal terms, not list prices, so they
 * live here (and are pinned in `tests/unit/legal-content.test.ts`) instead of following the price
 * registry silently. The refund request form and the checkout copy read them from here so that
 * every surface quotes the same terms.
 */

/** Clause 4.3: full refund only if fewer than this many days passed since the order. */
export const REFUND_WINDOW_DAYS = 14;

/** Clause 4.3: and the cancellation is made at least this many business days before the session. */
export const REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION = 2;

/** Clauses 4.1 and 4.2: free rescheduling needs a request this many hours before the session. */
export const FREE_RESCHEDULE_NOTICE_HOURS = 24;

/** Clause 4.2: rescheduling with less notice costs this many shekels, subject to availability. */
export const RESCHEDULE_FEE_ILS = 150;

/**
 * Clause 4.6: when a subscription is refunded, sessions already used are charged at these full
 * per-session prices (session minutes to shekels). The original rules state 650 for 60 minutes,
 * which differs from today's list price; see docs/modules/legal-content.md.
 */
export const SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS = {
  30: 450,
  60: 650,
  90: 850,
} as const;

/** Rules clause 3.5 and 3.6 values live in FACILITY_INFO.requirements and are not repeated here. */
