import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp } from '../support/app';
import { adminHeaders, apiRequest } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import {
  MAIL_ENV,
  bookingsHolding,
  createPaidVoucher,
  mockMailTransport,
  postCheckout,
  range,
} from './helpers';

const BOOKING_DATE = '2026-11-01';
const RACERS = 5;

afterEach(() => {
  vi.doUnmock('@sendgrid/mail');
});

describe('concurrent checkouts for one departure', () => {
  it('rejects a second checkout for a departure that is already held (sequential control)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    const body = (email: string) =>
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: email });

    const first = await postCheckout(app, body('first@example.test'));
    const second = await postCheckout(app, body('second@example.test'));

    expect(first.status).toBe(201);
    expect(second).toMatchObject({ status: 409, body: { error: 'The selected departure slot is no longer available.' } });
    expect(await bookingsHolding(app, BOOKING_DATE, slot.startTime)).toHaveLength(1);
  });

  // Development-only: production relies on the EXCLUDE USING gist constraint in
  // lib/db/migrations/001_production_hardening.sql, which the in-memory store lacks.
  it('leaves at most one card booking holding a departure when checkouts race (REL-1)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);

    const responses = await Promise.all(
      range(RACERS).map((index) =>
        postCheckout(
          app,
          bookingCheckoutBody({
            packageId: 'pkg-captain-60',
            startTime: slot.startTime,
            pilotEmail: `card-racer-${index}@example.test`,
          })
        )
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(await bookingsHolding(app, BOOKING_DATE, slot.startTime)).toHaveLength(1);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('leaves at most one voucher-funded booking holding a departure when checkouts race (REL-1)', async () => {
    const app = await loadApp();
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const vouchers = await Promise.all(range(RACERS).map(() => createPaidVoucher(app, 500)));

    const responses = await Promise.all(
      vouchers.map((voucher, index) =>
        postCheckout(
          app,
          bookingCheckoutBody({
            startTime: slot.startTime,
            voucherCode: voucher.code,
            pilotEmail: `voucher-racer-${index}@example.test`,
          })
        )
      )
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(await bookingsHolding(app, BOOKING_DATE, slot.startTime)).toHaveLength(1);
    // Losing racers must not be charged.
    const balances = await Promise.all(vouchers.map(async (voucher) => (await app.store.getVoucherByCode(voucher.code))?.currentBalanceIls));
    expect(balances.filter((balance) => balance === 500)).toHaveLength(RACERS - 1);
  });
});

describe('concurrent webhook deliveries', () => {
  it('confirms a booking once and sends one confirmation when a completed event arrives concurrently', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    const started = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'dupe@example.test' })
    );
    expect(started.status).toBe(201);
    const bookingId = app.checkoutSessions[0].bookingId!;
    const event = checkoutSessionEvent('checkout.session.completed', {
      payment_intent: 'pi_test_concurrent',
      metadata: { bookingId },
    });
    const webhook = await app.routes.stripeWebhook();

    const responses = await Promise.all(range(RACERS).map(() => webhook.POST(signedWebhookRequest(event))));

    // A duplicate that finds the email in flight answers 503 so Stripe redelivers it;
    // acknowledging it would lose the email if the sending delivery crashed (GAP-3).
    const statuses = responses.map((response) => response.status);
    expect(statuses).toContain(200);
    expect(statuses.filter((status) => status !== 200 && status !== 503)).toEqual([]);
    const redelivery = await webhook.POST(signedWebhookRequest(event));
    expect(redelivery.status).toBe(200);
    const booking = await app.store.getBookingById(bookingId);
    expect(booking).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', stripePaymentIntentId: 'pi_test_concurrent' });
    expect(mail.confirmationsFor(booking!.bookingReference)).toBe(1);
  });

  it('keeps redelivering, rather than acknowledging, while an abandoned confirmation claim is fresh (GAP-3)', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    await postCheckout(app, bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: 'crash@example.test' }));
    const bookingId = app.checkoutSessions[0].bookingId!;
    const event = checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } });
    const webhook = await app.routes.stripeWebhook();
    // A delivery that confirmed the booking and claimed the email, then crashed before sending.
    await app.store.markBookingPaidIfPending(bookingId, 'pi_test_crash');
    expect(await app.store.claimConfirmation('booking', bookingId)).toBe('claimed');
    const booking = (await app.store.getBookingById(bookingId))!;

    const withinTtl = await webhook.POST(signedWebhookRequest(event));
    expect(withinTtl.status).toBe(503);
    expect(mail.confirmationsFor(booking.bookingReference)).toBe(0);

    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    const afterTtl = await webhook.POST(signedWebhookRequest(event));
    expect(afterTtl.status).toBe(200);
    expect(mail.confirmationsFor(booking.bookingReference)).toBe(1);
  });

  it('activates a gift voucher once and emails the recipient once when a completed event arrives concurrently', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const started = await postCheckout(app, {
      kind: 'voucher',
      amountIls: 650,
      recipientName: 'Concurrent Recipient',
      recipientEmail: 'concurrent-recipient@example.test',
      senderName: 'Concurrent Sender',
      senderEmail: 'concurrent-sender@example.test',
      personalMessage: '',
    });
    expect(started.status).toBe(201);
    const voucherId = app.checkoutSessions[0].voucherId!;
    const event = checkoutSessionEvent('checkout.session.completed', { metadata: { voucherId } });
    const webhook = await app.routes.stripeWebhook();

    const responses = await Promise.all(range(RACERS).map(() => webhook.POST(signedWebhookRequest(event))));

    const statuses = responses.map((response) => response.status);
    expect(statuses).toContain(200);
    expect(statuses.filter((status) => status !== 200 && status !== 503)).toEqual([]);
    expect((await webhook.POST(signedWebhookRequest(event))).status).toBe(200);
    expect(await app.store.getVoucherById(voucherId)).toMatchObject({ paymentStatus: 'paid', currentBalanceIls: 650 });
    expect(mail.activationsTo('concurrent-recipient@example.test')).toBe(1);
  });
});

describe('concurrent voucher redemptions', () => {
  it('never overdraws a voucher when admin redemptions race (property)', async () => {
    const app = await loadApp();
    const { PATCH } = await app.routes.vouchers();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1_500 }),
        fc.array(fc.integer({ min: 1, max: 700 }), { minLength: 2, maxLength: 12 }),
        async (initialValue, amounts) => {
          const voucher = await createPaidVoucher(app, initialValue);

          const results = await Promise.all(
            amounts.map(async (amount) => {
              const response = await PATCH(
                apiRequest('/api/vouchers', { method: 'PATCH', body: { code: voucher.code, amount }, headers: adminHeaders() })
              );
              return { amount, status: response.status };
            })
          );

          const after = await app.store.getVoucherByCode(voucher.code);
          const accepted = results.filter((result) => result.status === 200);
          const rejected = results.filter((result) => result.status !== 200);
          const redeemed = accepted.reduce((total, result) => total + result.amount, 0);

          expect(rejected.every((result) => result.status === 409)).toBe(true);
          expect(redeemed).toBeLessThanOrEqual(initialValue);
          expect(after?.currentBalanceIls).toBe(initialValue - redeemed);
          expect(after?.isRedeemed).toBe(after?.currentBalanceIls === 0);
          // Liveness: a redemption that fits is never refused, and refusals are genuine.
          expect(accepted.length > 0 || Math.min(...amounts) > initialValue).toBe(true);
          expect(rejected.every((result) => result.amount > (after?.currentBalanceIls ?? 0))).toBe(true);
        }
      ),
      { numRuns: 40 }
    );
  });

  it('debits a shared voucher no further than its balance when voucher-funded checkouts race', async () => {
    const app = await loadApp();
    const voucher = await createPaidVoucher(app, 600);
    const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'];
    const slots = await Promise.all(dates.map((date) => findOpenSlot(app, date, 20)));

    const responses = await Promise.all(
      slots.map((slot, index) =>
        postCheckout(
          app,
          bookingCheckoutBody({
            bookingDate: dates[index],
            startTime: slot.startTime,
            voucherCode: voucher.code,
            pilotEmail: `shared-voucher-${index}@example.test`,
          })
        )
      )
    );

    const after = await app.store.getVoucherByCode(voucher.code);
    const funded = (await app.store.getBookings()).filter(
      (booking) => booking.voucherCode === voucher.code && booking.status !== 'cancelled'
    );
    // A fully voucher-funded booking records the voucher deduction as its discount.
    const debited = funded.reduce((total, booking) => total + booking.discountIls, 0);
    const losingDates = dates.filter((_, index) => responses[index].status === 409);

    expect(funded.length).toBeGreaterThan(0);
    expect(losingDates.length).toBeGreaterThan(0);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(funded.length);
    expect(losingDates).toHaveLength(dates.length - funded.length);
    expect(debited).toBeLessThanOrEqual(600);
    expect(after?.currentBalanceIls).toBe(600 - debited);
    // A refused racer must not keep its departure on hold.
    const heldByLosers = await Promise.all(
      losingDates.map((date) => bookingsHolding(app, date, slots[dates.indexOf(date)].startTime))
    );
    expect(heldByLosers.flat()).toEqual([]);
  });
});
