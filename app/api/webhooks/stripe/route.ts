import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { store } from '@/lib/db/store';
import { sendBookingConfirmationEmail } from '@/lib/sendgrid';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  if (!isStripeConfigured || !stripe) {
    return NextResponse.json({ message: 'Stripe webhook in local simulated mode' });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: any;
  try {
    if (webhookSecret && !webhookSecret.includes('whsec_...')) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      event = JSON.parse(payload);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature error' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const bookings = await store.getBookings();
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.stripePaymentIntentId = session.payment_intent as string;
        sendBookingConfirmationEmail(booking).catch(console.error);
      }
    }
  }

  return NextResponse.json({ received: true });
}

