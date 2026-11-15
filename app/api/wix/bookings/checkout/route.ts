import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/http/read-json-body';
import {
  resolveWixBookingCheckout,
  WixBookingUnavailableError,
  wixBookingCheckoutSchema,
} from '@/lib/wix/booking-checkout';

/** A package, a departure and up to 20 add-on ids: about 2 KiB at most. */
const WIX_BOOKING_CHECKOUT_MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const read = await readJsonBody(request, { maxBytes: WIX_BOOKING_CHECKOUT_MAX_BODY_BYTES });
  // Only an oversized body is refused here: malformed JSON still gets the schema's 400 below.
  if (!read.ok && read.response.status !== 400) return read.response;
  const input = wixBookingCheckoutSchema.safeParse(read.ok ? read.body : null);
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
