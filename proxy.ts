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
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${development ? ' ws: wss:' : ''} https://*.supabase.co wss://*.supabase.co`,
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

// Next.js 16 proxy guard for the admin shell and a strict per-request CSP. Route
// handlers repeat authorization so API data remains protected if a proxy is bypassed.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  if (request.nextUrl.pathname.startsWith('/admin')) {
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
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
