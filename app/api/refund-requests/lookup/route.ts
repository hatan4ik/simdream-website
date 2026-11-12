import { NextResponse } from 'next/server';
import { validationError } from '@/lib/validation';
import {
  lookupRefundOrder,
  readRefundJson,
  refundClientAddress,
  refundLookupSchema,
  rejectCrossOrigin,
  throttleRefundRequest,
} from '@/lib/refund/server';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Step 1 of the refund form: does this reference belong to this email? Reference AND email must
 * both match; anything else (no such order, wrong email, a Wix order, storage down) answers the
 * same `{ verified: false }`. A match reveals only the package title, the session date and time
 * and the order date: never an amount, a name, a payment detail or another order.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const read = await readRefundJson(request);
  if ('error' in read) return read.error;

  const parsed = refundLookupSchema.safeParse(read.body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400, headers: NO_STORE });

  const limited = await throttleRefundRequest(request, [
    { scope: 'refund-lookup-ip', subject: refundClientAddress(request), limit: 20, windowSeconds: 15 * 60 },
    { scope: 'refund-lookup-reference', subject: parsed.data.orderReference.toUpperCase(), limit: 10, windowSeconds: 15 * 60 },
  ]);
  if (limited) return limited;

  const check = await lookupRefundOrder(parsed.data);
  if (!check.verified) return NextResponse.json({ verified: false }, { headers: NO_STORE });
  return NextResponse.json(
    {
      verified: true,
      productKind: check.productKind,
      packageTitle: check.packageTitle,
      sessionDate: check.sessionDate,
      sessionTime: check.sessionTime,
      orderDate: check.orderDate,
    },
    { headers: NO_STORE }
  );
}
