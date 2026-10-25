import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';

// Next.js 16 proxy guard for the admin shell. Route handlers repeat this check
// so API data remains protected if a request bypasses the page proxy.
export function proxy(request: NextRequest) {
  return requireAdmin(request) ?? NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
