import 'server-only';

import { NextResponse } from 'next/server';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { hasUsableValue } from '@/lib/config/server-env';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
  type RateLimitDecision,
  type RateLimitRule,
} from '@/lib/security/rate-limit';

/**
 * Guards shared by the two refund API routes: same-origin, body size and type, and throttling.
 * Public routes that send email and read the order store need all four.
 */
export const REFUND_MAX_BODY_BYTES = 16 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

/** How to reach the desk when the form cannot take a request (shown in the 503 body). */
export function refundDeskContact() {
  const { email, phoneInternational, whatsappHref } = FACILITY_INFO.contact;
  return { email, phone: phoneInternational, whatsapp: whatsappHref };
}

/**
 * Origins this deployment answers on (the request URL, the configured public URL, and the Host
 * the browser used behind a proxy). A cross-site page cannot forge Host or Origin.
 */
function receivingOrigins(request: Request): Set<string> {
  const requestUrl = new URL(request.url);
  const origins = new Set([requestUrl.origin]);
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (hasUsableValue(configured)) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // A malformed configured URL adds no origin.
    }
  }
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host'))?.split(',')[0].trim();
  const protocol = (request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || requestUrl.protocol.replace(':', '')).toLowerCase();
  if (host && /^[A-Za-z0-9.\-[\]:]+$/.test(host) && (protocol === 'http' || protocol === 'https')) {
    try {
      origins.add(new URL(`${protocol}://${host}`).origin);
    } catch {
      // An unparseable host adds no origin.
    }
  }
  return origins;
}

/** A browser always sends Origin on a cross-site POST; a script without one (curl) is not a CSRF vector. */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const denied = () => NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: NO_STORE });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return denied();
  const origin = request.headers.get('origin');
  if (!origin) return null;
  try {
    return receivingOrigins(request).has(new URL(origin).origin) ? null : denied();
  } catch {
    return denied();
  }
}

/** Reads a small JSON body, or returns the error response to send. */
export async function readRefundJson(request: Request): Promise<{ body: unknown } | { error: NextResponse }> {
  const fail = (error: string, status: number) => ({ error: NextResponse.json({ error }, { status, headers: NO_STORE }) });
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return fail('Send the request as application/json.', 415);
  }
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > REFUND_MAX_BODY_BYTES) return fail('Request body is too large.', 413);
  const text = await request.text();
  if (text.length > REFUND_MAX_BODY_BYTES) return fail('Request body is too large.', 413);
  try {
    return { body: JSON.parse(text) as unknown };
  } catch {
    return fail('Invalid JSON request body.', 400);
  }
}

// Best-effort limiter used ONLY while the durable one is unavailable (a Wix worker without
// Supabase). It lives in one process, so another instance has its own counters: it slows a script
// down, it does not stop a determined one. Keys are hashed; nothing personal is kept.
const fallbackBuckets = new Map<string, { count: number; expiresAt: number }>();
const FALLBACK_MAX_ENTRIES = 5_000;

async function fallbackKey(rule: RateLimitRule): Promise<string> {
  const bytes = new TextEncoder().encode(`${rule.scope}\u0000${rule.subject}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function consumeFallback(rule: RateLimitRule, now = Date.now()): Promise<RateLimitDecision> {
  if (fallbackBuckets.size > FALLBACK_MAX_ENTRIES) {
    for (const [key, bucket] of fallbackBuckets) if (bucket.expiresAt <= now) fallbackBuckets.delete(key);
    if (fallbackBuckets.size > FALLBACK_MAX_ENTRIES) fallbackBuckets.clear();
  }
  const key = await fallbackKey(rule);
  const windowMs = rule.windowSeconds * 1_000;
  const existing = fallbackBuckets.get(key);
  const bucket = existing && existing.expiresAt > now ? existing : { count: 0, expiresAt: now + windowMs };
  bucket.count += 1;
  fallbackBuckets.set(key, bucket);
  return { allowed: bucket.count <= rule.limit, retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1_000)) };
}

/** Consumes every rule; the first one over its limit answers 429 with Retry-After. */
export async function throttleRefundRequest(request: Request, rules: RateLimitRule[]): Promise<NextResponse | null> {
  for (const rule of rules) {
    let decision: RateLimitDecision;
    try {
      decision = await consumeRateLimit(rule);
    } catch (error) {
      if (!(error instanceof RateLimitUnavailableError)) throw error;
      decision = await consumeFallback(rule);
    }
    if (!decision.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429, headers: rateLimitHeaders(decision) });
    }
  }
  return null;
}

/** The client address as the limiter sees it. */
export const refundClientAddress = rateLimitClientAddress;
