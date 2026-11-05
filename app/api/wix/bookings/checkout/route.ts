import { NextResponse } from 'next/server';
import {
  resolveWixBookingCheckout,
  WixBookingUnavailableError,
  wixBookingCheckoutSchema,
} from '@/lib/wix/booking-checkout';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const input = wixBookingCheckoutSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: 'Use a valid package, date, and departure time.' }, { status: 400 });
  }

  try {
    const checkout = await resolveWixBookingCheckout(input.data);
    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof WixBookingUnavailableError) {
      return NextResponse.json({ error: 'That departure is no longer available. Please choose another time.' }, { status: 409 });
    }
    console.error('Wix booking checkout lookup failed', error);
    return NextResponse.json({ error: 'Wix booking is temporarily unavailable.' }, { status: 503 });
  }
}
