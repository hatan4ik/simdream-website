import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import type { Booking } from '@/types';
import { bookingCheckoutBody, findOpenSlot, loadApp, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, bearer, readJson } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import { MAIL_ENV, bookingsHolding, createPaidVoucher, mockMailTransport, postCheckout, range } from './helpers';

const BOOKING_DATE = '2026-11-01';
const MEMBER_TOKEN = 'member-idempotency-token';
// Seed data holds paid guest bookings for this pilot.
const SEEDED_GUEST: VerifiedMemberIdentity = {
  id: 'member-sarah',
  email: 'sarah.levi@gmail.com',
  emailVerified: true,
  fullName: 'Sarah Levi',
};

interface BootstrapBody {
  memberActive: boolean;
  linkedGuestBookings: number;
  hasPurchaseHistory: boolean;
}

afterEach(() => {
  vi.doUnmock('@sendgrid/mail');
});

const loadMemberApp = (member: VerifiedMemberIdentity = SEEDED_GUEST) =>
  loadApp({ stripe: 'mocked', members: { [MEMBER_TOKEN]: member } });

async function bootstrap(app: TestApp) {
  const { POST } = await app.routes.membershipBootstrap();
  return readJson<BootstrapBody>(
    await POST(apiRequest('/api/membership/bootstrap', { method: 'POST', headers: bearer(MEMBER_TOKEN) }))
  );
}

async function claimableGuestBookings(app: TestApp, email: string): Promise<Booking[]> {
  return (await app.store.getBookingsByEmail(email)).filter((booking) => !booking.userId && booking.paymentStatus === 'paid');
}

async function profilesFor(app: TestApp, memberId: string) {
  return (await app.store.getAllUsers()).filter((user) => user.id === memberId);
}

describe('membership bootstrap', () => {
  it('links guest bookings on the first call and changes nothing on repeat calls', async () => {
    const app = await loadMemberApp();
    const claimable = await claimableGuestBookings(app, SEEDED_GUEST.email);
    expect(claimable.length).toBeGreaterThan(0);

    const first = await bootstrap(app);
    const second = await bootstrap(app);
    const third = await bootstrap(app);

    expect(first.body).toEqual({ memberActive: true, linkedGuestBookings: claimable.length, hasPurchaseHistory: true });
    expect([second.body, third.body]).toEqual([
      { memberActive: true, linkedGuestBookings: 0, hasPurchaseHistory: true },
      { memberActive: true, linkedGuestBookings: 0, hasPurchaseHistory: true },
    ]);
    expect(await app.store.getBookingsForMember(SEEDED_GUEST.id)).toHaveLength(claimable.length);
    expect(await profilesFor(app, SEEDED_GUEST.id)).toHaveLength(1);
  });

  it('links each guest booking exactly once when bootstrap calls race', async () => {
    const app = await loadMemberApp();
    const claimable = await claimableGuestBookings(app, SEEDED_GUEST.email);
    expect(claimable.length).toBeGreaterThan(0);

    const responses = await Promise.all(range(5).map(() => bootstrap(app)));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(responses.reduce((total, response) => total + response.body.linkedGuestBookings, 0)).toBe(claimable.length);
    expect(await profilesFor(app, SEEDED_GUEST.id)).toHaveLength(1);
  });

  it('treats differently cased spellings of the verified email as the same member', async () => {
    const app = await loadMemberApp({ ...SEEDED_GUEST, email: '  Sarah.Levi@Gmail.COM ' });
    const claimable = await claimableGuestBookings(app, SEEDED_GUEST.email);
    expect(claimable.length).toBeGreaterThan(0);

    const first = await bootstrap(app);
    const repeat = await bootstrap(app);

    expect(first.body.linkedGuestBookings).toBe(claimable.length);
    expect(repeat.body.linkedGuestBookings).toBe(0);
    expect(await profilesFor(app, SEEDED_GUEST.id)).toEqual([expect.objectContaining({ email: SEEDED_GUEST.email })]);
  });

  it('links an unpaid guest booking only after payment, and only once', async () => {
    const newcomer: VerifiedMemberIdentity = { id: 'member-newcomer', email: 'newcomer@example.test', emailVerified: true };
    const app = await loadMemberApp(newcomer);
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    // Checked out as a guest (no bearer token) before the account existed.
    const started = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail: newcomer.email })
    );
    expect(started.status).toBe(201);
    const bookingId = app.checkoutSessions[0].bookingId!;

    const beforePayment = await bootstrap(app);
    const webhook = await app.routes.stripeWebhook();
    await webhook.POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } })));
    const afterPayment = await bootstrap(app);
    const repeat = await bootstrap(app);

    expect(beforePayment.body).toMatchObject({ linkedGuestBookings: 0, hasPurchaseHistory: false });
    expect(afterPayment.body).toMatchObject({ linkedGuestBookings: 1, hasPurchaseHistory: true });
    expect(repeat.body).toMatchObject({ linkedGuestBookings: 0, hasPurchaseHistory: true });
    expect(await app.store.getBookingById(bookingId)).toMatchObject({ userId: newcomer.id });
  });

  it('returns the same member bookings on repeated reads', async () => {
    const app = await loadMemberApp();
    const { GET } = await app.routes.myBookings();
    const read = async () =>
      readJson<Booking[]>(await GET(apiRequest('/api/my-bookings', { headers: bearer(MEMBER_TOKEN) })));

    const first = await read();
    const second = await read();

    expect(first.status).toBe(200);
    expect(first.body.length).toBeGreaterThan(0);
    expect(second.body).toEqual(first.body);
  });
});

async function startCardBooking(app: TestApp, pilotEmail: string) {
  const slot = await findOpenSlot(app, BOOKING_DATE, 60);
  const response = await postCheckout(app, bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail }));
  expect(response.status).toBe(201);
  return app.checkoutSessions.at(-1)!.bookingId!;
}

describe('Stripe webhook replays', () => {
  it('keeps the original payment and sends no second confirmation when a completed event is replayed', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const bookingId = await startCardBooking(app, 'replay@example.test');
    const webhook = await app.routes.stripeWebhook();
    const original = checkoutSessionEvent('checkout.session.completed', { payment_intent: 'pi_test_original', metadata: { bookingId } });
    const replay = checkoutSessionEvent('checkout.session.completed', { payment_intent: 'pi_test_replayed', metadata: { bookingId } });

    await webhook.POST(signedWebhookRequest(original));
    const confirmed = structuredClone(await app.store.getBookingById(bookingId));
    const replayed = await webhook.POST(signedWebhookRequest(replay));

    expect(replayed.status).toBe(200);
    expect(await app.store.getBookingById(bookingId)).toEqual(confirmed);
    expect(confirmed).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', stripePaymentIntentId: 'pi_test_original' });
    expect(mail.confirmationsFor(confirmed!.bookingReference)).toBe(1);
  });

  it('keeps a paid booking confirmed when a late expired event arrives', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const bookingId = await startCardBooking(app, 'late-expiry@example.test');
    const webhook = await app.routes.stripeWebhook();

    await webhook.POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } })));
    const expired = await webhook.POST(signedWebhookRequest(checkoutSessionEvent('checkout.session.expired', { metadata: { bookingId } })));

    expect(expired.status).toBe(200);
    expect(await app.store.getBookingById(bookingId)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
  });

  it('does not restore a spent voucher balance when its activation event is replayed', async () => {
    const mail = mockMailTransport();
    const app = await loadApp({ stripe: 'mocked', env: MAIL_ENV });
    const started = await postCheckout(app, {
      kind: 'voucher',
      amountIls: 800,
      recipientName: 'Replay Recipient',
      recipientEmail: 'replay-recipient@example.test',
      senderName: 'Replay Sender',
      senderEmail: 'replay-sender@example.test',
      personalMessage: '',
    });
    expect(started.status).toBe(201);
    const voucherId = app.checkoutSessions[0].voucherId!;
    const webhook = await app.routes.stripeWebhook();
    const activation = checkoutSessionEvent('checkout.session.completed', { metadata: { voucherId } });
    await webhook.POST(signedWebhookRequest(activation));
    const voucher = await app.store.getVoucherById(voucherId);
    const { PATCH } = await app.routes.vouchers();
    const redeemed = await PATCH(
      apiRequest('/api/vouchers', { method: 'PATCH', body: { code: voucher!.code, amount: 300 }, headers: adminHeaders() })
    );
    expect(redeemed.status).toBe(200);

    const replayed = await webhook.POST(signedWebhookRequest(activation));

    expect(replayed.status).toBe(200);
    expect(await app.store.getVoucherById(voucherId)).toMatchObject({ paymentStatus: 'paid', currentBalanceIls: 500 });
    expect(mail.activationsTo('replay-recipient@example.test')).toBe(1);
  });

  // The desk may cancel a pending booking (freeing its departure) while the customer
  // is still on the Stripe page; Checkout Sessions stay payable for up to 24 hours.
  it('keeps the departure with its new holder when payment completes for a booking the desk cancelled (REL-16)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    const checkout = (pilotEmail: string) =>
      postCheckout(app, bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime, pilotEmail }));
    expect((await checkout('cancelled-by-desk@example.test')).status).toBe(201);
    const cancelledId = app.checkoutSessions[0].bookingId!;
    const { PATCH } = await app.routes.bookings();
    const cancelled = await PATCH(
      apiRequest('/api/bookings', { method: 'PATCH', body: { id: cancelledId, status: 'cancelled' }, headers: adminHeaders() })
    );
    expect(cancelled.status).toBe(200);
    expect((await checkout('new-holder@example.test')).status).toBe(201);
    const newHolderId = app.checkoutSessions[1].bookingId!;
    const webhook = await app.routes.stripeWebhook();

    const late = await webhook.POST(
      signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: cancelledId } }))
    );

    expect(late.status).toBe(200);
    expect((await bookingsHolding(app, BOOKING_DATE, slot.startTime)).map((booking) => booking.id)).toEqual([newHolderId]);
    expect(await app.store.getBookingById(cancelledId)).toMatchObject({ status: 'cancelled' });
  });

  it('keeps an activated voucher spendable when a late expired event arrives', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const voucher = await createPaidVoucher(app, 450);
    const webhook = await app.routes.stripeWebhook();

    const expired = await webhook.POST(
      signedWebhookRequest(checkoutSessionEvent('checkout.session.expired', { metadata: { voucherId: voucher.id } }))
    );

    expect(expired.status).toBe(200);
    expect(await app.store.getVoucherById(voucher.id)).toMatchObject({ paymentStatus: 'paid', currentBalanceIls: 450 });
  });
});
