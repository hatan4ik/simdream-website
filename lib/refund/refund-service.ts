import 'server-only';

import { PersistenceError } from '@/lib/db/store';
import { evaluateRefundEligibility } from './refund-eligibility';
import { lookupRefundOrder } from './refund-order-lookup';
import {
  isRefundMailConfigured,
  sendRefundAcknowledgement,
  sendRefundStaffNotice,
} from './refund-notify';
import { generateRefundReference } from './refund-reference';
import {
  markRefundNotified,
  refundStorageMode,
  RefundReferenceConflictError,
  saveRefundRequest,
  type NewRefundRecord,
  type StoredRefundRequest,
} from './refund-repository';
import type { RefundSubmission } from './refund-schema';
import type { RefundEvaluation } from './refund-types';

/**
 * Takes one refund request from the validated form to "someone will see it".
 *
 * FAIL CLOSED: a request counts as received only when something durable happened: it was stored
 * (Supabase, or process memory on a development/test server) or it was emailed to the business
 * inbox. With neither channel available, or both failing, `RefundUnavailableError` is thrown and
 * the route answers 503; the customer is never told "received" when nothing was kept.
 *
 * The outcome is computed here from the server clock and, when the order is verified, from the
 * order's own dates, so a customer cannot influence it by editing the form. It only informs:
 * no refund, reschedule or status change is ever made by this code.
 */
export class RefundUnavailableError extends Error {
  constructor() {
    super('Neither storage nor email is available for refund requests.');
    this.name = 'RefundUnavailableError';
  }
}

export interface RefundReceipt {
  reference: string;
  receivedAt: string;
  /** True when this request was already stored (a retry or double click); nothing was sent again. */
  duplicate: boolean;
  evaluation: Pick<RefundEvaluation, 'outcome' | 'clauses' | 'alsoPossible'> & { urgent: boolean };
  /** Whether the customer got an email copy. */
  acknowledged: boolean;
}

const MAX_REFERENCE_ATTEMPTS = 5;

function toReceipt(stored: StoredRefundRequest, extras: { duplicate: boolean; acknowledged: boolean }): RefundReceipt {
  const { evaluation } = stored;
  return {
    reference: stored.reference,
    receivedAt: stored.submittedAt,
    duplicate: extras.duplicate,
    evaluation: {
      outcome: evaluation.outcome,
      clauses: evaluation.clauses,
      alsoPossible: evaluation.alsoPossible,
      urgent: evaluation.staff.priority === 'urgent',
    },
    acknowledged: extras.acknowledged,
  };
}

async function buildRecord(submission: RefundSubmission, now: Date): Promise<NewRefundRecord> {
  const check = await lookupRefundOrder({
    productKind: submission.productKind,
    orderReference: submission.orderReference,
    email: submission.email,
  });

  // A verified order is the authority on what was bought and when the session is.
  const productKind = check.verified ? check.productKind : submission.productKind;
  const sessionDate = check.verified ? check.sessionDate : (submission.sessionDate ?? null);
  const sessionTime = check.verified ? check.sessionTime : (submission.sessionTime ?? null);
  const evaluation = evaluateRefundEligibility({
    productKind,
    reason: submission.reason,
    orderDate: check.verified ? check.orderDate : null,
    sessionDateTime: sessionDate ? (sessionTime ? `${sessionDate}T${sessionTime}` : sessionDate) : null,
    requestedAt: now,
  });
  if (!check.verified && !evaluation.staff.flags.includes('order_not_verified')) evaluation.staff.flags.push('order_not_verified');

  return {
    reference: generateRefundReference(),
    clientRequestId: submission.clientRequestId,
    productKind,
    reason: submission.reason,
    orderReference: submission.orderReference,
    contactName: submission.contactName,
    email: submission.email.toLowerCase(),
    phone: submission.phone,
    sessionDate,
    sessionTime,
    verification: check.verified ? 'verified' : 'unverified',
    verifiedOrderId: check.verified ? check.orderId : null,
    orderDate: check.verified ? check.orderDate : null,
    packageTitle: check.verified ? check.packageTitle : null,
    message: submission.message ?? null,
    language: submission.language,
    priority: evaluation.staff.priority,
    evaluation,
  };
}

/** Stores the record, drawing a new reference on the rare clash. Returns null when nothing could be stored. */
async function persist(record: NewRefundRecord): Promise<{ stored: StoredRefundRequest; created: boolean } | null> {
  if (refundStorageMode() === 'none') return null;
  let candidate = record;
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      return await saveRefundRequest(candidate);
    } catch (error) {
      if (error instanceof RefundReferenceConflictError) {
        candidate = { ...candidate, reference: generateRefundReference() };
        continue;
      }
      if (error instanceof PersistenceError) return null;
      throw error;
    }
  }
  return null;
}

export async function submitRefundRequest(submission: RefundSubmission, now = new Date()): Promise<RefundReceipt> {
  const mailAvailable = isRefundMailConfigured();
  if (refundStorageMode() === 'none' && !mailAvailable) throw new RefundUnavailableError();

  const record = await buildRecord(submission, now);
  const persisted = await persist(record);

  if (persisted && !persisted.created) return toReceipt(persisted.stored, { duplicate: true, acknowledged: false });

  // Without storage the email IS the record, so build the stored shape from what was just computed.
  const stored: StoredRefundRequest =
    persisted?.stored ?? {
      ...record,
      id: record.reference,
      status: 'new',
      submittedAt: now.toISOString(),
      staffNotifiedAt: null,
      customerAcknowledgedAt: null,
    };

  const staffNotified = mailAvailable ? await sendRefundStaffNotice(stored) : false;
  if (!persisted && !staffNotified) throw new RefundUnavailableError();

  const acknowledged = mailAvailable ? await sendRefundAcknowledgement(stored) : false;
  if (persisted) await markRefundNotified(stored.id, { staff: staffNotified, customer: acknowledged });

  return toReceipt(stored, { duplicate: false, acknowledged });
}
