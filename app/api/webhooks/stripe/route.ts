import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructStripeWebhookEvent, isStripeWebhookConfigured } from '@/lib/stripe';
import { store } from '@/lib/db/store';
import { sendBookingConfirmationEmail, sendVoucherActivationEmail } from '@/lib/sendgrid';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(await request.text(), signature);
  } catch {
    // Never log the signed body or payment metadata.
    console.warn('Stripe webhook signature verification failed');
    return NextResponse.json({ error: 'Webhook signature error.' }, { status: 400 });
  }

  const sessionEvents = new Set([
    'checkout.session.completed',
    'checkout.session.expired',
    'checkout.session.async_payment_failed',
  ]);
  if (!sessionEvents.has(event.type)) return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }
  const bookingId = session.metadata?.bookingId;
  const voucherId = session.metadata?.voucherId;

  try {
    if (event.type === 'checkout.session.completed' && bookingId) {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
      // Conditional update makes replayed webhook deliveries idempotent; only
      // the delivery that changes state sends a confirmation email.
      const booking = await store.markBookingPaidIfPending(bookingId, paymentIntentId);
      if (booking) await sendBookingConfirmationEmail(booking);
    } else if (event.type === 'checkout.session.completed' && voucherId) {
      const voucher = await store.activateVoucherIfPending(voucherId, session.id);
      if (voucher) await sendVoucherActivationEmail(voucher);
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      if (bookingId) await store.cancelPendingBooking(bookingId);
      if (voucherId) await store.cancelPendingVoucher(voucherId);
    }
  } catch (error) {
    // Stripe retries a 5xx response. State transitions are idempotent.
    console.error('Stripe webhook processing failed', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}
