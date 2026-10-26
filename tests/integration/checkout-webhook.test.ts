import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import {
  adminRequest,
  createPendingCardBooking,
  deliverWebhook,
  EMPTY_DAY,
  isSlotOpen,
  postCheckout,
  PRIVATE_NO_STORE,
  SEED_FULL_VOUCHER,
} from './api-helpers';
import {
  booking as bookingRecord,
  errorBody,
  expectContract,
  giftVoucher,
  publicBooking,
  publicVoucher,
  stripeCheckoutStarted,
  webhookAck,
} from './contracts';

const DAY = EMPTY_DAY.sunday;
const HOUR_MS = 60 * 60 * 1000;
const LATE_PAYMENT_INTENT = 'pi_late_1';
const LATE_GIFT_SESSION = 'cs_test_late_gift';
const REFUND_ALERT = 'Payment completed for a cancelled booking; refund required';
const BOOKING_CONFIRMATION_EMAIL = '[SIMULATION EMAIL] Booking confirmation queued';
const VOUCHER_ACTIVATION_EMAIL = '[SIMULATION EMAIL] Voucher activation queued';

/** Console calls whose first argument is `message`: simulation-mode emails and operator alerts are logged this way. */
function logged(spy: { mock: { calls: unknown[][] } }, message: string) {
  return spy.mock.calls.filter(([first]) => first === message);
}

/** Vouchers last one calendar year; local-time arithmetic may shift it by a DST hour. */
function expectOneYearFromNow(expiryDate: string | undefined) {
  const oneYear = 365 * 24 * HOUR_MS; // Nov 2026 to Nov 2027 spans no 29 February.
  expect(Math.abs(new Date(expiryDate ?? '').getTime() - (Date.now() + oneYear))).toBeLessThanOrEqual(HOUR_MS);
}

async function verifyVoucher(app: TestApp, code: string) {
  const { POST } = await app.routes.vouchers();
  return readJson(await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code } })));
}

async function purchaseGiftVoucher(app: TestApp, amountIls = 750) {
  const response = await postCheckout(app, voucherCheckoutBody({ amountIls, senderEmail: 'gifter@pilots.test' }));
  if (response.status !== 201) throw new Error(`Gift voucher checkout returned ${response.status}`);
  const session = app.checkoutSessions[app.checkoutSessions.length - 1];
  const voucher = await app.store.getVoucherById(session.voucherId ?? '');
  if (!voucher) throw new Error('Gift voucher was not stored');
  return { response, session, voucher };
}

/**
 * Customer A starts a card checkout, the desk cancels it before A pays, and the
 * departure is re-sold to customer B with a voucher. A's payment is still open.
 */
async function cancelAndResell(app: TestApp) {
  const { booking: abandoned, session, slot } = await createPendingCardBooking(app, {
    date: DAY,
    pilotEmail: 'abandoned@pilots.test',
  });
  const bookings = await app.routes.bookings();
  const cancel = await bookings.PATCH(
    adminRequest('/api/bookings', { method: 'PATCH', body: { id: abandoned.id, status: 'cancelled' } })
  );
  if (cancel.status !== 200) throw new Error(`Admin cancellation returned ${cancel.status}`);
  const resold = await postCheckout<{ bookingReference: string }>(
    app,
    bookingCheckoutBody({
      bookingDate: DAY,
      startTime: slot.startTime,
      voucherCode: SEED_FULL_VOUCHER.code,
      pilotEmail: 'second.customer@pilots.test',
    })
  );
  if (resold.status !== 201) throw new Error(`Re-selling the departure returned ${resold.status}`);
  const replacement = await app.store.getBookingByRef(resold.body.bookingReference);
  if (!replacement) throw new Error('The re-sold booking was not stored');
  return { abandoned, replacement, session, slot };
}

function latePaymentFor(bookingId: string) {
  return checkoutSessionEvent('checkout.session.completed', {
    payment_intent: LATE_PAYMENT_INTENT,
    metadata: { bookingId },
  });
}

/** A gift voucher voided at purchase because Stripe was unreachable, so its status is no longer pending. */
async function voidedGiftVoucher() {
  const app = await loadApp({ stripe: 'mocked', stripeFailure: new Error('Stripe API unreachable') });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const senderEmail = 'late.gifter@pilots.test';
  const response = await postCheckout(app, voucherCheckoutBody({ amountIls: 600, senderEmail }));
  if (response.status !== 503) throw new Error(`Gift voucher checkout during an outage returned ${response.status}`);
  const voucher = (await app.store.getVouchers()).find((candidate) => candidate.senderEmail === senderEmail);
  if (!voucher) throw new Error('The voided gift voucher was not stored');
  return { app, voucher };
}

function lateGiftPaymentFor(voucherId: string) {
  return checkoutSessionEvent('checkout.session.completed', { id: LATE_GIFT_SESSION, metadata: { voucherId } });
}

/** The voucher record exactly as the admin desk lists it, validated against the contract. */
async function deskVoucherRecord(app: TestApp, voucherId: string) {
  const { GET } = await app.routes.vouchers();
  const response = await readJson(await GET(adminRequest('/api/vouchers')));
  if (response.status !== 200) throw new Error(`GET /api/vouchers returned ${response.status}`);
  const record = expectContract(giftVoucher.array(), response.body).find((candidate) => candidate.id === voucherId);
  if (!record) throw new Error(`Voucher ${voucherId} is not listed for the desk`);
  return record;
}

describe('POST /api/webhooks/stripe: booking transitions', () => {
  it('confirms a pending booking on checkout.session.completed and records the payment intent', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { booking } = await createPendingCardBooking(app, { date: DAY });

    const ack = await deliverWebhook(
      app,
      checkoutSessionEvent('checkout.session.completed', { payment_intent: 'pi_contract_paid', metadata: { bookingId: booking.id } })
    );

    expect(ack.status).toBe(200);
    expectContract(webhookAck, ack.body);
    expect(await app.store.getBookingById(booking.id)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
      stripePaymentIntentId: 'pi_contract_paid',
    });
    const { GET } = await app.routes.bookings();
    const lookup = await readJson(await GET(apiRequest(`/api/bookings?ref=${booking.bookingReference}`)));
    expect(expectContract(publicBooking, lookup.body)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
  });

  it('leaves the booking pending when a completed session reports payment_status unpaid', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { booking, slot } = await createPendingCardBooking(app, { date: DAY });

    const ack = await deliverWebhook(
      app,
      checkoutSessionEvent('checkout.session.completed', { payment_status: 'unpaid', metadata: { bookingId: booking.id } })
    );

    expect(ack.status).toBe(200);
    expectContract(webhookAck, ack.body);
    expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(false);
  });

  it.each(['checkout.session.expired', 'checkout.session.async_payment_failed'] as const)(
    'cancels the pending booking and releases its slot on %s',
    async (type) => {
      const app = await loadApp({ stripe: 'mocked' });
      const { booking, slot } = await createPendingCardBooking(app, { date: DAY });
      expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(false);

      const ack = await deliverWebhook(app, checkoutSessionEvent(type, { metadata: { bookingId: booking.id } }));

      expect(ack.status).toBe(200);
      expectContract(webhookAck, ack.body);
      expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'cancelled', paymentStatus: 'pending' });
      expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(true);
    }
  );

  it('keeps a paid booking confirmed when a late expiry event arrives', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { booking, slot } = await createPendingCardBooking(app, { date: DAY });
    await deliverWebhook(app, checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } }));

    const ack = await deliverWebhook(app, checkoutSessionEvent('checkout.session.expired', { metadata: { bookingId: booking.id } }));

    expect(ack.status).toBe(200);
    expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(false);
  });

  it('acknowledges unrelated event types without changing any booking', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { booking } = await createPendingCardBooking(app, { date: DAY });
    const unrelated = {
      ...checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } }),
      type: 'payment_intent.succeeded',
    };

    const ack = await deliverWebhook(app, unrelated);

    expect(ack.status).toBe(200);
    expectContract(webhookAck, ack.body);
    expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
  });

  it('rejects a delivery without a Stripe signature with 400 and changes nothing', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { booking } = await createPendingCardBooking(app, { date: DAY });
    const { POST } = await app.routes.stripeWebhook();
    const event = checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } });

    const response = await readJson(await POST(apiRequest('/api/webhooks/stripe', { body: event })));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Missing Stripe signature.');
    expect(await app.store.getBookingById(booking.id)).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
  });

  it('answers 503 so Stripe retries later when the webhook secret is not configured', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.stripeWebhook();

    const response = await readJson(await POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.completed'))));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe('Stripe webhook is not configured.');
  });
});

describe('POST /api/webhooks/stripe: card payment completing after the desk cancelled the booking', () => {
  it('does not revive a cancelled booking whose payment completes after its slot was re-sold (API-6)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned, slot } = await cancelAndResell(app);

    const ack = await deliverWebhook(app, latePaymentFor(abandoned.id));

    expect(ack.status).toBe(200);
    expect((await app.store.getBookingById(abandoned.id))?.status).toBe('cancelled');
    const active = (await app.store.getBookings()).filter(
      (candidate) => candidate.bookingDate === DAY && candidate.startTime === slot.startTime && candidate.status !== 'cancelled'
    );
    expect(active).toHaveLength(1);
  });

  it('records the late payment as cancelled + paid with its payment intent and the charged amount, for the desk', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned, session } = await cancelAndResell(app);

    const ack = await deliverWebhook(app, latePaymentFor(abandoned.id));

    expect(ack.status).toBe(200);
    expectContract(webhookAck, ack.body);
    const { GET } = await app.routes.bookings();
    const deskView = await readJson(await GET(adminRequest(`/api/bookings?id=${abandoned.id}`)));
    expect(deskView.status).toBe(200);
    expect(deskView.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(session.amountIls).toBeGreaterThan(0);
    expect(expectContract(bookingRecord, deskView.body)).toMatchObject({
      id: abandoned.id,
      bookingReference: abandoned.bookingReference,
      status: 'cancelled',
      paymentStatus: 'paid',
      paymentMethod: 'stripe',
      stripePaymentIntentId: LATE_PAYMENT_INTENT,
      totalIls: session.amountIls,
    });
  });

  it('alerts operators that a refund is owed, naming only the booking reference', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned } = await cancelAndResell(app);

    await deliverWebhook(app, latePaymentFor(abandoned.id));

    // Exact payload: the alert must not carry the customer's email, phone or payment ids.
    expect(logged(error, REFUND_ALERT)).toEqual([[REFUND_ALERT, { bookingReference: abandoned.bookingReference }]]);
  });

  it('sends the customer no booking confirmation for a payment that completed after cancellation', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned } = await cancelAndResell(app);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const ack = await deliverWebhook(app, latePaymentFor(abandoned.id));

    expect(ack.status).toBe(200);
    expect(logged(info, BOOKING_CONFIRMATION_EMAIL)).toHaveLength(0);
    expect((await app.store.getBookingById(abandoned.id))?.confirmationSentAt).toBeUndefined();
  });

  it('keeps showing the customer a cancelled booking on the public lookup after the late payment', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned } = await cancelAndResell(app);

    await deliverWebhook(app, latePaymentFor(abandoned.id));

    const { GET } = await app.routes.bookings();
    const lookup = await readJson(await GET(apiRequest(`/api/bookings?ref=${abandoned.bookingReference}`)));
    expect(lookup.status).toBe(200);
    expect(expectContract(publicBooking, lookup.body)).toMatchObject({ status: 'cancelled', paymentStatus: 'paid' });
  });

  it('treats a replayed late-payment delivery as a no-op: no state change, email or second alert', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { abandoned, replacement } = await cancelAndResell(app);
    const event = latePaymentFor(abandoned.id);
    await deliverWebhook(app, event);
    const recorded = structuredClone(await app.store.getBookingById(abandoned.id));
    expect(recorded).toMatchObject({ status: 'cancelled', paymentStatus: 'paid', stripePaymentIntentId: LATE_PAYMENT_INTENT });
    const replacementBefore = structuredClone(replacement);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const replay = await deliverWebhook(app, event);

    expect(replay.status).toBe(200);
    expectContract(webhookAck, replay.body);
    expect(await app.store.getBookingById(abandoned.id)).toEqual(recorded);
    expect(await app.store.getBookingById(replacement.id)).toEqual(replacementBefore);
    expect(logged(info, BOOKING_CONFIRMATION_EMAIL)).toHaveLength(0);
    expect(logged(error, REFUND_ALERT)).toHaveLength(1);
  });
});

describe('POST /api/webhooks/stripe: gift voucher payment completing after the voucher was voided', () => {
  it('keeps a voided gift voucher inactive, unverifiable and unannounced when its payment completes late', async () => {
    const { app, voucher } = await voidedGiftVoucher();
    expect(voucher).toMatchObject({ paymentStatus: 'refunded', currentBalanceIls: 0 });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const ack = await deliverWebhook(app, lateGiftPaymentFor(voucher.id));

    expect(ack.status).toBe(200);
    expectContract(webhookAck, ack.body);
    // Also proves the desk lists this voucher, so the API-12 expectation below can fail only on the missing record.
    const record = await deskVoucherRecord(app, voucher.id);
    expect(record.paymentStatus).not.toBe('paid');
    expect(record).toMatchObject({ code: voucher.code, currentBalanceIls: 0, isRedeemed: false });
    expect(record.activatedAt).toBeUndefined();
    const verification = await verifyVoucher(app, voucher.code);
    expect(verification.status).toBe(404);
    expect(expectContract(errorBody, verification.body).error).toBe('Invalid voucher code.');
    expect(logged(info, VOUCHER_ACTIVATION_EMAIL)).toHaveLength(0);
  });

  it(
    'records a late payment on a voided gift voucher so the desk can see a refund is owed (API-12)',
    async () => {
      const { app, voucher } = await voidedGiftVoucher();

      const ack = await deliverWebhook(app, lateGiftPaymentFor(voucher.id));

      expect(ack.status).toBe(200);
      expect((await deskVoucherRecord(app, voucher.id)).stripeCheckoutSessionId).toBe(LATE_GIFT_SESSION);
    }
  );
});

describe('Gift voucher purchase lifecycle', () => {
  it('creates a pending, unverifiable voucher and sends Stripe the exact purchase amount', async () => {
    const app = await loadApp({ stripe: 'mocked' });

    const { response, session, voucher } = await purchaseGiftVoucher(app, 750);

    expect(expectContract(stripeCheckoutStarted, response.body).sessionId).toBe('cs_test_mock_1');
    expect(session).toMatchObject({
      amountIls: 750,
      customerEmail: 'gifter@pilots.test',
      successUrl: 'http://localhost:3000/vouchers?purchase=processing&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'http://localhost:3000/vouchers?cancelled=true',
    });
    expect(session.bookingId).toBeUndefined();
    expect(voucher).toMatchObject({
      initialValueIls: 750,
      currentBalanceIls: 0,
      paymentStatus: 'pending',
      isRedeemed: false,
    });
    expectOneYearFromNow(voucher.expiryDate);
    const verification = await verifyVoucher(app, voucher.code);
    expect(verification.status).toBe(404);
    expect(expectContract(errorBody, verification.body).error).toBe('Invalid voucher code.');
  });

  it('activates the voucher with its full balance on a completed webhook and makes it verifiable', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { voucher } = await purchaseGiftVoucher(app, 750);

    const ack = await deliverWebhook(
      app,
      checkoutSessionEvent('checkout.session.completed', { id: 'cs_test_gift_paid', metadata: { voucherId: voucher.id } })
    );

    expect(ack.status).toBe(200);
    expect(await app.store.getVoucherById(voucher.id)).toMatchObject({
      paymentStatus: 'paid',
      currentBalanceIls: 750,
      stripeCheckoutSessionId: 'cs_test_gift_paid',
      activatedAt: new Date().toISOString(),
    });
    const verification = await verifyVoucher(app, voucher.code);
    expect(verification.status).toBe(200);
    expect(verification.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(publicVoucher, verification.body)).toEqual({
      code: voucher.code,
      currentBalanceIls: 750,
      expiryDate: voucher.expiryDate,
    });
  });

  it('activates a gift voucher only once, so a replayed webhook cannot restore a spent balance', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { voucher } = await purchaseGiftVoucher(app, 750);
    const completed = checkoutSessionEvent('checkout.session.completed', { metadata: { voucherId: voucher.id } });
    await deliverWebhook(app, completed);
    const vouchers = await app.routes.vouchers();
    const redeem = await vouchers.PATCH(
      adminRequest('/api/vouchers', { method: 'PATCH', body: { code: voucher.code, amount: 250 } })
    );
    expect(redeem.status).toBe(200);

    const replay = await deliverWebhook(app, completed);

    expect(replay.status).toBe(200);
    expect((await app.store.getVoucherById(voucher.id))?.currentBalanceIls).toBe(500);
  });

  it('sends the activation email exactly once across replayed completed deliveries', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { voucher } = await purchaseGiftVoucher(app);
    const completed = checkoutSessionEvent('checkout.session.completed', { metadata: { voucherId: voucher.id } });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await deliverWebhook(app, completed);
    const replay = await deliverWebhook(app, completed);

    expect(replay.status).toBe(200);
    expect(logged(info, VOUCHER_ACTIVATION_EMAIL)).toEqual([[VOUCHER_ACTIVATION_EMAIL, { voucherId: voucher.id }]]);
    expect((await app.store.getVoucherById(voucher.id))?.confirmationSentAt).toBe(new Date().toISOString());
  });

  it('voids a pending gift voucher when its Checkout session expires', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { voucher } = await purchaseGiftVoucher(app);

    const ack = await deliverWebhook(
      app,
      checkoutSessionEvent('checkout.session.expired', { metadata: { voucherId: voucher.id } })
    );

    expect(ack.status).toBe(200);
    expect(await app.store.getVoucherById(voucher.id)).toMatchObject({ paymentStatus: 'refunded', currentBalanceIls: 0 });
    expect((await verifyVoucher(app, voucher.code)).status).toBe(404);
  });

  it('refuses a gift voucher purchase with 503 and stores nothing when payments are not configured', async () => {
    const app = await loadApp();
    const vouchersBefore = (await app.store.getVouchers()).length;

    const response = await postCheckout(app, voucherCheckoutBody());

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe(
      'Online payments are temporarily unavailable. Please contact us to book.'
    );
    expect((await app.store.getVouchers()).length).toBe(vouchersBefore);
  });

  it('ignores balance, status and code fields injected into a voucher purchase (property)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const injectedKey = fc.constantFrom(
      'currentBalanceIls',
      'initialValueIls',
      'paymentStatus',
      'isRedeemed',
      'code',
      'expiryDate',
      'totalIls',
      'priceIls',
      'stripeCheckoutSessionId'
    );
    const injectedValue = fc.oneof(fc.integer(), fc.string({ maxLength: 24 }), fc.boolean(), fc.constant('paid'));

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 5_000 }),
        fc.dictionary(injectedKey, injectedValue, { minKeys: 1 }),
        async (amountIls, injected) => {
          const sessionsBefore = app.checkoutSessions.length;

          const response = await postCheckout(app, { ...voucherCheckoutBody({ amountIls }), ...injected });

          expect(response.status).toBe(201);
          const session = app.checkoutSessions[sessionsBefore];
          expect(session.amountIls).toBe(amountIls);
          const voucher = await app.store.getVoucherById(session.voucherId ?? '');
          expect(voucher).toMatchObject({ initialValueIls: amountIls, currentBalanceIls: 0, paymentStatus: 'pending', isRedeemed: false });
          expect(voucher?.code).toMatch(/^SD-VOUCH-[A-Z2-9]{18}$/);
          expectOneYearFromNow(voucher?.expiryDate);
        }
      ),
      { numRuns: 30 }
    );
  });
});
