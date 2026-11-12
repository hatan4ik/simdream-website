import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import {
  adminGroundSchoolInquiryPatchSchema,
  groundSchoolInquirySchema,
  validationError,
} from '@/lib/validation';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from '@/lib/security/rate-limit';

/** Private dispatch view; public callers can only submit a new request. */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    return NextResponse.json(await store.getGroundSchoolInquiries(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Ground School inquiry lookup failed', error);
    return NextResponse.json({ error: 'Ground School inquiries are temporarily unavailable.' }, { status: 503 });
  }
}

/**
 * This accepts a request for cohort details, never payment or a claimed seat.
 * It is separately throttled because it contains contact information.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = groundSchoolInquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const decision = await consumeRateLimit({
      scope: 'ground-school-inquiry-ip',
      subject: rateLimitClientAddress(request),
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many enrollment requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(decision) }
      );
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Ground School rate limiter failed', error);
    return NextResponse.json(
      { error: 'Ground School enrollment requests are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { consent: _consent, ...inquiryData } = parsed.data;
    const inquiry = await store.createGroundSchoolInquiry(inquiryData);
    return NextResponse.json({ id: inquiry.id, status: inquiry.status }, { status: 201 });
  } catch (error) {
    console.error('Ground School inquiry creation failed', error);
    return NextResponse.json({ error: 'Unable to send your enrollment request right now.' }, { status: 503 });
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

  const parsed = adminGroundSchoolInquiryPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const inquiry = await store.updateGroundSchoolInquiryStatus(parsed.data.id, parsed.data.status);
    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    return NextResponse.json(inquiry);
  } catch (error) {
    console.error('Ground School inquiry update failed', error);
    return NextResponse.json({ error: 'Unable to update inquiry.' }, { status: 503 });
  }
}
