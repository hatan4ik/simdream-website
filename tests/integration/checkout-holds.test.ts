import { describe, expect, it, vi } from 'vitest';
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
 * resumes the hold instead of being blocked by it (409) or creating a second one.
 */

const DAY = EMPTY_DAY.sunday;
const PILOT = 'returning.pilot@holds.test';
const HOLD_CAP = 'You already have unpaid reservations in progress. Complete or cancel one first.';
const SLOT_TAKEN = 'The selected departure slot is no longer available.';

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

  it('replaces the hold when the add-ons change: the old one is cancelled and its checkout expired', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });
    const [oldHold] = await unpaidHolds(app);

    const changed = await startCardCheckout(app, { startTime, addons: ['addon-extra-seat'] });

    expect(changed.response.status).toBe(201);
    expect(changed.session?.sessionId).not.toBe(first.session?.sessionId);
    expect(app.expiredCheckoutSessions).toEqual([first.session?.sessionId]);
    expect((await app.store.getBookingById(oldHold.id))?.status).toBe('cancelled');
    const holds = await unpaidHolds(app);
    expect(holds).toHaveLength(1);
    expect(holds[0]).toMatchObject({ startTime, addons: ['addon-extra-seat'], stripeCheckoutSessionId: changed.session?.sessionId });
  });

  it('replaces the hold when the payable total changes', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });

    // A birthday in the flight month earns the birthday discount, so the same departure costs less.
    const birthday = await startCardCheckout(app, { startTime, pilotBirthDate: '1990-12-01' });

    expect(birthday.response.status).toBe(201);
    expect(app.expiredCheckoutSessions).toEqual([first.session?.sessionId]);
    const [hold] = await unpaidHolds(app);
    expect(hold.stripeCheckoutSessionId).toBe(birthday.session?.sessionId);
    expect(hold.birthdayDiscountIls).toBeGreaterThan(0);
    expect(app.checkoutSessions[1].amountIls).toBeLessThan(app.checkoutSessions[0].amountIls);
  });

  it('replaces the hold when its hosted checkout has expired', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openStart(app);
    const first = await startCardCheckout(app, { startTime });
    vi.setSystemTime(Date.now() + 30 * 60_000);

    const retry = await startCardCheckout(app, { startTime });

    expect(retry.response.status).toBe(201);
    expect(retry.session?.sessionId).not.toBe(first.session?.sessionId);
    expect(app.expiredCheckoutSessions).toEqual([first.session?.sessionId]);
    const holds = await unpaidHolds(app);
    expect(holds.map((hold) => hold.stripeCheckoutSessionId)).toEqual([retry.session?.sessionId]);
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
