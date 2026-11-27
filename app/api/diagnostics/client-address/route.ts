import { NextResponse } from 'next/server';
import { clientAddressDiagnosticIsOpen, describeClientAddressHeaders } from '@/lib/security/client-address-diagnostic';

// The answer follows a runtime environment value and the request's own headers; it is never prerendered.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Closed (404, empty body) unless `CLIENT_ADDRESS_DIAGNOSTIC_UNTIL` names a UTC instant at most 48
 * hours ahead; it closes by itself when that instant passes. While open it tells a deployer which
 * forwarding headers reach this host and where a forged value ends up, so
 * `RATE_LIMIT_CLIENT_IP_HEADER` can be set from an observation instead of a guess (SECURITY.md,
 * "Finding the header on a host"). It returns no header value.
 */
export function GET(request: Request) {
  // Read per request: the OpenNext Worker copies its bindings into process.env on the first request.
  if (!clientAddressDiagnosticIsOpen(process.env)) return new NextResponse(null, { status: 404, headers: NO_STORE });
  const report = describeClientAddressHeaders(request.headers, process.env, {
    expected: request.headers.get('x-diagnostic-expect'),
    spoof: request.headers.get('x-diagnostic-spoof'),
  });
  return NextResponse.json(report, { headers: NO_STORE });
}
