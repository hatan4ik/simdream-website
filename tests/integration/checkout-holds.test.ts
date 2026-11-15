import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, loadApp, type TestApp } from '../support/app';
import { checkoutSessionEvent } from '../support/stripe';
import {
  adminRequest,
  deliverWebhook,
  EMPTY_DAY,
  findSlotWhere,
  postCheckout,
  SEED_VOUCHER,
} from './api-helpers';
import { booking as bookingContract, errorBody, expectContract, stripeCheckoutStarted } from './contracts';
import { readJson } from '../support/http';

/**
 * Unpaid card holds (lib/booking/checkout-hold-policy.ts): one pilot email may hold at most two
 * unpaid pending bookings, and a pilot who returns from Stripe and submits the same departure again
 * resumes the hold instead of being blocked by it or creating a second one. The email is not verified,
 * so a retry never releases a live hold: only a hold whose checkout Stripe confirms expired is replaced.
 */

const DAY = EMPTY_DAY.sunday;
const PILOT = 'returning.pilot@holds.test';
const HOLD_CAP =
  'You already have unpaid reservations in progress. Complete one of those payments, or wait up to 30 minutes for one to expire.';
const CHECKOUT_NOT_STORED = 'Hosted checkout not stored on its hold; checkout continues without resume.';
const SLOT_TAKEN = 'The selected departure slot is no longer available.';
const HOLD_IN_PROGRESS =
  'You already have an unpaid reservation for this departure. Complete that payment, or wait until it expires to change it.';
const ALREADY_PAID = 'This departure is already paid. Your confirmation is on its way.';

async function openStart(app: TestApp, durationMinutes = 30): Promise<string> {
  return (await findSlotWhere(app, DAY, durationMinutes, (candidate) => candidate.available, 'open')).startTime;
}

async function startCardCheckout(app: TestApp, overrides: Record<string, unknown>) {
  const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, pilotEmail: PILOT, ...overrides }));
  return { response, session: response.status === 201 ? expectContract(stripeCheckoutStarted, response.body) : undefined };
}

async function unpaidHolds(app: TestApp, email = PILOT) {
  return (await app.store.getBookingsByEmail(email)).filter(
    (booking) => booking.status === 'pending' && booking.paymentStatus === 'pending'
  );
}

describe('POST /api/checkout: stored hosted checkout', () => {
  it('remembers the hosted checkout on the pending booking and shows it to the desk', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { session } = await startCardCheckout(app, { startTime: await openStart(app) });

    const [hold] = await unpaidHolds(app);
    expect(hold).toMatchObject({
      stripeCheckoutSessionId: session?.sessionId,
      stripeCheckoutUrl: session?.url,
      stripeCheckoutExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });

    const { GET } = await app.routes.bookings();
    const desk = await readJson(await GET(adminRequest(`/api/bookings?id=${hold.id}`)));
    expect(desk.status).toBe(200);
    expectContract(bookingContract, desk.body);
  });

  describe('when the hosted checkout cannot be stored (for example before migration 013)', () => {
    afterEach(() => {
      vi.doUnmock('@/lib/db/checkout-hold-store');
    });

    it('still sends the pilot to Stripe, keeps the hold pending, and logs one fixed line', async () => {
      // The Supabase adapter's refusal of a write to columns that do not exist yet.
      vi.doMock('@/lib/db/checkout-hold-store', async (importOriginal) => ({
        ...(await importOriginal<typeof import('@/lib/db/checkout-hold-store')>()),
        attachHostedCheckout: async () => {
          throw new (await import('@/lib/db/store')).PersistenceError('Persistent storage operation failed.');
        },
      }));
      const app = await loadApp({ stripe: 'mocked' });
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const startTime = await openStart(app);

      const { response, session } = await startCardCheckout(app, { startTime });

      expect(response.status).toBe(201);
      expect(session?.url).toBe(`https://checkout.stripe.com/c/pay/${session?.sessionId}`);
      const [hold] = await unpaidHolds(app);
      expect(hold).toMatchObject({ startTime, status: 'pending', paymentStatus: 'pending' });
      expect(hold.stripeCheckoutSessionId).toBeUndefined();
      expect(app.expiredCheckoutSessions).toEqual([]);
      expect(log.mock.calls).toEqual([[CHECKOUT_NOT_STORED]]);

      // Without a stored checkout nothing can be verified, so the same pilot's retry waits for Stripe's expiry.
      const retry = await startCardCheckout(app, { startTime });

      expect(retry.response.status).toBe(409);
      expect(expectContract(errorBody, retry.response.body).error).toBe(HOLD_IN_PROGRESS);
      expect(await unpaidHolds(app)).toEqual([hold]);
      expect(app.checkoutSessions).toHaveLength(1);
      expect(app.expiredCheckoutSessions).toEqual([]);
    });
  });
});

describe('POST /api/checkout: concurrent unpaid holds per email', () => {
  it('refuses a third unpaid hold for one normalized email, and allows it again once one is released', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const first = await startCardCheckout(app, { startTime: await openStart(app) });
    const second = await startCardCheckout(app, { startTime: await openStart(app) });
    expect([first.response.status, second.response.status]).toEqual([201, 201]);
    const third = bookingCheckoutBody({ bookingDate: DAY, startTime: await openStart(app), pilotEmail: '  Returning.Pilot@HOLDS.test ' });
    const bookingsBefore = (await app.store.getBookings()).length;

    const refused = await postCheckout(app, third);

    expect(refused.status).toBe(429);
    expect(expectContract(errorBody, refused.body).error).toBe(HOLD_CAP);
    expect(refused.headers.get('cache-control')).toBe('no-store');
    expect(refused.headers.get('retry-after')).toBeNull();
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect(app.checkoutSessions).toHaveLength(2);

    const [released] = await unpaidHolds(app);
    await deliverWebhook(app, checkoutSessionEvent('checkout.session.expired', { metadata: { bookingId: released.id } }));

    const allowed = await postCheckout(app, third);
    expect(allowed.status).toBe(201);
    expect(await unpaidHolds(app)).toHaveLength(2);
  });

  it('does not count paid bookings, and lets a voucher pay for a third departure', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    await startCardCheckout(app, { startTime: await openStart(app) });
    await startCardCheckout(app, { startTime: await openStart(app) });

    const voucherFunded = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: await openStart(app), pilotEmail: PILOT, voucherCode: SEED_VOUCHER.code })
    );
    expect(voucherFunded.status).toBe(201);

    const [paid] = await unpaidHolds(app);
    await deliverWebhook(app, checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: paid.id } }));
    const afterPayment = await startCardCheckout(app, { startTime: await openStart(app) });
    expect(afterPayment.response.status).toBe(201);
  });

  it('does not count pending bookings that are not card checkouts', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    // Bookings the desk entered by hand for this pilot: pending and unpaid, but never a card checkout's hold.
    for (const [startTime, endTime] of [['09:00', '09:30'], ['12:00', '12:30']]) {
      await app.store.createBooking({
        packageId: 'pkg-discovery-30',
        packageTitle: 'Discovery Flight',
        durationMinutes: 30,
        bookingDate: EMPTY_DAY.saturday,
        startTime,
        endTime,
        pilotName: 'Returning Pilot',
        pilotEmail: PILOT,
        pilotPhone: '+972501234567',
        experienceLevel: 'beginner',
        addons: [],
        subtotalIls: 450,
        discountIls: 0,
        totalIls: 450,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'desk',
      });
    }

    const first = await startCardCheckout(app, { startTime: await openStart(app) });
    const second = await startCardCheckout(app, { startTime: await openStart(app) });
    const third = await startCardCheckout(app, { startTime: await openStart(app) });

    expect([first.response.status, second.response.status]).toEqual([201, 201]);
    // The two card holds still reach the cap.
    expect(third.response.status).toBe(429);
    expect(expectContract(errorBody, third.response.body).error).toBe(HOLD_CAP);
  });
});

describe('POST /api/checkout: a returning pilot retries the departure they hold', () => {
  it('resumes the same open hosted checkout and keeps exactly one hold', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime, addons: ['addon-extra-seat'] });

    const retry = await startCardCheckout(app, { startTime, addons: ['addon-extra-seat'], pilotEmail: 'Returning.Pilot@holds.test' });

    expect(retry.response.status).toBe(201);
    expect(retry.session).toEqual(first.session);
    expect(app.checkoutSessions).toHaveLength(1);
    expect(app.expiredCheckoutSessions).toEqual([]);
    expect(await unpaidHolds(app)).toHaveLength(1);
  });

  it.each([
    ['different add-ons', { addons: ['addon-extra-seat'] }],
    // A birthday in the flight month earns the birthday discount, so the same departure would cost less.
    ['a different payable total', { pilotBirthDate: '1990-12-01' }],
  ])('leaves a live hold and its open checkout untouched when a retry asks for %s', async (_label, retry) => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });
    // A copy: the in-memory store hands out its live records.
    const [original] = structuredClone(await unpaidHolds(app));

    const differing = await startCardCheckout(app, { startTime, ...retry });

    expect(differing.response.status).toBe(409);
    expect(expectContract(errorBody, differing.response.body).error).toBe(HOLD_IN_PROGRESS);
    expect(await unpaidHolds(app)).toEqual([original]);
    expect(original).toMatchObject({ addons: [], stripeCheckoutSessionId: first.session?.sessionId, stripeCheckoutUrl: first.session?.url });
    expect(app.checkoutSessions).toHaveLength(1);
    expect(app.expiredCheckoutSessions).toEqual([]);
  });

  it('releases and replaces a hold whose checkout has expired, whatever the retry asks for', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });
    const [oldHold] = await unpaidHolds(app);
    vi.setSystemTime(Date.now() + 30 * 60_000);

    const retry = await startCardCheckout(app, { startTime, addons: ['addon-extra-seat'] });

    expect(retry.response.status).toBe(201);
    expect(retry.session?.sessionId).not.toBe(first.session?.sessionId);
    expect(app.expiredCheckoutSessions).toEqual([first.session?.sessionId]);
    expect((await app.store.getBookingById(oldHold.id))?.status).toBe('cancelled');
    const holds = await unpaidHolds(app);
    expect(holds).toHaveLength(1);
    expect(holds[0]).toMatchObject({ startTime, addons: ['addon-extra-seat'], stripeCheckoutSessionId: retry.session?.sessionId });
  });

  it('never releases a hold whose expired-looking checkout Stripe reports already paid', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });
    const [paidHold] = structuredClone(await unpaidHolds(app));
    vi.setSystemTime(Date.now() + 30 * 60_000);
    app.stripeControls.expireOutcome = 'complete';

    const retry = await startCardCheckout(app, { startTime, addons: ['addon-extra-seat'] });

    expect(retry.response.status).toBe(409);
    expect(expectContract(errorBody, retry.response.body).error).toBe(ALREADY_PAID);
    expect(app.expiredCheckoutSessions).toEqual([first.session?.sessionId]);
    expect(await unpaidHolds(app)).toEqual([paidHold]);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('keeps the hold and answers 503 when Stripe cannot confirm that its checkout expired', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const startTime = await openStart(app);
    await startCardCheckout(app, { startTime });
    const [hold] = structuredClone(await unpaidHolds(app));
    vi.setSystemTime(Date.now() + 30 * 60_000);
    app.stripeControls.expireOutcome = new Error('Stripe API unreachable');

    const retry = await startCardCheckout(app, { startTime });

    expect(retry.response.status).toBe(503);
    expect(expectContract(errorBody, retry.response.body).error).toBe('Unable to start checkout. Please try again.');
    expect(await unpaidHolds(app)).toEqual([hold]);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('keeps the 409 for a different email on a held departure', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    await startCardCheckout(app, { startTime });

    const other = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime, pilotEmail: 'someone.else@holds.test' }));

    expect(other.status).toBe(409);
    expect(expectContract(errorBody, other.body).error).toBe(SLOT_TAKEN);
    expect(await unpaidHolds(app, 'someone.else@holds.test')).toEqual([]);
    expect(app.checkoutSessions).toHaveLength(1);
    expect(app.expiredCheckoutSessions).toEqual([]);
  });

  it('keeps the 409 for a voucher-funded retry of a departure the same pilot holds unpaid', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    await startCardCheckout(app, { startTime });

    const voucherFunded = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime, pilotEmail: PILOT, voucherCode: SEED_VOUCHER.code })
    );

    expect(voucherFunded.status).toBe(409);
    expect(await unpaidHolds(app)).toHaveLength(1);
    expect(app.expiredCheckoutSessions).toEqual([]);
  });
});
