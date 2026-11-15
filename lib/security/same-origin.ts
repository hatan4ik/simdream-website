import 'server-only';

import { NextResponse } from 'next/server';
import { hasUsableValue } from '@/lib/config/server-env';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Origins this deployment answers on. request.url alone is not enough: next start reports it as
 * localhost even when the browser connected to 127.0.0.1 or a real hostname, so the Host the
 * browser actually used (or the proxy's X-Forwarded-Host) and the configured public URL count too.
 * A cross-site page cannot forge Host or Origin, and setting X-Forwarded-Host would need a CORS
 * preflight that is never granted.
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
  // A bare host[:port] only: userinfo or a path would let URL parsing yield a different origin.
  if (host && /^[A-Za-z0-9.\-[\]:]+$/.test(host) && (protocol === 'http' || protocol === 'https')) {
    try {
      // Browsers serialise Origin canonically (lowercase host, no default port); proxies may not.
      origins.add(new URL(`${protocol}://${host}`).origin);
    } catch {
      // An unparseable host adds no origin.
    }
  }
  return origins;
}

/**
 * True when `origin` (an Origin header value) is one this deployment answers on; false for any
 * other origin and for one that does not parse ("null", "not a url"). Shared with the admin guard.
 */
export function isReceivingOrigin(request: Request, origin: string): boolean {
  try {
    return receivingOrigins(request).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * The 403 to send when a public POST comes from another site, or `null` to carry on. A browser
 * always sends Origin on a cross-site POST; a script without one (curl) is not a CSRF vector.
 */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const denied = () => NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: NO_STORE });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return denied();
  const origin = request.headers.get('origin');
  if (!origin) return null;
  return isReceivingOrigin(request, origin) ? null : denied();
}
