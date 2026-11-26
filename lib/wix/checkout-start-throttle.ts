import 'server-only';

import { NextResponse } from 'next/server';
import { UNKNOWN_CLIENT } from '@/lib/security/client-address';
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
 * Bounds how fast one client can start a Wix checkout. Both starts are unauthenticated and each fans out
 * to Wix: `POST /api/wix/bookings/checkout` reads live availability, and `/api/subscriptions/checkout`
 * resolves a plan and creates a redirect session. Neither request carries an email, so the client address
 * is the only subject.
 *
 * Same exception to the fail-closed rule as the birthday claim (`birthday-claim-throttle.ts`), for the same
 * reason: these routes run on the Wix-hosted Worker, which has no durable limiter store, so when the store
 * is unavailable they count in a bounded in-process map and keep working. The address cannot be trusted
 * there (it may be spoofable, or every visitor may share one), so the fallback uses the loose shared limit
 * for every subject: it bounds a burst against one instance without shutting visitors out of checkout.
 */

const THROTTLED_MESSAGE = 'Too many checkout attempts. Please wait and try again.';
const TEN_MINUTES = 10 * 60;

/** `perAddress` for a resolved client address; `shared` for `unknown-client` and for the in-process fallback. */
const LIMITS = {
  // A visitor re-resolves the departure whenever the slot or the add-ons change, so this one is roomy.
  'wix-booking-checkout-ip': { perAddress: 30, shared: 240 },
  'subscription-checkout-ip': { perAddress: 10, shared: 60 },
} as const;

export type WixCheckoutStartScope = keyof typeof LIMITS;

/** At most this many subjects are counted in-process; a full map drops closed windows, then the oldest. */
const FALLBACK_MAX_BUCKETS = 5_000;
const fallbackLimiter = createFixedWindowLimiter({ maxBuckets: FALLBACK_MAX_BUCKETS });

export function wixCheckoutStartRule(request: Request, scope: WixCheckoutStartScope): RateLimitRule {
  const client = rateLimitClientAddress(request);
  const limit = client === UNKNOWN_CLIENT ? LIMITS[scope].shared : LIMITS[scope].perAddress;
  return { scope, subject: client, limit, windowSeconds: TEN_MINUTES };
}

/** Counts one checkout start. Never throws: without a durable store it counts in process instead. */
export async function throttleWixCheckoutStart(request: Request, scope: WixCheckoutStartScope): Promise<RateLimitDecision> {
  const rule = wixCheckoutStartRule(request, scope);
  try {
    return await consumeRateLimit(rule);
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Wix checkout rate limiter failed', error);
    return fallbackLimiter.consume({ ...rule, limit: LIMITS[scope].shared });
  }
}

/** The 429 a refused checkout start gets. */
export function wixCheckoutThrottledResponse(decision: RateLimitDecision): NextResponse {
  return NextResponse.json({ error: THROTTLED_MESSAGE }, { status: 429, headers: rateLimitHeaders(decision) });
}

/** Test seam. Runtime code never clears the fallback counts. */
export function resetWixCheckoutStartFallbackForTests(): void {
  fallbackLimiter.clear();
}
