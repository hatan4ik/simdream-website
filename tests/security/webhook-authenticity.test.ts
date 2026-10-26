import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import { TEST_STRIPE } from '../support/test-env';
import { BOOKING_DATE, expectSafeApiResponse, propertyOptions, readRaw, snapshotState } from './security-helpers';

// Stripe's default signature tolerance (stripe-node DEFAULT_TOLERANCE).
const STRIPE_TOLERANCE_SECONDS = 300;

/** A card booking and a gift voucher, both pending until Stripe confirms them. */
async function pendingPurchases(app: TestApp) {
  const slot = await findOpenSlot(app, BOOKING_DATE, 60);
  const checkout = await app.routes.checkout();
  await checkout.POST(
    apiRequest('/api/checkout', { body: bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime }) })
  );
  await checkout.POST(apiRequest('/api/checkout', { body: voucherCheckoutBody() }));
  const bookingId = app.checkoutSessions[0]?.bookingId;
  const voucherId = app.checkoutSessions[1]?.voucherId;
  if (!bookingId || !voucherId) throw new Error('pending purchases were not created');
  return { bookingId, voucherId };
}

async function arrange() {
  const app = await loadApp({ stripe: 'mocked' });
  const ids = await pendingPurchases(app);
  const webhook = await app.routes.stripeWebhook();
  return { app, webhook, ...ids };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

describe('Stripe webhook authenticity', () => {
  it('accepts a correctly signed completion and confirms the booking (control)', async () => {
    const { app, webhook, bookingId } = await arrange();

    const response = await readRaw(
      await webhook.POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } })))
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ received: true });
    expect(await app.store.getBookingById(bookingId)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
  });

  it('rejects a delivery without a Stripe-Signature header (400) and changes nothing', async () => {
    const { app, webhook, bookingId } = await arrange();
    const before = await snapshotState(app);
    const payload = JSON.stringify(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } }));

    const response = await readRaw(
      await webhook.POST(apiRequest('/api/webhooks/stripe', { method: 'POST', rawBody: payload, headers: { 'content-type': 'application/json' } }))
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Missing Stripe signature.' });
    expect(await snapshotState(app)).toBe(before);
  });

  const forgeries: Array<{ label: string; options: (now: number) => Parameters<typeof signedWebhookRequest>[1] }> = [
    { label: 'a forged v1 signature', options: (now) => ({ signatureHeader: `t=${now},v1=${'ab'.repeat(32)}` }) },
    { label: 'a signature made with the wrong secret', options: () => ({ secret: 'whsec_fakeAttackerControlledSecret' }) },
    { label: `a timestamp ${STRIPE_TOLERANCE_SECONDS + 1}s old (beyond tolerance)`, options: (now) => ({ timestamp: now - STRIPE_TOLERANCE_SECONDS - 1 }) },
    { label: 'a replay signed a day ago', options: (now) => ({ timestamp: now - 86_400 }) },
    { label: 'a v0 (test-mode legacy) scheme only', options: (now) => ({ signatureHeader: `t=${now},v0=${'cd'.repeat(32)}` }) },
    { label: 'an empty signature header', options: () => ({ signatureHeader: ' ' }) },
  ];

  it.each(forgeries)('rejects $label (400) and changes nothing', async ({ options }) => {
    const { app, webhook, bookingId } = await arrange();
    const before = await snapshotState(app);

    const response = await readRaw(
      await webhook.POST(
        signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } }), options(nowSeconds()))
      )
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: expect.stringMatching(/signature/i) });
    expect(await snapshotState(app)).toBe(before);
  });

  it('rejects a validly signed body that was tampered with in transit (400)', async () => {
    const { app, webhook, bookingId } = await arrange();
    const before = await snapshotState(app);
    const genuine = signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: 'unrelated' } }));
    const tampered = (await genuine.text()).replace('"unrelated"', JSON.stringify(bookingId));

    const response = await readRaw(
      await webhook.POST(
        apiRequest('/api/webhooks/stripe', {
          method: 'POST',
          rawBody: tampered,
          headers: { 'content-type': 'application/json', 'stripe-signature': genuine.headers.get('stripe-signature') ?? '' },
        })
      )
    );

    expect(response.status).toBe(400);
    expect(await snapshotState(app)).toBe(before);
  });

  it('refuses every delivery (503) when the webhook secret is not configured, even a correctly signed one', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.stripeWebhook();
    const before = await snapshotState(app);

    const response = await readRaw(
      await POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: 'book-0' } })))
    );

    expect(response.status).toBe(503);
    expect(response.json).toEqual({ error: 'Stripe webhook is not configured.' });
    expect(await snapshotState(app)).toBe(before);
  });

  it.each(['payment_intent.succeeded', 'charge.succeeded', 'checkout.session.async_payment_succeeded', 'customer.created'])(
    'acknowledges but ignores the unrelated signed event %s',
    async (type) => {
      const { app, webhook, bookingId, voucherId } = await arrange();
      const before = await snapshotState(app);
      const event = { ...checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId, voucherId } }), type };

      const response = await readRaw(await webhook.POST(signedWebhookRequest(event)));

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ received: true });
      expect(await snapshotState(app)).toBe(before);
    }
  );

  it('does not confirm a booking from a signed completion whose payment is still unpaid', async () => {
    const { app, webhook, bookingId } = await arrange();

    const response = await readRaw(
      await webhook.POST(
        signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId }, payment_status: 'unpaid' }))
      )
    );

    expect(response.status).toBe(200);
    expect(await app.store.getBookingById(bookingId)).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
  });

  it('never activates a voucher or confirms a booking from arbitrary unsigned or mis-signed deliveries', async () => {
    const { app, webhook, bookingId, voucherId } = await arrange();
    const before = await snapshotState(app);
    const signature = fc.oneof(
      fc.string({ unit: 'binary-ascii', maxLength: 160 }).map((value) => value.replace(/[^\x20-\x7e]/g, '')),
      fc.tuple(fc.integer({ min: 0, max: 2 ** 31 }), fc.stringMatching(/^[0-9a-f]{64}$/)).map(([t, v1]) => `t=${t},v1=${v1}`)
    );
    // Bodies never get past the signature gate, so full-Unicode generation (fast-check's 'binary' unit,
    // whose first use costs seconds on a loaded machine) adds nothing; explicit edge cases keep the encodings covered.
    const payload = fc.oneof(
      fc.string({ unit: 'binary-ascii', maxLength: 400 }),
      fc.constantFrom('\ud800{"type":"checkout.session.completed"}', '\u0000', '‮{}', '😀🛫', '', '{"id":"evt_\udfff"}'),
      fc
        .constantFrom('checkout.session.completed' as const, 'checkout.session.expired' as const)
        .map((type) => JSON.stringify(checkoutSessionEvent(type, { metadata: { bookingId, voucherId } })))
    );

    await fc.assert(
      fc.asyncProperty(payload, signature, async (rawBody, stripeSignature) => {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (stripeSignature.trim()) headers['stripe-signature'] = stripeSignature;
        const response = await readRaw(await webhook.POST(apiRequest('/api/webhooks/stripe', { method: 'POST', rawBody, headers })));
        expectSafeApiResponse(response);
        expect(response.status).toBe(400);
      }),
      propertyOptions(200)
    );

    expect(await snapshotState(app)).toBe(before);
  });

  it('never accepts a delivery signed with any secret other than the configured one', async () => {
    const { app, webhook, bookingId } = await arrange();
    const before = await snapshotState(app);
    const otherSecret = fc
      .stringMatching(/^whsec_[A-Za-z0-9]{8,40}$/)
      .filter((secret) => secret !== TEST_STRIPE.webhookSecret);

    await fc.assert(
      fc.asyncProperty(otherSecret, async (secret) => {
        const response = await webhook.POST(
          signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } }), { secret })
        );
        expect(response.status).toBe(400);
      }),
      propertyOptions(50)
    );

    expect(await snapshotState(app)).toBe(before);
  });
});
