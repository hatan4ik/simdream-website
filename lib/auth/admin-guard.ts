import { NextResponse } from 'next/server';
import { hasUsableValue, isProduction } from '@/lib/config/server-env';
import { constantTimeEqual } from '@/lib/security/constant-time';
import { clientAddressIsConfigured, UNKNOWN_CLIENT } from '@/lib/security/client-address';
import {
  consumeRateLimit,
  peekRateLimit,
  rateLimitClientAddress,
  rateLimitHeaders,
  RateLimitUnavailableError,
} from '@/lib/security/rate-limit';
import { isReceivingOrigin } from '@/lib/security/same-origin';

/**
 * Interim server-side admin guard: HTTP Basic auth against the ADMIN_USER /
 * ADMIN_PASSWORD environment variables. Fails closed (503) when they are not
 * configured. To be replaced by Supabase Auth + server-side role checks (RBAC).
 *
 * Runtime-neutral so the same check runs in the Next.js proxy and route handlers.
 */

const ADMIN_REALM = 'Sim Dream Admin';
const LOCKED_OUT_MESSAGE = 'Too many failed admin sign-in attempts. Please try again later.';
const ipRule = (client: string) => ({ scope: 'admin-login-ip', subject: client, limit: 12, windowSeconds: 15 * 60 });

type AdminAuthResult = 'authorized' | 'unauthorized' | 'not_configured';

interface AdminAuthCheck {
  result: AdminAuthResult;
  attemptedUsername: string;
}

function decodeBasicCredentials(header: string): { user: string; password: string } | null {
  if (!header.startsWith('Basic ')) return null;
  try {
    const binary = atob(header.slice('Basic '.length).trim());
    const decoded = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

function checkAdminAuth(request: Request): AdminAuthCheck {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (
    !hasUsableValue(expectedUser) ||
    !hasUsableValue(expectedPassword) ||
    (isProduction && expectedPassword.length < 16)
  ) return { result: 'not_configured', attemptedUsername: '' };

  const credentials = decodeBasicCredentials(request.headers.get('authorization') || '');
  if (!credentials) return { result: 'unauthorized', attemptedUsername: '' };

  // Evaluate both comparisons so timing does not reveal which one failed.
  const userMatches = constantTimeEqual(credentials.user, expectedUser);
  const passwordMatches = constantTimeEqual(credentials.password, expectedPassword);
  return {
    result: userMatches && passwordMatches ? 'authorized' : 'unauthorized',
    // Username is hashed before persistence. Bound it to make a malformed header
    // unable to create an oversized rate-limit subject.
    attemptedUsername: credentials.user.trim().slice(0, 120),
  };
}

/**
 * The receiving origins (request URL, configured public URL, and the Host or X-Forwarded-Host the
 * browser used) are the ones the public forms accept: lib/security/same-origin.ts.
 */
function isSameOriginMutation(request: Request): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  // Non-browser callers (for example an authenticated operations script) do
  // not send Origin. A browser Origin must always match the receiving origin.
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return isReceivingOrigin(request, origin);
}

/**
 * A lockout that a correct password could walk through would bound nothing, so while an address has no
 * failed attempt left it is refused whatever it sends: the answer is the same for a right and a wrong
 * password, and it is decided before the credentials matter. The read spends nothing.
 *
 * It never applies where it could lock the owner out from outside:
 * - only the per-address budget is read, because anyone can spend the per-username one against the owner;
 * - only an address the deployment has said it trusts, because the unconfigured x-forwarded-for default
 *   may be a proxy every visitor shares, and `unknown-client` is one bucket for everyone;
 * - when the state cannot be read, the request continues as it did before this check existed.
 */
async function addressLockout(request: Request): Promise<NextResponse | null> {
  const client = rateLimitClientAddress(request);
  if (client === UNKNOWN_CLIENT || !clientAddressIsConfigured()) return null;
  try {
    const state = await peekRateLimit(ipRule(client));
    if (state.allowed) return null;
    return NextResponse.json({ error: LOCKED_OUT_MESSAGE }, { status: 429, headers: rateLimitHeaders(state) });
  } catch {
    console.error('Admin lockout state unavailable; continuing without it');
    return null;
  }
}

function challenge(): NextResponse {
  return NextResponse.json(
    { error: 'Admin authentication required' },
    { status: 401, headers: { 'WWW-Authenticate': `Basic realm="${ADMIN_REALM}", charset="UTF-8"` } }
  );
}

/**
 * Returns an error response when the request is not from an authenticated admin,
 * or `null` when the caller may proceed.
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const auth = checkAdminAuth(request);
  if (auth.result === 'not_configured') {
    return NextResponse.json(
      { error: 'Admin access is disabled until ADMIN_USER and ADMIN_PASSWORD are configured.' },
      { status: 503 }
    );
  }

  const lockedOut = await addressLockout(request);
  if (lockedOut) return lockedOut;

  if (auth.result === 'authorized') {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Cross-origin admin mutations are not allowed.' }, { status: 403 });
    }
    return null;
  }

  // A request with no Authorization header guesses nothing (a browser's first visit, a link prefetch), so it
  // is challenged without spending an attempt: otherwise prefetches of the footer link would lock the owner out.
  if (!request.headers.has('authorization')) return challenge();

  try {
    const client = rateLimitClientAddress(request);
    const [byClient, byUsername] = await Promise.all([
      consumeRateLimit(ipRule(client)),
      consumeRateLimit({
        scope: 'admin-login-username',
        subject: auth.attemptedUsername || 'missing-username',
        limit: 6,
        windowSeconds: 15 * 60,
      }),
    ]);
    const blocked = !byClient.allowed ? byClient : !byUsername.allowed ? byUsername : null;
    if (blocked) {
      return NextResponse.json(
        { error: LOCKED_OUT_MESSAGE },
        { status: 429, headers: rateLimitHeaders(blocked) }
      );
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) console.error('Admin rate limiter failed', error);
    return NextResponse.json(
      { error: 'Admin authentication is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return challenge();
}
