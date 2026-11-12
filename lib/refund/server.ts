import 'server-only';

/**
 * Server entry of the refund module: storage, order lookup, email, the service and the request
 * guards, plus the zod request schemas. Pure, client-safe code (policy, fields, copy) is
 * exported from `./index`.
 */
export { lookupRefundOrder, type RefundOrderCheck } from './refund-order-lookup';
export { isRefundMailConfigured, refundInbox } from './refund-notify';
export {
  listRefundRequests,
  markRefundNotified,
  refundStorageMode,
  resetRefundRequestsForTests,
  saveRefundRequest,
  type RefundStatus,
  type RefundStorageMode,
  type StoredRefundRequest,
} from './refund-repository';
export {
  readRefundJson,
  refundClientAddress,
  refundDeskContact,
  rejectCrossOrigin,
  throttleRefundRequest,
} from './refund-request-guard';
export { RefundUnavailableError, submitRefundRequest, type RefundReceipt } from './refund-service';
export {
  refundLookupSchema,
  refundSubmissionSchema,
  type RefundLookupRequest,
  type RefundSubmission,
} from './refund-schema';
