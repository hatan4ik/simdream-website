import { NextResponse } from 'next/server';
import { getWixBirthdayPricingProviderConfig, issueWixBirthdayPricingClaim } from '@/lib/wix/birthday-pricing-server';

// Configuration is server-only and can change independently of a code build.
export const dynamic = 'force-dynamic';

/**
 * Issues the opaque proof consumed by the Wix pricing provider. The full date
 * of birth exists only while this request is evaluated and is never returned.
 */
export async function POST(request: Request) {
  const config = getWixBirthdayPricingProviderConfig();
  if (!config) {
    return NextResponse.json({ error: 'Birthday pricing is temporarily unavailable.' }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  try {
    const result = await issueWixBirthdayPricingClaim(body, { config });
    if (!result.ok) {
      return NextResponse.json({ error: 'Use a valid birthday and flight selection.' }, { status: 400 });
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
