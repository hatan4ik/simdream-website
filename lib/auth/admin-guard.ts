import { NextResponse } from 'next/server';
import { hasUsableValue, isProduction } from '@/lib/config/server-env';

/**
 * Interim server-side admin guard: HTTP Basic auth against the ADMIN_USER /
 * ADMIN_PASSWORD environment variables. Fails closed (503) when they are not
 * configured. To be replaced by Supabase Auth + server-side role checks (RBAC).
 *
 * Runtime-neutral so the same check runs in the Next.js proxy and route handlers.
 */

const ADMIN_REALM = 'Sim Dream Admin';

type AdminAuthResult = 'authorized' | 'unauthorized' | 'not_configured';

function constantTimeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
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

function checkAdminAuth(request: Request): AdminAuthResult {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (
    !hasUsableValue(expectedUser) ||
    !hasUsableValue(expectedPassword) ||
    (isProduction && expectedPassword.length < 16)
  ) return 'not_configured';

  const credentials = decodeBasicCredentials(request.headers.get('authorization') || '');
  if (!credentials) return 'unauthorized';

  // Evaluate both comparisons so timing does not reveal which one failed.
  const userMatches = constantTimeEqual(credentials.user, expectedUser);
  const passwordMatches = constantTimeEqual(credentials.password, expectedPassword);
  return userMatches && passwordMatches ? 'authorized' : 'unauthorized';
}

function isSameOriginMutation(request: Request): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  // Non-browser callers (for example an authenticated operations script) do
  // not send Origin. A browser Origin must always match the receiving origin.
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/**
 * Returns an error response when the request is not from an authenticated admin,
 * or `null` when the caller may proceed.
 */
export function requireAdmin(request: Request): NextResponse | null {
  const result = checkAdminAuth(request);
  if (result === 'authorized') {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Cross-origin admin mutations are not allowed.' }, { status: 403 });
    }
    return null;
  }

  if (result === 'not_configured') {
    return NextResponse.json(
      { error: 'Admin access is disabled until ADMIN_USER and ADMIN_PASSWORD are configured.' },
      { status: 503 }
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
