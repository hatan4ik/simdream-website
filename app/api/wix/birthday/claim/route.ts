import { NextResponse } from 'next/server';
import { parseWixBirthdayClaimRequest } from '@/lib/wix/birthday-claim-request';
import { throttleBirthdayClaim } from '@/lib/wix/birthday-claim-throttle';
import { getWixBirthdayPricingProviderConfig, issueWixBirthdayPricingClaim } from '@/lib/wix/birthday-pricing-server';

// Configuration is server-only and can change independently of a code build.
export const dynamic = 'force-dynamic';

const INVALID_REQUEST_MESSAGE = 'Use a valid birthday, flight selection and email.';

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

  const claimRequest = parseWixBirthdayClaimRequest(await request.json().catch(() => null));
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
