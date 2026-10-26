import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructStripeWebhookEvent, isStripeWebhookConfigured } from '@/lib/stripe';
import { store, type ConfirmationKind } from '@/lib/db/store';
import { sendBookingConfirmationEmail, sendVoucherActivationEmail } from '@/lib/sendgrid';

export const runtime = 'nodejs';

/**
 * Sends a confirmation email exactly once across Stripe retries and concurrent
 * deliveries. A failed send releases the claim and throws, so the route answers
 * 5xx and Stripe redelivers the event until the customer is notified. A delivery
 * that finds the email still in flight elsewhere also throws: acknowledging it
 * would lose the email if the other delivery crashed before sending.
 */
async function deliverConfirmationOnce(
  kind: ConfirmationKind,
  id: string,
  send: () => Promise<{ success: boolean; message: string }>
): Promise<void> {
  const claim = await store.claimConfirmation(kind, id);
  if (claim === 'sent') return;
  if (claim === 'busy') throw new Error('Confirmation email is in flight in another delivery; awaiting redelivery');
  try {
    const result = await send();
    if (!result.success) throw new Error(`Confirmation email was not accepted: ${result.message}`);
  } catch (error) {
    await store.releaseConfirmation(kind, id);
    throw error;
  }
  await store.completeConfirmation(kind, id);
}

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
      // Conditional updates make replayed deliveries idempotent.
      const confirmed = await store.markBookingPaidIfPending(bookingId, paymentIntentId);
      const booking = confirmed ?? (await store.getBookingById(bookingId));
      if (booking?.status === 'cancelled' && booking.paymentStatus === 'pending') {
        // Paid after the desk cancelled it (the departure may be re-sold): keep it cancelled.
        await store.recordPaymentForCancelledBooking(bookingId, paymentIntentId);
        console.error('Payment completed for a cancelled booking; refund required', {
          bookingReference: booking.bookingReference,
        });
      } else if (booking?.status === 'confirmed' && booking.paymentStatus === 'paid') {
        await deliverConfirmationOnce('booking', booking.id, () => sendBookingConfirmationEmail(booking));
      }
    } else if (event.type === 'checkout.session.completed' && voucherId) {
      const activated = await store.activateVoucherIfPending(voucherId, session.id);
      const voucher = activated ?? (await store.getVoucherById(voucherId));
      if (voucher?.paymentStatus === 'paid') {
        await deliverConfirmationOnce('voucher', voucher.id, () => sendVoucherActivationEmail(voucher));
      } else if (voucher?.paymentStatus === 'refunded') {
        // Paid after the checkout expired and the voucher was voided: keep it void, record the payment.
        const recorded = await store.recordPaymentForVoidedVoucher(voucher.id, session.id);
        if (recorded) console.error('Payment completed for a voided gift voucher; refund required', { voucherId: voucher.id });
      }
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
