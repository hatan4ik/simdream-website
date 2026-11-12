import 'server-only';

import { isProduction } from '@/lib/config/server-env';
import { PersistenceError } from '@/lib/db/store';
import { getSupabaseAdmin, requireSupabaseAdmin } from '@/lib/db/supabase-admin';
import type { RefundEvaluation, RefundPriority, RefundProductKind, RefundReason } from './refund-types';

/**
 * Persistence for refund requests (migration 010). The same rules as the order store
 * (AGENTS.md section 6): Supabase in production, process memory in development and tests, and
 * production without Supabase has NO storage unless ALLOW_IN_MEMORY_STORE=true opts a demo or test
 * server in. Without storage the service falls back to the email channel or fails closed (503).
 * Nothing here logs a request body: a failure logs only the database error code.
 */
const TABLE = 'refund_requests';

export type RefundStorageMode = 'supabase' | 'memory' | 'none';
export type RefundStatus = 'new' | 'in_review' | 'resolved' | 'declined';
export type RefundVerification = 'verified' | 'unverified';

export interface NewRefundRecord {
  reference: string;
  clientRequestId: string;
  productKind: RefundProductKind;
  reason: RefundReason;
  /** The reference exactly as the customer typed it. */
  orderReference: string;
  contactName: string;
  email: string;
  phone: string;
  sessionDate: string | null;
  sessionTime: string | null;
  verification: RefundVerification;
  /** Id of the matched booking or voucher when verified; null otherwise. */
  verifiedOrderId: string | null;
  orderDate: string | null;
  packageTitle: string | null;
  message: string | null;
  language: string;
  priority: RefundPriority;
  evaluation: RefundEvaluation;
}

export interface StoredRefundRequest extends NewRefundRecord {
  id: string;
  status: RefundStatus;
  submittedAt: string;
  staffNotifiedAt: string | null;
  customerAcknowledgedAt: string | null;
}

/** The generated reference is already taken: the caller draws a new one. */
export class RefundReferenceConflictError extends Error {
  constructor() {
    super('Refund reference already exists.');
    this.name = 'RefundReferenceConflictError';
  }
}

type MemoryGlobal = typeof globalThis & { __simDreamRefundRequestsV1?: StoredRefundRequest[] };
const memoryGlobal = globalThis as MemoryGlobal;
const memory = (): StoredRefundRequest[] => (memoryGlobal.__simDreamRefundRequestsV1 ??= []);

export function refundStorageMode(): RefundStorageMode {
  if (!isProduction) return 'memory';
  if (getSupabaseAdmin()) return 'supabase';
  return process.env.ALLOW_IN_MEMORY_STORE === 'true' ? 'memory' : 'none';
}

interface Row {
  id: string;
  reference: string;
  client_request_id: string;
  status: RefundStatus;
  product_kind: RefundProductKind;
  reason: RefundReason;
  order_reference: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  session_date: string | null;
  session_time: string | null;
  verification: RefundVerification;
  verified_order_id: string | null;
  order_date: string | null;
  package_title: string | null;
  message: string | null;
  language: string;
  priority: RefundPriority;
  evaluation: RefundEvaluation;
  submitted_at: string;
  staff_notified_at: string | null;
  customer_acknowledged_at: string | null;
}

function toRow(record: NewRefundRecord) {
  return {
    reference: record.reference,
    client_request_id: record.clientRequestId,
    product_kind: record.productKind,
    reason: record.reason,
    order_reference: record.orderReference,
    contact_name: record.contactName,
    contact_email: record.email,
    contact_phone: record.phone,
    session_date: record.sessionDate,
    session_time: record.sessionTime,
    verification: record.verification,
    verified_order_id: record.verifiedOrderId,
    order_date: record.orderDate,
    package_title: record.packageTitle,
    message: record.message,
    language: record.language,
    priority: record.priority,
    evaluation: record.evaluation,
  };
}

function fromRow(row: Row): StoredRefundRequest {
  return {
    id: row.id,
    reference: row.reference,
    clientRequestId: row.client_request_id,
    status: row.status,
    productKind: row.product_kind,
    reason: row.reason,
    orderReference: row.order_reference,
    contactName: row.contact_name,
    email: row.contact_email,
    phone: row.contact_phone,
    sessionDate: row.session_date,
    sessionTime: row.session_time ? row.session_time.slice(0, 5) : null,
    verification: row.verification,
    verifiedOrderId: row.verified_order_id,
    orderDate: row.order_date,
    packageTitle: row.package_title,
    message: row.message,
    language: row.language,
    priority: row.priority,
    evaluation: row.evaluation,
    submittedAt: new Date(row.submitted_at).toISOString(),
    staffNotifiedAt: row.staff_notified_at,
    customerAcknowledgedAt: row.customer_acknowledged_at,
  };
}

function failure(error: { code?: string }): never {
  // Only the code: a database message can quote the row that failed, which holds personal data.
  console.error('Refund request storage failed', error.code ?? 'unknown');
  throw new PersistenceError('Persistent storage operation failed.');
}

const UNIQUE_VIOLATION = '23505';

async function findByClientRequestId(clientRequestId: string): Promise<StoredRefundRequest | undefined> {
  const { data, error } = await requireSupabaseAdmin().from(TABLE).select('*').eq('client_request_id', clientRequestId).maybeSingle();
  if (error) failure(error);
  return data ? fromRow(data as Row) : undefined;
}

/**
 * Stores a new request. Idempotent on `clientRequestId`: a retry or double click returns the
 * stored request with `created: false` instead of a second record. Throws
 * `RefundReferenceConflictError` when only the reference clashed.
 */
export async function saveRefundRequest(record: NewRefundRecord): Promise<{ stored: StoredRefundRequest; created: boolean }> {
  const mode = refundStorageMode();
  if (mode === 'none') throw new PersistenceError('Persistent storage is not configured.');

  if (mode === 'memory') {
    const rows = memory();
    const existing = rows.find((row) => row.clientRequestId === record.clientRequestId);
    if (existing) return { stored: existing, created: false };
    if (rows.some((row) => row.reference === record.reference)) throw new RefundReferenceConflictError();
    const stored: StoredRefundRequest = {
      ...record,
      id: crypto.randomUUID(),
      status: 'new',
      submittedAt: new Date().toISOString(),
      staffNotifiedAt: null,
      customerAcknowledgedAt: null,
    };
    rows.unshift(stored);
    return { stored, created: true };
  }

  const { data, error } = await requireSupabaseAdmin().from(TABLE).insert(toRow(record)).select('*').single();
  if (!error) return { stored: fromRow(data as Row), created: true };
  if (error.code === UNIQUE_VIOLATION) {
    const existing = await findByClientRequestId(record.clientRequestId);
    if (existing) return { stored: existing, created: false };
    throw new RefundReferenceConflictError();
  }
  return failure(error);
}

/** Records when the team and the customer were emailed. Best effort: a failure is logged, not thrown. */
export async function markRefundNotified(
  id: string,
  sent: { staff?: boolean; customer?: boolean }
): Promise<void> {
  const now = new Date().toISOString();
  const mode = refundStorageMode();
  if (mode === 'none') return;
  if (mode === 'memory') {
    const row = memory().find((item) => item.id === id);
    if (row) {
      if (sent.staff) row.staffNotifiedAt = now;
      if (sent.customer) row.customerAcknowledgedAt = now;
    }
    return;
  }
  const patch = {
    ...(sent.staff ? { staff_notified_at: now } : {}),
    ...(sent.customer ? { customer_acknowledged_at: now } : {}),
  };
  if (Object.keys(patch).length === 0) return;
  const { error } = await requireSupabaseAdmin().from(TABLE).update(patch).eq('id', id);
  if (error) console.error('Refund request notification stamp failed', error.code ?? 'unknown');
}

/** Newest first. For the admin listing only. */
export async function listRefundRequests(limit = 100): Promise<StoredRefundRequest[]> {
  const mode = refundStorageMode();
  if (mode === 'none') throw new PersistenceError('Persistent storage is not configured.');
  if (mode === 'memory') return memory().slice(0, limit);
  const { data, error } = await requireSupabaseAdmin()
    .from(TABLE)
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (error) failure(error);
  return (data as Row[]).map(fromRow);
}

/** Test and demo helper: forgets the in-memory requests (a no-op for Supabase). */
export function resetRefundRequestsForTests(): void {
  memoryGlobal.__simDreamRefundRequestsV1 = [];
}
