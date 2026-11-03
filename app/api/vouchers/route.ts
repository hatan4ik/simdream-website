import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { adminVoucherRedemptionSchema, validationError, voucherVerificationSchema } from '@/lib/validation';
import { consumeRateLimit, rateLimitClientAddress, rateLimitHeaders, RateLimitUnavailableError } from '@/lib/security/rate-limit';

function publicVoucherView(voucher: { code: string; currentBalanceIls: number; expiryDate: string }) {
  return { code: voucher.code, currentBalanceIls: voucher.currentBalanceIls, expiryDate: voucher.expiryDate };
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    return NextResponse.json(await store.getVouchers(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Voucher lookup failed', error);
    return NextResponse.json({ error: 'Voucher data is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = voucherVerificationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const client = rateLimitClientAddress(request);
    const [byClient, byCode] = await Promise.all([
      consumeRateLimit({ scope: 'voucher-verify-ip', subject: client, limit: 20, windowSeconds: 15 * 60 }),
      consumeRateLimit({ scope: 'voucher-verify-code', subject: parsed.data.code, limit: 5, windowSeconds: 15 * 60 }),
    ]);
    const blocked = !byClient.allowed ? byClient : !byCode.allowed ? byCode : null;
    if (blocked) {
      return NextResponse.json(
        { error: 'Too many voucher verification attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(blocked) }
      );
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Voucher rate limiter failed', error);
    return NextResponse.json(
      { error: 'Voucher verification is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // A code is an unguessable bearer credential. Never expose PII or payment metadata.
    const voucher = await store.getVoucherByCode(parsed.data.code);
    if (!voucher || voucher.paymentStatus !== 'paid') {
      return NextResponse.json({ error: 'Invalid voucher code.' }, { status: 404 });
    }
    if (new Date(voucher.expiryDate).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This voucher has expired.', expired: true }, { status: 400 });
    }
    if (voucher.currentBalanceIls <= 0 || voucher.isRedeemed) {
      return NextResponse.json({ error: 'This voucher has already been fully redeemed.', redeemed: true }, { status: 400 });
    }
    return NextResponse.json(publicVoucherView(voucher), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Voucher verification failed', error);
    return NextResponse.json({ error: 'Voucher data is temporarily unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = adminVoucherRedemptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const result = await store.redeemVoucher(parsed.data.code, parsed.data.amount);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    // Storage failures stay generic: the raw driver message is for server logs only.
    console.error('Voucher redemption failed', error);
    return NextResponse.json({ error: 'Unable to redeem voucher.' }, { status: 503 });
  }
}
