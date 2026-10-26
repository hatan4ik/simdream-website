import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import {
  MAIL_ENV,
  PRODUCTION_PAYMENTS_ENV,
  isSlotAvailable,
  mockFailingMailer,
  mockMailTransport,
  postCheckout,
  type MailProbe,
} from './helpers';

const BOOKING_DATE = '2026-11-01';
const SEED_VOUCHER_CODE = 'SD-VOUCH-DF7QK3MN8R2V6X9LPA';
const GENERIC_CHECKOUT_FAILURE = 'Unable to start checkout. Please try again.';

afterEach(() => {
  vi.doUnmock('@sendgrid/mail');
  vi.doUnmock('@/lib/sendgrid');
});

const stripeOutage = () =>
  loadApp({ stripe: 'mocked', stripeFailure: new Error('connect ETIMEDOUT api.stripe.com:443 (sk_test_secret)') });

describe('Stripe outage during checkout', () => {
  it('answers 503 with a generic message that does not leak the Stripe error', async () => {
    const app = await stripeOutage();
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'outage@example.test' })
    );

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: GENERIC_CHECKOUT_FAILURE });
  });

  it('cancels the pending booking and releases its departure', async () => {
    const app = await stripeOutage();
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);

    await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'released@example.test' })
    );

    const created = await app.store.getBookingsByEmail('released@example.test');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ status: 'cancelled', paymentStatus: 'pending' });
    expect(await isSlotAvailable(app, BOOKING_DATE, 60, slot.startTime)).toBe(true);
  });

  it('does not leave a payable gift voucher behind', async () => {
    const app = await stripeOutage();

    const response = await postCheckout(app, voucherCheckoutBody({ senderEmail: 'outage-sender@example.test' }));

    expect(response).toMatchObject({ status: 503, body: { error: GENERIC_CHECKOUT_FAILURE } });
    const created = (await app.store.getVouchers()).filter((voucher) => voucher.senderEmail === 'outage-sender@example.test');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ paymentStatus: 'refunded', currentBalanceIls: 0 });

    // Even a late "completed" delivery for it must not mint a spendable balance.
    const webhook = await app.routes.stripeWebhook();
    const late = await webhook.POST(
      signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { voucherId: created[0].id } }))
    );
    expect(late.status).toBe(200);
    expect(await app.store.getVoucherById(created[0].id)).toMatchObject({ paymentStatus: 'refunded', currentBalanceIls: 0 });
  });
});

async function startCardBooking(app: TestApp, pilotEmail: string) {
  const slot = await findOpenSlot(app, BOOKING_DATE, 60);
  const response = await postCheckout(
    app,
    bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail })
  );
  expect(response.status).toBe(201);
  const bookingId = app.checkoutSessions.at(-1)?.bookingId;
  if (!bookingId) throw new Error('Checkout did not create a Stripe session for the booking');
  const booking = await app.store.getBookingById(bookingId);
  if (!booking) throw new Error('Pending booking was not stored');
  return booking;
}

describe('SendGrid during the completed webhook', () => {
  it('sends exactly one confirmation when the mail transport is healthy (control)', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const booking = await startCardBooking(app, 'healthy-mail@example.test');
    const webhook = await app.routes.stripeWebhook();

    const response = await webhook.POST(
      signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } }))
    );

    expect(response.status).toBe(200);
    expect(mail.confirmationsFor(booking.bookingReference)).toBe(1);
  });

  const MAIL_FAILURES: Array<{ name: string; install: () => MailProbe; env: Record<string, string> }> = [
    { name: 'the SendGrid API rejects the send', install: mockMailTransport, env: MAIL_ENV },
    { name: 'the mailer throws', install: mockFailingMailer, env: {} },
  ];

  it.each(MAIL_FAILURES)(
    'delivers exactly one confirmation once Stripe retries after $name (REL-2)',
    async ({ install, env }) => {
      const mail = install();
      const app = await loadApp({ stripe: 'mocked', env });
      const booking = await startCardBooking(app, 'retry-mail@example.test');
      const webhook = await app.routes.stripeWebhook();
      const event = checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } });

      mail.failNext(1);
      await webhook.POST(signedWebhookRequest(event));
      // Stripe redelivers the same event after the outage is over.
      const retry = await webhook.POST(signedWebhookRequest(event));

      expect(retry.status).toBe(200);
      expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
      expect(mail.confirmationsFor(booking.bookingReference)).toBe(1);
    }
  );
});

describe('misconfigured application URL during checkout', () => {
  // NEXT_PUBLIC_APP_URL is resolved after the booking and voucher redemption are
  // committed, so a configuration error must not leave those side effects behind.
  const MALFORMED_APP_URL = { NEXT_PUBLIC_APP_URL: 'qa-malformed-origin' };

  it('answers 503 instead of crashing when the application URL is unusable', async () => {
    const app = await loadApp({ env: MALFORMED_APP_URL });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE, pilotEmail: 'config@example.test' })
    );

    expect(response).toMatchObject({ status: 503, body: { error: GENERIC_CHECKOUT_FAILURE } });
  });

  it('keeps the voucher balance and the departure when checkout fails on the application URL (REL-7)', async () => {
    const app = await loadApp({ env: MALFORMED_APP_URL });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);

    await postCheckout(
      app,
      bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE, pilotEmail: 'config@example.test' })
    );

    expect((await app.store.getVoucherByCode(SEED_VOUCHER_CODE))?.currentBalanceIls).toBe(400);
    expect(await isSlotAvailable(app, BOOKING_DATE, 20, slot.startTime)).toBe(true);
  });

  it('releases the departure when card checkout fails on the application URL (REL-7)', async () => {
    const app = await loadApp({ stripe: 'mocked', env: MALFORMED_APP_URL });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'config-card@example.test' })
    );

    expect(response.status).toBe(503);
    // No Stripe session exists, so no "expired" webhook will ever release a pending hold.
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await isSlotAvailable(app, BOOKING_DATE, 60, slot.startTime)).toBe(true);
  });
});

describe('production without a configured database', () => {
  // Fail closed: only the explicit demo opt-in may run production on the in-memory store.
  const NO_DATABASE_ENV = { ...PRODUCTION_PAYMENTS_ENV, ALLOW_IN_MEMORY_STORE: '' };

  it('refuses card checkout with 503 instead of taking an order it cannot persist (REL-3)', async () => {
    // Control: the identical request succeeds when the demo store is explicitly allowed,
    // so the 503 below can only come from the missing database.
    const demo = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS_ENV });
    const slot = await findOpenSlot(demo, BOOKING_DATE, 60);
    const body = bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'no-db@example.test' });
    expect((await postCheckout(demo, body)).status).toBe(201);

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = await loadApp({ stripe: 'mocked', env: NO_DATABASE_ENV });
    const response = await postCheckout(app, body);

    expect(response.status).toBe(503);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('refuses gift voucher checkout with 503 instead of taking an order it cannot persist (REL-3)', async () => {
    const body = voucherCheckoutBody({ senderEmail: 'no-db-sender@example.test' });
    const demo = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS_ENV });
    expect((await postCheckout(demo, body)).status).toBe(201);

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = await loadApp({ stripe: 'mocked', env: NO_DATABASE_ENV });
    const response = await postCheckout(app, body);

    expect(response.status).toBe(503);
    expect(app.checkoutSessions).toHaveLength(0);
  });
});
