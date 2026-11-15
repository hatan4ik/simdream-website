import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/http/read-json-body';
import { parseWixBirthdayClaimRequest } from '@/lib/wix/birthday-claim-request';
import { throttleBirthdayClaim } from '@/lib/wix/birthday-claim-throttle';
import { getWixBirthdayPricingProviderConfig, issueWixBirthdayPricingClaim } from '@/lib/wix/birthday-pricing-server';

// Configuration is server-only and can change independently of a code build.
export const dynamic = 'force-dynamic';

const INVALID_REQUEST_MESSAGE = 'Use a valid birthday, flight selection and email.';
/** The browser sends a few hundred bytes of JSON; anything far larger is refused unread. */
const MAX_BODY_BYTES = 8 * 1024;

/**
 * Issues the opaque proof consumed by the Wix pricing provider, bound to the pilot's email (and
 * phone) and limited per client address and per email. The full date of birth exists only while
 * this request is evaluated and is never returned.
 */
export async function POST(request: Request) {
  const config = getWixBirthdayPricingProviderConfig();
  if (!config) {
    return NextResponse.json({ error: 'Birthday pricing is temporarily unavailable.' }, { status: 503 });
  }

  const body = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES, requireJsonContentType: true });
  if (!body.ok) return body.response;
  const claimRequest = parseWixBirthdayClaimRequest(body.body);
  if (!claimRequest) return NextResponse.json({ error: INVALID_REQUEST_MESSAGE }, { status: 400 });

  const refusal = await throttleBirthdayClaim(request, claimRequest.email);
  if (refusal) return refusal;

  try {
    const result = await issueWixBirthdayPricingClaim(claimRequest, { config });
    if (!result.ok) {
      return NextResponse.json({ error: INVALID_REQUEST_MESSAGE }, { status: 400 });
    }
    if (!result.applied) {
      return NextResponse.json({ applied: false });
    }
    return NextResponse.json({
      applied: true,
      fieldId: result.fieldId,
      token: result.token,
    });
  } catch {
    return NextResponse.json({ error: 'Birthday pricing is temporarily unavailable.' }, { status: 503 });
  }
}
