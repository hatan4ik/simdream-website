import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, bearer, readJson, routeParams } from '../support/http';
import { checkoutSessionEvent } from '../support/stripe';
import {
  createPendingCardBooking,
  createVoucherFundedBooking,
  deliverWebhook,
  EMPTY_DAY,
  MEMBERS,
  type MemberToken,
  PRIVATE_NO_STORE,
  SEED_FULL_VOUCHER,
} from './api-helpers';
import { booking as bookingContract, errorBody, expectContract, membershipBootstrap, paymentReceipt } from './contracts';

const DAY = EMPTY_DAY.sunday;
const ADA = MEMBERS['token-ada'];
const GRACE = MEMBERS['token-grace'];

async function myBookings(app: TestApp, headers: Record<string, string>) {
  const { GET } = await app.routes.myBookings();
  return readJson(await GET(apiRequest('/api/my-bookings', { headers })));
}

async function bootstrap(app: TestApp, headers: Record<string, string>) {
  const { POST } = await app.routes.membershipBootstrap();
  return readJson(await POST(apiRequest('/api/membership/bootstrap', { method: 'POST', headers })));
}

async function receipt(app: TestApp, reference: string, headers: Record<string, string>) {
  const { GET } = await app.routes.myBookingReceipt();
  return readJson(
    await GET(
      apiRequest(`/api/my-bookings/${encodeURIComponent(reference)}/receipt`, { headers }),
      routeParams({ bookingReference: reference })
    )
  );
}

function as(token: MemberToken) {
  return bearer(token);
}

/** A Stripe-paid booking arranged through the store, for runs where Stripe itself is not configured. */
async function storePaidCardBooking(app: TestApp, member: { id: string; email: string }) {
  const created = await app.store.createBooking({
    userId: member.id,
    packageId: 'pkg-captain-60',
    packageTitle: "Captain's Command Flight",
    durationMinutes: 60,
    bookingDate: DAY,
    startTime: '10:00',
    endTime: '11:00',
    pilotName: 'Ada Lovelace',
    pilotEmail: member.email,
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner',
    addons: [],
    subtotalIls: 690,
    discountIls: 0,
    totalIls: 690,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'stripe',
  });
  const paid = await app.store.markBookingPaidIfPending(created.id, 'pi_test_store_paid');
  if (!paid) throw new Error('Could not arrange a paid card booking');
  return paid;
}

async function stubStripeReceipt(latestCharge: { receipt_url: string | null } | null) {
  const { stripe } = await import('@/lib/stripe');
  if (!stripe) throw new Error('Stripe client is not configured for this test app');
  return vi
    .spyOn(stripe.paymentIntents, 'retrieve')
    .mockResolvedValue({ id: 'pi_stubbed', latest_charge: latestCharge } as unknown as Stripe.Response<Stripe.PaymentIntent>);
}

describe('POST /api/checkout as a signed-in member', () => {
  it('attaches the booking to a verified member who checks out with their own email', async () => {
    const app = await loadApp({ members: MEMBERS });

    const created = await createVoucherFundedBooking(app, {
      date: DAY,
      pilotEmail: ADA.email.toUpperCase(),
      headers: as('token-ada'),
    });

    expect(created.userId).toBe(ADA.id);
    expect(await app.store.getUser(ADA.email)).toMatchObject({ id: ADA.id, fullName: ADA.fullName });
  });

  it.each([
    { name: 'a verified member buying for a different email', token: 'token-ada' as const, pilotEmail: 'friend@pilots.test' },
    { name: 'an unverified member', token: 'token-unverified' as const, pilotEmail: MEMBERS['token-unverified'].email },
  ])('leaves the booking unattached for $name', async ({ token, pilotEmail }) => {
    const app = await loadApp({ members: MEMBERS });

    const created = await createVoucherFundedBooking(app, { date: DAY, pilotEmail, headers: as(token) });

    expect(created.userId).toBeUndefined();
  });
});

describe('GET /api/my-bookings', () => {
  it("returns a verified member's bookings privately, claiming paid guest bookings made with the same email", async () => {
    const app = await loadApp({ members: MEMBERS });
    const adaGuestBooking = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: 'Ada@Pilots.TEST' });
    const graceBooking = await createVoucherFundedBooking(app, {
      date: DAY,
      pilotEmail: GRACE.email,
      voucherCode: SEED_FULL_VOUCHER.code,
    });

    const response = await myBookings(app, as('token-ada'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const bookings = expectContract(bookingContract.array(), response.body);
    expect(bookings.map((item) => item.bookingReference)).toEqual([adaGuestBooking.bookingReference]);
    expect(bookings[0].userId).toBe(ADA.id);
    expect((await app.store.getBookingById(graceBooking.id))?.userId).toBeUndefined();
  });

  it('does not claim a guest booking that is still unpaid', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking: pending } = await createPendingCardBooking(app, { date: DAY, pilotEmail: ADA.email });

    const response = await myBookings(app, as('token-ada'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect((await app.store.getBookingById(pending.id))?.userId).toBeUndefined();
  });

  it('refuses an unverified member with 403 and claims nothing', async () => {
    const app = await loadApp({ members: MEMBERS });
    const guest = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: MEMBERS['token-unverified'].email });

    const response = await myBookings(app, as('token-unverified'));

    expect(response.status).toBe(403);
    expect(expectContract(errorBody, response.body).error).toBe('Confirm your email address to access member purchases.');
    expect((await app.store.getBookingById(guest.id))?.userId).toBeUndefined();
  });

  it.each([
    { name: 'no credentials', headers: {} },
    { name: 'an unknown bearer token', headers: bearer('token-revoked') },
  ])('answers 401 to $name', async ({ headers }) => {
    const app = await loadApp({ members: MEMBERS });

    const response = await myBookings(app, headers);

    expect(response.status).toBe(401);
    expect(expectContract(errorBody, response.body).error).toBe('Authentication required.');
  });

  it('serves the x-simdream-demo-email mailbox in development', async () => {
    const app = await loadApp();
    const expected = await app.store.getBookingsByEmail('pilot@simdream.co.il');
    expect(expected.length).toBeGreaterThan(0);

    const response = await myBookings(app, { 'x-simdream-demo-email': 'Pilot@SimDream.co.il' });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(bookingContract.array(), response.body).map((item) => item.id)).toEqual(expected.map((item) => item.id));
  });

  it('ignores the x-simdream-demo-email header under production rules', async () => {
    const app = await loadApp({ env: { NODE_ENV: 'production' } });

    const response = await myBookings(app, { 'x-simdream-demo-email': 'pilot@simdream.co.il' });

    expect(response.status).toBe(401);
    expectContract(errorBody, response.body);
  });
});

describe('POST /api/membership/bootstrap', () => {
  it('activates membership, creates the profile and claims paid guest bookings on the first call', async () => {
    const app = await loadApp({ members: MEMBERS });
    const guest = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: ADA.email });

    const response = await bootstrap(app, as('token-ada'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(membershipBootstrap, response.body)).toEqual({
      memberActive: true,
      linkedGuestBookings: 1,
      hasPurchaseHistory: true,
    });
    expect((await app.store.getBookingById(guest.id))?.userId).toBe(ADA.id);
    expect(await app.store.getUser(ADA.email)).toMatchObject({ id: ADA.id, role: 'user' });
  });

  it('is idempotent: a repeated call claims nothing new and creates no second profile', async () => {
    const app = await loadApp({ members: MEMBERS });
    await createVoucherFundedBooking(app, { date: DAY, pilotEmail: ADA.email });
    await bootstrap(app, as('token-ada'));

    const response = await bootstrap(app, as('token-ada'));

    expect(response.status).toBe(200);
    expect(expectContract(membershipBootstrap, response.body)).toEqual({
      memberActive: true,
      linkedGuestBookings: 0,
      hasPurchaseHistory: true,
    });
    expect((await app.store.getAllUsers()).filter((user) => user.id === ADA.id)).toHaveLength(1);
  });

  it('reports no purchase history for a member without bookings', async () => {
    const app = await loadApp({ members: MEMBERS });

    const response = await bootstrap(app, as('token-grace'));

    expect(response.status).toBe(200);
    expect(expectContract(membershipBootstrap, response.body)).toEqual({
      memberActive: true,
      linkedGuestBookings: 0,
      hasPurchaseHistory: false,
    });
  });

  it.each([
    { name: 'an anonymous caller', headers: {}, status: 401 },
    { name: 'an unverified member', headers: bearer('token-unverified'), status: 403 },
  ])('refuses $name with $status', async ({ headers, status }) => {
    const app = await loadApp({ members: MEMBERS });
    const usersBefore = (await app.store.getAllUsers()).length;

    const response = await bootstrap(app, headers);

    expect(response.status).toBe(status);
    expectContract(errorBody, response.body);
    expect((await app.store.getAllUsers()).length).toBe(usersBefore);
  });
});

describe('GET /api/my-bookings/[bookingReference]/receipt', () => {
  it.each([
    { name: 'an anonymous caller', headers: {} },
    { name: 'an unverified member', headers: bearer('token-unverified') },
  ])('answers 401 to $name', async ({ headers }) => {
    const app = await loadApp({ members: MEMBERS });

    const response = await receipt(app, 'SD-737-ABCDEFGHJKLMNPQR', headers);

    expect(response.status).toBe(401);
    expect(expectContract(errorBody, response.body).error).toBe('Authentication with a confirmed email is required.');
  });

  it('answers 404 to a malformed reference', async () => {
    const app = await loadApp({ members: MEMBERS });

    const response = await receipt(app, 'SD-737-123', as('token-ada'));

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found.');
  });

  it("answers 404 for another member's booking", async () => {
    const app = await loadApp({ members: MEMBERS });
    const graces = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: GRACE.email, headers: as('token-grace') });
    expect(graces.userId).toBe(GRACE.id);

    const response = await receipt(app, graces.bookingReference, as('token-ada'));

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found.');
  });

  it('answers 409 for a booking paid with a voucher', async () => {
    const app = await loadApp({ members: MEMBERS });
    const own = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: ADA.email, headers: as('token-ada') });

    const response = await receipt(app, own.bookingReference, as('token-ada'));

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('A Stripe payment receipt is not available for this booking.');
  });

  it('answers 409 while a card booking is still unpaid', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking } = await createPendingCardBooking(app, { date: DAY, pilotEmail: ADA.email, headers: as('token-ada') });
    expect(booking.userId).toBe(ADA.id);

    const response = await receipt(app, booking.bookingReference, as('token-ada'));

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('A Stripe payment receipt is not available for this booking.');
  });

  it('answers 503 when Stripe is not configured', async () => {
    const app = await loadApp({ members: MEMBERS });
    const paid = await storePaidCardBooking(app, ADA);

    const response = await receipt(app, paid.bookingReference, as('token-ada'));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe('Payment receipt is temporarily unavailable.');
  });

  it("returns the Stripe receipt URL privately for the owner's paid card booking", async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking } = await createPendingCardBooking(app, { date: DAY, pilotEmail: ADA.email, headers: as('token-ada') });
    await deliverWebhook(
      app,
      checkoutSessionEvent('checkout.session.completed', { payment_intent: 'pi_receipt_owner', metadata: { bookingId: booking.id } })
    );
    const retrieve = await stubStripeReceipt({ receipt_url: 'https://pay.stripe.com/receipts/r_owner' });

    const response = await receipt(app, booking.bookingReference, as('token-ada'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(paymentReceipt, response.body)).toEqual({ receiptUrl: 'https://pay.stripe.com/receipts/r_owner' });
    expect(retrieve).toHaveBeenCalledWith('pi_receipt_owner', { expand: ['latest_charge'] });
  });

  it('claims a paid guest booking before checking receipt ownership', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking } = await createPendingCardBooking(app, { date: DAY, pilotEmail: ADA.email });
    await deliverWebhook(app, checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } }));
    await stubStripeReceipt({ receipt_url: 'https://pay.stripe.com/receipts/r_guest' });

    const response = await receipt(app, booking.bookingReference, as('token-ada'));

    expect(response.status).toBe(200);
    expect(expectContract(paymentReceipt, response.body).receiptUrl).toBe('https://pay.stripe.com/receipts/r_guest');
    expect((await app.store.getBookingById(booking.id))?.userId).toBe(ADA.id);
  });

  it('answers 404 while Stripe has not published a receipt yet', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking } = await createPendingCardBooking(app, { date: DAY, pilotEmail: ADA.email, headers: as('token-ada') });
    await deliverWebhook(app, checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: booking.id } }));
    await stubStripeReceipt(null);

    const response = await receipt(app, booking.bookingReference, as('token-ada'));

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Stripe has not published a receipt for this payment yet.');
  });

  it('does not reveal a receipt to a member whose email matches only an unpaid guest booking', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { booking } = await createPendingCardBooking(app, { date: DAY, pilotEmail: GRACE.email });
    const retrieve = await stubStripeReceipt({ receipt_url: 'https://pay.stripe.com/receipts/r_unpaid' });

    const response = await receipt(app, booking.bookingReference, as('token-grace'));

    expect(response.status).toBe(404);
    expect(retrieve).not.toHaveBeenCalled();
  });
});
