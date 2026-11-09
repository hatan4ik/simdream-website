import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';

function createContentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // React and the existing utility-first UI render style attributes. Unlike script-src,
    // style-src 'unsafe-inline' does not permit JavaScript execution in modern browsers.
    "style-src 'self' 'unsafe-inline'",
    // Google Maps author photos on reviews (Places policy asks for the avatar).
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    // The browser-side Wix Headless client mints its anonymous visitor token
    // and calls Bookings/Cart V2 at this API origin. Keep this explicit instead
    // of allowing a broad third-party wildcard: guest checkout, native coupons
    // and Wix member ownership all need the same visitor session.
    `connect-src 'self'${development ? ' ws: wss:' : ''} https://*.supabase.co wss://*.supabase.co https://www.wixapis.com`,
    'frame-src https://www.google.com https://maps.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
  ].join('; ');
}

function applyContentSecurityPolicy(request: NextRequest, response: NextResponse, nonce: string): NextResponse {
  const policy = createContentSecurityPolicy(nonce);
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

/**
 * Match the admin route family without treating look-alikes such as `/admin;x`
 * as a protected route. Decode once first because path encodings otherwise let
 * a genuine `/admin` request fall through the proxy matcher.
 */
function isAdminRoute(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // A malformed encoding cannot be a valid application route.
    return false;
  }

  return (
    decoded === '/admin' ||
    decoded.startsWith('/admin/') ||
    decoded === '/admin.rsc' ||
    /^\/_next\/data\/[^/]+\/admin\.json$/.test(decoded)
  );
}

// Next.js 16 proxy guard for the admin shell and a strict per-request CSP. Route
// handlers repeat authorization so API data remains protected if a proxy is bypassed.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  if (isAdminRoute(request.nextUrl.pathname)) {
    const denied = await requireAdmin(request);
    if (denied) return applyContentSecurityPolicy(request, denied, nonce);
  }

  return applyContentSecurityPolicy(
    request,
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce
  );
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
    },
  ],
};
