import 'server-only';

import { NextResponse } from 'next/server';
import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import {
  consumeRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
  type RateLimitDecision,
  type RateLimitRule,
} from '@/lib/security/rate-limit';
import { createFixedWindowLimiter } from './birthday-claim-fallback-limiter';

/**
 * Bounds how fast `POST /api/wix/birthday/claim` issues birthday pricing claims: per client address
 * and per normalized email, counted on every valid request before a claim is issued.
 *
 * Exception to the fail-closed rule, on purpose: the route runs on the Wix-hosted Worker, which has
 * no durable limiter store, so when the store is unavailable the route counts in a bounded
 * in-process map instead of answering 503, and the discount keeps working there. That fallback
 * cannot trust the client address yet (SECURITY.md, "Client address for rate limiting"): the address
 * may be spoofable, or every visitor may share one. Its address rule is therefore loose, so one
 * shared bucket cannot deny the discount site-wide, and the per-email rule carries the bound.
 */

const THROTTLED_MESSAGE = 'Too many birthday pricing requests. Please wait and try again.';
const UNAVAILABLE_MESSAGE = 'Birthday pricing is temporarily unavailable.';

const TEN_MINUTES = 10 * 60;
const ONE_HOUR = 60 * 60;

/** rateLimitClientAddress() answers this when no usable forwarding header is present. */
const UNKNOWN_CLIENT = 'unknown-client';
const LIMIT_PER_ADDRESS = 10;
/**
 * Every request without an address shares one bucket, so it gets a looser limit: one such visitor does not shut out the
 * others at once. The bucket can still be exhausted (SECURITY.md, "Client address for rate limiting").
 */
const LIMIT_PER_UNKNOWN_CLIENT = 60;
const FALLBACK_LIMIT_PER_ADDRESS = 60;
const LIMIT_PER_EMAIL = 5;

const ADDRESS_SCOPE = 'birthday-claim-ip';
const IDENTITY_SCOPE = 'birthday-claim-identity';

/** At most this many subjects are counted in-process; a full map drops closed windows, then the oldest. */
const FALLBACK_MAX_BUCKETS = 5_000;
const fallbackLimiter = createFixedWindowLimiter({ maxBuckets: FALLBACK_MAX_BUCKETS });

export function birthdayClaimThrottleRules(request: Request, email: string): RateLimitRule[] {
  const client = rateLimitClientAddress(request);
  return [
    {
      scope: ADDRESS_SCOPE,
      subject: client,
      limit: client === UNKNOWN_CLIENT ? LIMIT_PER_UNKNOWN_CLIENT : LIMIT_PER_ADDRESS,
      windowSeconds: TEN_MINUTES,
    },
    // Trimmed and lower-cased, as the claim's identity key and the checkout throttle use it.
    { scope: IDENTITY_SCOPE, subject: normalizeMemberEmail(email), limit: LIMIT_PER_EMAIL, windowSeconds: ONE_HOUR },
  ];
}

function fallbackRule(rule: RateLimitRule): RateLimitRule {
  return rule.scope === ADDRESS_SCOPE ? { ...rule, limit: FALLBACK_LIMIT_PER_ADDRESS } : rule;
}

/**
 * Counts one claim request against every rule. Returns the refusal to send (429 with the longest
 * wait among the refused rules, or 503 when the limiter fails in an unexpected way), or null to issue.
 */
export async function throttleBirthdayClaim(request: Request, email: string): Promise<NextResponse | null> {
  const rules = birthdayClaimThrottleRules(request, email);
  let decisions: RateLimitDecision[];
  try {
    decisions = await Promise.all(rules.map((rule) => consumeRateLimit(rule)));
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) {
      console.error('Birthday claim rate limiter failed', error);
      return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    decisions = await Promise.all(rules.map((rule) => fallbackLimiter.consume(fallbackRule(rule))));
  }

  const refused = decisions.filter((decision) => !decision.allowed);
  if (refused.length === 0) return null;
  const retryAfterSeconds = Math.max(...refused.map((decision) => decision.retryAfterSeconds));
  return NextResponse.json({ error: THROTTLED_MESSAGE }, { status: 429, headers: rateLimitHeaders({ allowed: false, retryAfterSeconds }) });
}

/** Test seam. Runtime code never clears the fallback counts. */
export function resetBirthdayClaimFallbackForTests(): void {
  fallbackLimiter.clear();
}
