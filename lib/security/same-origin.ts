import 'server-only';

import { NextResponse } from 'next/server';
import { hasUsableValue } from '@/lib/config/server-env';

const NO_STORE = { 'Cache-Control': 'no-store' };

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

/**
 * The 403 to send when a public POST comes from another site, or `null` to carry on. A browser
 * always sends Origin on a cross-site POST; a script without one (curl) is not a CSRF vector.
 */
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
