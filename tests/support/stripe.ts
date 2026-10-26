import Stripe from 'stripe';
import { apiRequest } from './http';
import { TEST_STRIPE } from './test-env';

// Constructing the client performs no network I/O; it is only used to sign payloads.
const signer = new Stripe(TEST_STRIPE.secretKey);

let eventSequence = 0;

export type CheckoutSessionEventType =
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'checkout.session.async_payment_failed';

export interface CheckoutSessionFields {
  id?: string;
  payment_status?: 'paid' | 'unpaid' | 'no_payment_required';
  payment_intent?: string | null;
  metadata?: { bookingId?: string; voucherId?: string };
}

/** A minimal Stripe event envelope carrying a Checkout Session. */
export function checkoutSessionEvent(type: CheckoutSessionEventType, session: CheckoutSessionFields = {}) {
  eventSequence += 1;
  return {
    id: `evt_test_${eventSequence}`,
    object: 'event',
    api_version: '2024-09-30.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: {
      object: {
        id: session.id ?? `cs_test_${eventSequence}`,
        object: 'checkout.session',
        payment_status: session.payment_status ?? (type === 'checkout.session.completed' ? 'paid' : 'unpaid'),
        payment_intent: session.payment_intent === undefined ? `pi_test_${eventSequence}` : session.payment_intent,
        metadata: session.metadata ?? {},
      },
    },
  };
}

export interface SignedWebhookOptions {
  secret?: string;
  /** Unix seconds; defaults to now. Use an old value to test replay tolerance. */
  timestamp?: number;
  /** Overrides the computed header, e.g. to send a forged signature. */
  signatureHeader?: string;
}

/** A webhook Request signed exactly as Stripe signs deliveries. */
export function signedWebhookRequest(event: object, options: SignedWebhookOptions = {}): Request {
  const payload = JSON.stringify(event);
  const signature =
    options.signatureHeader ??
    signer.webhooks.generateTestHeaderString({
      payload,
      secret: options.secret ?? TEST_STRIPE.webhookSecret,
      timestamp: options.timestamp,
    });
  return apiRequest('/api/webhooks/stripe', {
    method: 'POST',
    rawBody: payload,
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
  });
}
