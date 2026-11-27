import { NextResponse } from 'next/server';
import { describeClientAddressHeaders } from '@/lib/security/client-address-diagnostic';

// The answer follows a runtime environment flag and the request's own headers; it is never prerendered.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Off unless `CLIENT_ADDRESS_DIAGNOSTIC=1`: then it tells a deployer which forwarding headers reach
 * this host, so `RATE_LIMIT_CLIENT_IP_HEADER` can be set from an observation instead of a guess
 * (SECURITY.md, "Client address for rate limiting"). It returns no header value. Switch it on for the
 * observation and off again afterwards; it answers 404 with an empty body everywhere else.
 */
export function GET(request: Request) {
  // Read per request: the OpenNext Worker copies its bindings into process.env on the first request.
  if (process.env.CLIENT_ADDRESS_DIAGNOSTIC !== '1') return new NextResponse(null, { status: 404, headers: NO_STORE });
  const report = describeClientAddressHeaders(request.headers, process.env, request.headers.get('x-diagnostic-expect'));
  return NextResponse.json(report, { headers: NO_STORE });
}
