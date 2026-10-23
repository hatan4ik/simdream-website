import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const isStripeConfigured = Boolean(
  stripeSecretKey && !stripeSecretKey.includes('sk_test_...') && stripeSecretKey.startsWith('sk_')
);

export const stripe = isStripeConfigured
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-09-30.acacia' as any,
    })
  : null;

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
  if (isStripeConfigured && stripe) {
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
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        bookingId: params.bookingId || '',
        voucherId: params.voucherId || '',
      },
    });

    return {
      url: session.url || params.successUrl,
      sessionId: session.id,
    };
  }

  // Graceful Local Simulation Mode:
  // Automatically creates a mock session redirecting to the success URL
  const mockSessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const redirectUrl = new URL(params.successUrl);
  redirectUrl.searchParams.set('session_id', mockSessionId);

  return {
    url: redirectUrl.toString(),
    sessionId: mockSessionId,
  };
}

