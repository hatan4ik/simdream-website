import { NextResponse } from 'next/server';
import { verifiedWixBirthdayPricingBooking } from '@/lib/wix/birthday-pricing-provider-auth';
import {
  calculateWixBirthdayBookingPrice,
  getWixBirthdayPricingProviderConfig,
} from '@/lib/wix/birthday-pricing-server';

// Wix's external Bookings Pricing provider sends an RS256-signed JWT in a
// text/plain POST body to exactly `{DEPLOYMENT-URI}/v1/calculate-price`.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = getWixBirthdayPricingProviderConfig();
  if (!config) {
    return NextResponse.json({ error: 'Pricing provider is not configured.' }, { status: 503 });
  }

  const booking = await verifiedWixBirthdayPricingBooking(await request.text(), config);
  if (!booking) {
    return NextResponse.json({ error: 'Invalid Wix pricing-provider request.' }, { status: 401 });
  }

  try {
    const decision = await calculateWixBirthdayBookingPrice(booking, { config });
    if (!decision.ok) {
      return NextResponse.json({ error: 'Wix booking could not be priced.' }, { status: 400 });
    }
    return NextResponse.json({ calculatedPrice: decision.calculatedPrice });
  } catch {
    return NextResponse.json({ error: 'Pricing provider is temporarily unavailable.' }, { status: 503 });
  }
}
