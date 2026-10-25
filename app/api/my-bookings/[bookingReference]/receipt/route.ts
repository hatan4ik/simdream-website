import { NextResponse } from 'next/server';
import { memberOwnsBooking } from '@/lib/auth/member-ownership';
import { requireAuthenticatedUser } from '@/lib/auth/request-auth';
import { store } from '@/lib/db/store';
import { isStripeConfigured, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const BOOKING_REFERENCE_PATTERN = /^SD-737-[A-Z2-9]{16}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ bookingReference: string }> }
) {
  const member = await requireAuthenticatedUser(request).catch(() => null);
  if (!member?.emailVerified) {
    return NextResponse.json({ error: 'Authentication with a confirmed email is required.' }, { status: 401 });
  }

  const { bookingReference } = await context.params;
  if (!BOOKING_REFERENCE_PATTERN.test(bookingReference)) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  try {
    await store.ensureMemberProfile(member);
    await store.linkGuestBookingsToMember(member);
    const booking = await store.getBookingByRef(bookingReference);
    if (!booking || !memberOwnsBooking(member.id, booking.userId)) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.paymentMethod !== 'stripe' || booking.paymentStatus !== 'paid') {
      return NextResponse.json({ error: 'A Stripe payment receipt is not available for this booking.' }, { status: 409 });
    }
    if (!booking.stripePaymentIntentId || !isStripeConfigured || !stripe) {
      return NextResponse.json({ error: 'Payment receipt is temporarily unavailable.' }, { status: 503 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId, {
      expand: ['latest_charge'],
    });
    const latestCharge = paymentIntent.latest_charge;
    const receiptUrl =
      latestCharge && typeof latestCharge !== 'string' ? latestCharge.receipt_url : null;
    if (!receiptUrl) {
      return NextResponse.json({ error: 'Stripe has not published a receipt for this payment yet.' }, { status: 404 });
    }
    return NextResponse.json(
      { receiptUrl },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Payment receipt lookup failed', error);
    return NextResponse.json({ error: 'Payment receipt is temporarily unavailable.' }, { status: 503 });
  }
}
