import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { hasUsableValue, isProduction } from '@/lib/config/server-env';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const isStripeConfigured = Boolean(
  hasUsableValue(stripeSecretKey) &&
    stripeSecretKey.startsWith('sk_') &&
    (!isProduction || stripeSecretKey.startsWith('sk_live_'))
);

export const isStripeWebhookConfigured = Boolean(
  hasUsableValue(stripeWebhookSecret) && stripeWebhookSecret.startsWith('whsec_')
);

/**
 * Online sales require both a real API key and a real webhook signing secret:
 * without a verified webhook a payment can never be confirmed server-side.
 */
export const isPaymentsConfigured = isStripeConfigured && isStripeWebhookConfigured;

export const PAYMENTS_DISABLED_MESSAGE =
  'Online payments are temporarily unavailable. Please contact us to book.';

export const stripe = isStripeConfigured
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-09-30.acacia' as any,
    })
  : null;

/**
 * Returns a 503 response when online payments are not fully configured,
 * or `null` when the caller may proceed.
 */
export function requirePaymentsEnabled(): NextResponse | null {
  if (isPaymentsConfigured) return null;
  return NextResponse.json({ error: PAYMENTS_DISABLED_MESSAGE }, { status: 503 });
}

/**
 * Verifies the Stripe signature and parses the event. Throws if the webhook is
 * not configured or the signature is invalid; unsigned payloads are never trusted.
 */
export function constructStripeWebhookEvent(payload: string, signature: string): Stripe.Event {
  if (!stripe || !isStripeWebhookConfigured) {
    throw new Error('Stripe webhook is not configured');
  }
  return stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
}

export interface CreateCheckoutParams {
  bookingId?: string;
  voucherId?: string;
  title: string;
  description: string;
  amountIls: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string; sessionId: string }> {
  if (!isPaymentsConfigured || !stripe) {
    throw new Error(PAYMENTS_DISABLED_MESSAGE);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'ils',
          product_data: {
            name: params.title,
            description: params.description,
          },
          unit_amount: Math.round(params.amountIls * 100), // Stripe uses minor currency units (agorot/cents)
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    // Pending inventory is released by signed session-expired events. Stripe
    // requires an expiry between 30 minutes and 24 hours from creation.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    customer_email: params.customerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      bookingId: params.bookingId || '',
      voucherId: params.voucherId || '',
    },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}
