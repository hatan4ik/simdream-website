import { NextResponse } from 'next/server';
import { hasUsableValue, isProduction } from '@/lib/config/server-env';
import { constantTimeEqual } from '@/lib/security/constant-time';
import {
  consumeRateLimit,
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
 * Returns an error response when the request is not from an authenticated admin,
 * or `null` when the caller may proceed.
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const auth = checkAdminAuth(request);
  if (auth.result === 'authorized') {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Cross-origin admin mutations are not allowed.' }, { status: 403 });
    }
    return null;
  }

  if (auth.result === 'not_configured') {
    return NextResponse.json(
      { error: 'Admin access is disabled until ADMIN_USER and ADMIN_PASSWORD are configured.' },
      { status: 503 }
    );
  }

  try {
    const client = rateLimitClientAddress(request);
    const [byClient, byUsername] = await Promise.all([
      consumeRateLimit({ scope: 'admin-login-ip', subject: client, limit: 12, windowSeconds: 15 * 60 }),
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
        { error: 'Too many failed admin sign-in attempts. Please try again later.' },
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

  return NextResponse.json(
    { error: 'Admin authentication required' },
    {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${ADMIN_REALM}", charset="UTF-8"` },
    }
  );
}
