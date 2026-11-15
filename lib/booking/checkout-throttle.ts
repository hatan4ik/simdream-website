import 'server-only';

import { NextResponse } from 'next/server';
import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
  type RateLimitRule,
} from '@/lib/security/rate-limit';

/**
 * Throttles checkout initialization before any record is created, so a bot cannot hold every open
 * departure with unpaid reservations. Every rule is consumed on every attempt, a resumed checkout
 * included. Production counts in the database (migration 005) and fails closed when it is unreachable.
 */

const CHECKOUT_THROTTLED_MESSAGE = 'Too many checkout attempts. Please wait and try again.';
const CHECKOUT_UNAVAILABLE_MESSAGE = 'Unable to start checkout. Please try again.';

const TEN_MINUTES = 10 * 60;
const THIRTY_MINUTES = 30 * 60;

/** rateLimitClientAddress() answers this when no usable forwarding header is present. */
const UNKNOWN_CLIENT = 'unknown-client';
const LIMIT_PER_ADDRESS = 10;
/**
 * Every request without an address shares one bucket, so it gets a looser limit: one such visitor does not shut out the
 * others at once. The bucket can still be exhausted (SECURITY.md, "Client address for rate limiting").
 */
const LIMIT_PER_UNKNOWN_CLIENT = 60;
const LIMIT_PER_EMAIL = 6;
const LIMIT_PER_DEPARTURE = 8;

/** The parts of a validated checkout request the throttle reads. */
export type CheckoutThrottleSubject =
  | { kind: 'booking'; pilotEmail: string; bookingDate: string; startTime: string }
  | { kind: 'voucher'; senderEmail: string };

export function checkoutThrottleRules(request: Request, checkout: CheckoutThrottleSubject): RateLimitRule[] {
  const client = rateLimitClientAddress(request);
  const rules: RateLimitRule[] = [
    {
      scope: 'checkout-init-ip',
      subject: client,
      limit: client === UNKNOWN_CLIENT ? LIMIT_PER_UNKNOWN_CLIENT : LIMIT_PER_ADDRESS,
      windowSeconds: TEN_MINUTES,
    },
    {
      scope: 'checkout-init-email',
      // Trimmed and lower-cased, as bookings store it.
      subject: normalizeMemberEmail(checkout.kind === 'booking' ? checkout.pilotEmail : checkout.senderEmail),
      limit: LIMIT_PER_EMAIL,
      windowSeconds: THIRTY_MINUTES,
    },
  ];
  if (checkout.kind === 'booking') {
    rules.push({
      scope: 'checkout-init-slot',
      subject: `${checkout.bookingDate}T${checkout.startTime}`,
      limit: LIMIT_PER_DEPARTURE,
      windowSeconds: THIRTY_MINUTES,
    });
  }
  return rules;
}

/**
 * Counts one checkout attempt against every rule. Returns the refusal to send (429 with the longest
 * wait among the refused rules, or 503 when the limiter is unavailable), or null to proceed.
 */
export async function throttleCheckout(request: Request, checkout: CheckoutThrottleSubject): Promise<NextResponse | null> {
  let decisions;
  try {
    decisions = await Promise.all(checkoutThrottleRules(request, checkout).map((rule) => consumeRateLimit(rule)));
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Checkout rate limiter failed', error);
    return NextResponse.json(
      { error: CHECKOUT_UNAVAILABLE_MESSAGE },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const refused = decisions.filter((decision) => !decision.allowed);
  if (refused.length === 0) return null;
  const retryAfterSeconds = Math.max(...refused.map((decision) => decision.retryAfterSeconds));
  return NextResponse.json(
    { error: CHECKOUT_THROTTLED_MESSAGE },
    { status: 429, headers: rateLimitHeaders({ allowed: false, retryAfterSeconds }) }
  );
}
