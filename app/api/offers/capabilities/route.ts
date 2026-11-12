import { NextResponse } from 'next/server';
import { isBirthdayDiscountEnforceableOnActivePath } from '@/lib/discounts/birthday';
import { isWixAvailabilityAdapterEnabled } from '@/lib/wix/config';

// The answer follows a runtime environment flag, so it is never prerendered at build time.
export const dynamic = 'force-dynamic';

/**
 * Tells the public Offers page whether the live checkout can apply the birthday discount, so the page
 * never advertises one it cannot honour. Public and read-only: it exposes one boolean.
 */
export async function GET() {
  return NextResponse.json(
    {
      birthdayDiscountEnforceable: isBirthdayDiscountEnforceableOnActivePath({
        wixAuthoritative: isWixAvailabilityAdapterEnabled(),
      }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
  );
}
