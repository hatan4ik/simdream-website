import { NextResponse } from 'next/server';
import { sendContactInquiryEmail } from '@/lib/sendgrid';
import { contactInquirySchema, validationError } from '@/lib/validation';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

const CONTACT_MAX_BODY_BYTES = 8 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

async function readContactBody(request: Request): Promise<{ body: unknown } | { response: NextResponse }> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return { response: NextResponse.json({ error: 'Send the request as application/json.' }, { status: 415, headers: NO_STORE }) };
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > CONTACT_MAX_BODY_BYTES) {
    return { response: NextResponse.json({ error: 'Request body is too large.' }, { status: 413, headers: NO_STORE }) };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > CONTACT_MAX_BODY_BYTES) {
    return { response: NextResponse.json({ error: 'Request body is too large.' }, { status: 413, headers: NO_STORE }) };
  }

  try {
    return { body: JSON.parse(raw) as unknown };
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400, headers: NO_STORE }) };
  }
}

/**
 * Sends a public Dispatch inquiry. The response intentionally contains no
 * recipient, transport, or provider details and only succeeds after delivery.
 */
export async function POST(request: Request) {
  const decoded = await readContactBody(request);
  if ('response' in decoded) return decoded.response;

  const parsed = contactInquirySchema.safeParse(decoded.body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400, headers: NO_STORE });

  try {
    const decision = await consumeRateLimit({
      scope: 'contact-inquiry-ip',
      subject: rateLimitClientAddress(request),
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!decision.allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait and try again later.' },
        { status: 429, headers: rateLimitHeaders(decision) }
      );
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Contact inquiry rate limiter failed.');
    return NextResponse.json({ error: 'Messages are temporarily unavailable. Please try again later.' }, { status: 503, headers: NO_STORE });
  }

  const delivery = await sendContactInquiryEmail(parsed.data);
  if (!delivery.success) {
    return NextResponse.json(
      { error: 'Unable to deliver your message right now. Please try again later.' },
      { status: 503, headers: NO_STORE }
    );
  }

  return NextResponse.json({ accepted: true }, { status: 202, headers: NO_STORE });
}
