import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { readJsonBody } from '@/lib/http/read-json-body';
import { isHoneypotFilled } from '@/lib/security/honeypot';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from '@/lib/security/rate-limit';
import { rejectCrossOrigin } from '@/lib/security/same-origin';
import { adminWorkshopPatchSchema, validationError, workshopInquirySchema } from '@/lib/validation';

/** A real inquiry is a few hundred bytes; anything past this is not a form submission. */
const WORKSHOP_MAX_BODY_BYTES = 8 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

function inquiryAccepted(id: string, status: string) {
  return NextResponse.json({ id, status }, { status: 201, headers: NO_STORE });
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await store.getCorporateInquiries(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Corporate inquiry lookup failed', error);
    return NextResponse.json({ error: 'Corporate inquiries are temporarily unavailable.' }, { status: 503 });
  }
}

/**
 * Public corporate lead form. Guards, in order: a capped body, same-origin, the honeypot, the
 * schema, then the per-client allowance, so malformed or hostile requests cost the store nothing
 * and a person's typo never spends their allowance.
 */
export async function POST(request: Request) {
  const read = await readJsonBody(request, { maxBytes: WORKSHOP_MAX_BODY_BYTES });
  if (!read.ok) return read.response;

  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  // A script that filled the hidden field gets the answer a real lead gets, so it learns nothing.
  if (isHoneypotFilled(read.body)) return inquiryAccepted(crypto.randomUUID(), 'new');

  const parsed = workshopInquirySchema.safeParse(read.body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400, headers: NO_STORE });

  try {
    const decision = await consumeRateLimit({
      scope: 'workshop-inquiry-ip',
      subject: rateLimitClientAddress(request),
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many inquiries. Please wait and try again later.' },
        { status: 429, headers: rateLimitHeaders(decision) }
      );
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Workshop inquiry rate limiter failed.');
    return NextResponse.json({ error: 'Inquiries are temporarily unavailable. Please try again later.' }, { status: 503, headers: NO_STORE });
  }

  try {
    const inquiry = await store.createCorporateInquiry(parsed.data);
    return inquiryAccepted(inquiry.id, inquiry.status);
  } catch (error) {
    console.error('Corporate inquiry creation failed', error);
    return NextResponse.json({ error: 'Unable to submit your inquiry right now.' }, { status: 503 });
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
  const parsed = adminWorkshopPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const updated = await store.updateInquiryStatus(parsed.data.id, parsed.data.status);
    if (!updated) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Corporate inquiry update failed', error);
    return NextResponse.json({ error: 'Unable to update inquiry.' }, { status: 503 });
  }
}
