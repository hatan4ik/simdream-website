/**
 * Public, client-safe entry of the refund module (`/refund`, `POST /api/refund-requests`):
 * the rules as pure functions, field validation, the reference format and the six-language copy.
 * No I/O and no server-only code. Storage, email, the service, the request guards and the zod
 * request schemas live behind `@/lib/refund/server`.
 */
export { REFUND_POLICY } from './refund-policy';
export { evaluateRefundEligibility } from './refund-eligibility';
export { computeSubscriptionRefund } from './subscription-refund';
export { isBusinessDay, subtractBusinessDays } from './business-days';
export {
  calendarDaysBetween,
  isCalendarDate,
  israelDateOf,
  israelLocalToInstant,
  israelTimeOf,
  shiftCalendarDate,
} from './israel-time';
export {
  REFUND_FIELD_LIMITS,
  REFUND_REASONS_BY_KIND,
  checkEmail,
  checkName,
  checkOrderReference,
  checkPhone,
  checkSessionDate,
  checkSessionTime,
  isRefundReason,
  normalizeOrderReference,
  reasonFitsProduct,
  type FieldErrorCode,
} from './refund-fields';
export { REFUND_REFERENCE_PATTERN, generateRefundReference } from './refund-reference';
export {
  REFUND_OUTCOMES,
  REFUND_PRODUCT_KINDS,
  REFUND_REASONS,
  type RefundBlocker,
  type RefundCoverage,
  type RefundEligibilityInput,
  type RefundEvaluation,
  type RefundFacts,
  type RefundOutcome,
  type RefundPriority,
  type RefundProductKind,
  type RefundReason,
  type RefundStaffFlag,
  type SubscriptionRefund,
} from './refund-types';
export { REFUND_COPY, fillCopy, refundCopyFor, type RefundCopy, type RefundEmailCopy } from './copy';
