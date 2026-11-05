import { NextResponse } from 'next/server';
import {
  resolveWixSubscriptionBookingCheckout,
  WixSubscriptionBookingUnavailableError,
  wixSubscriptionBookingCheckoutSchema,
} from '@/lib/wix/subscription-booking';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const input = wixSubscriptionBookingCheckoutSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: 'Use a valid subscription package, date, and departure time.' }, { status: 400 });
  }

  try {
    const checkout = await resolveWixSubscriptionBookingCheckout(input.data);
    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof WixSubscriptionBookingUnavailableError) {
      return NextResponse.json({ error: 'That departure is no longer available. Please choose another time.' }, { status: 409 });
    }
    console.error('Wix subscription booking checkout lookup failed', error);
    return NextResponse.json({ error: 'Subscription booking is temporarily unavailable.' }, { status: 503 });
  }
}
