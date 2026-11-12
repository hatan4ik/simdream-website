import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { PersistenceError } from '@/lib/db/store';
import { validationError } from '@/lib/validation';
import {
  listRefundRequests,
  readRefundJson,
  refundClientAddress,
  refundDeskContact,
  refundSubmissionSchema,
  rejectCrossOrigin,
  RefundUnavailableError,
  submitRefundRequest,
  throttleRefundRequest,
} from '@/lib/refund/server';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Public: a customer asks for a refund. Always answers with the outcome of what actually
 * happened: 201 only when the request was stored or emailed to the team, 503 (with the desk
 * contact) when neither was possible. See lib/refund/refund-service.ts.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const read = await readRefundJson(request);
  if ('error' in read) return read.error;

  const parsed = refundSubmissionSchema.safeParse(read.body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400, headers: NO_STORE });

  const limited = await throttleRefundRequest(request, [
    { scope: 'refund-submit-ip', subject: refundClientAddress(request), limit: 8, windowSeconds: 60 * 60 },
    { scope: 'refund-submit-email', subject: parsed.data.email.toLowerCase(), limit: 4, windowSeconds: 60 * 60 },
  ]);
  if (limited) return limited;

  try {
    const receipt = await submitRefundRequest(parsed.data);
    return NextResponse.json(receipt, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (!(error instanceof RefundUnavailableError)) {
      console.error('Refund request failed', error instanceof Error ? error.name : 'unknown');
    }
    return NextResponse.json(
      { error: 'Refund requests are temporarily unavailable. Nothing was sent.', contact: refundDeskContact() },
      { status: 503, headers: NO_STORE }
    );
  }
}

/** Admin only: the newest requests, for the team to work through. Holds personal data: never cached. */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await listRefundRequests(100), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof PersistenceError) {
      return NextResponse.json({ error: 'Refund requests are not stored in this environment.' }, { status: 503, headers: NO_STORE });
    }
    console.error('Refund request listing failed', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Refund requests are temporarily unavailable.' }, { status: 503, headers: NO_STORE });
  }
}
