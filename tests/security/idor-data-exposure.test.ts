import { describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest, bearer, readJson, routeParams } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import {
  BOOKING_DATE,
  MEMBER_A,
  MEMBER_B,
  MEMBER_TOKENS,
  MEMBERS,
  SEED_VOUCHER_CODE,
  UNVERIFIED_MEMBER,
  readRaw,
  seedBooking,
} from './security-helpers';

const PUBLIC_BOOKING_FIELDS = [
  'addons',
  'bookingDate',
  'bookingReference',
  'durationMinutes',
  'endTime',
  'packageId',
  'packageTitle',
  'paymentStatus',
  'pilotName',
  'startTime',
  'status',
  'totalIls',
].sort();

const PUBLIC_VOUCHER_FIELDS = ['code', 'currentBalanceIls', 'expiryDate'].sort();

async function myBookings(app: TestApp, token: string) {
  const { GET } = await app.routes.myBookings();
  return readJson<Array<{ id: string; userId?: string; pilotEmail: string }>>(
    await GET(apiRequest('/api/my-bookings', { headers: bearer(token) }))
  );
}

async function stubReceiptLookup() {
  const { stripe } = await import('@/lib/stripe');
  if (!stripe) throw new Error('Stripe client should exist with test keys outside production');
  return vi
    .spyOn(stripe.paymentIntents, 'retrieve')
    .mockResolvedValue({ latest_charge: { receipt_url: 'https://pay.stripe.com/receipts/owner' } } as never);
}

async function lookupByReference(app: TestApp, reference: string) {
  const { GET } = await app.routes.bookings();
  return readRaw(await GET(apiRequest(`/api/bookings?ref=${encodeURIComponent(reference)}`)));
}

/** A card booking taken through checkout and confirmed by a signed webhook, so it carries Stripe ids. */
async function paidCardBooking(app: TestApp) {
  const slot = await findOpenSlot(app, BOOKING_DATE, 60);
  const checkout = await app.routes.checkout();
  await checkout.POST(
    apiRequest('/api/checkout', {
      body: bookingCheckoutBody({
        packageId: 'pkg-captain-60',
        startTime: slot.startTime,
        pilotEmail: 'private.pilot@guests.test',
        pilotPhone: '+972549998877',
        notes: 'door code 4321',
      }),
    })
  );
  const bookingId = app.checkoutSessions[0].bookingId;
  if (!bookingId) throw new Error('checkout did not record a booking id');
  const webhook = await app.routes.stripeWebhook();
  await webhook.POST(
    signedWebhookRequest(
      checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId }, payment_intent: 'pi_test_secret_intent' })
    )
  );
  const booking = await app.store.getBookingById(bookingId);
  if (!booking) throw new Error('booking vanished');
  return booking;
}

describe('member isolation (IDOR)', () => {
  it("never lists member B's bookings to member A", async () => {
    const app = await loadApp({ members: MEMBERS });
    // Separate departures beyond the 35-day seed horizon: the store refuses overlapping
    // bookings, as the production exclusion constraint does.
    const ownA = await seedBooking(app, { userId: MEMBER_A.id, pilotEmail: MEMBER_A.email, bookingDate: '2027-01-10' });
    const ownB = await seedBooking(app, { userId: MEMBER_B.id, pilotEmail: MEMBER_B.email, bookingDate: '2027-01-11' });
    const guestB = await seedBooking(app, { pilotEmail: MEMBER_B.email, bookingDate: '2027-01-12' });

    const response = await myBookings(app, MEMBER_TOKENS.a);

    expect(response.status).toBe(200);
    const ids = response.body.map((booking) => booking.id);
    expect(ids).toContain(ownA.id);
    expect(ids).not.toContain(ownB.id);
    expect(ids).not.toContain(guestB.id);
    expect(response.body.every((booking) => booking.userId === MEMBER_A.id)).toBe(true);
  });

  it("does not attach someone else's unpaid guest booking to a member with the same email", async () => {
    const app = await loadApp({ members: MEMBERS });
    const unpaid = await seedBooking(app, { pilotEmail: MEMBER_A.email, status: 'pending', paymentStatus: 'pending' });

    const response = await myBookings(app, MEMBER_TOKENS.a);

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).not.toContain(unpaid.id);
    expect((await app.store.getBookingById(unpaid.id))?.userId).toBeUndefined();
  });

  it('refuses an unverified member and leaves matching guest bookings unclaimed', async () => {
    const app = await loadApp({ members: MEMBERS });
    const guest = await seedBooking(app, { pilotEmail: UNVERIFIED_MEMBER.email });

    const response = await myBookings(app, MEMBER_TOKENS.unverified);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: expect.any(String) });
    expect((await app.store.getBookingById(guest.id))?.userId).toBeUndefined();
  });

  it("does not attach a booking to a member who checks out with another person's email", async () => {
    const app = await loadApp({ members: MEMBERS });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson<{ bookingReference: string }>(
      await POST(
        apiRequest('/api/checkout', {
          headers: bearer(MEMBER_TOKENS.a),
          body: bookingCheckoutBody({ startTime: slot.startTime, pilotEmail: MEMBER_B.email, voucherCode: SEED_VOUCHER_CODE }),
        })
      )
    );

    expect(response.status).toBe(201);
    const booking = await app.store.getBookingByRef(response.body.bookingReference);
    expect(booking?.userId).toBeUndefined();
    const listedForA = await myBookings(app, MEMBER_TOKENS.a);
    expect(listedForA.body.map((item) => item.id)).not.toContain(booking?.id);
  });

  it("answers member A's request for member B's receipt exactly like an unknown reference, without calling Stripe", async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const receiptLookup = await stubReceiptLookup();
    const bookingOfB = await seedBooking(app, { userId: MEMBER_B.id, pilotEmail: MEMBER_B.email });
    const { GET } = await app.routes.myBookingReceipt();
    const unknownReference = 'SD-737-ZZZZZZZZZZZZZZZZ';

    const forOther = await readRaw(
      await GET(
        apiRequest(`/api/my-bookings/${bookingOfB.bookingReference}/receipt`, { headers: bearer(MEMBER_TOKENS.a) }),
        routeParams({ bookingReference: bookingOfB.bookingReference })
      )
    );
    const forUnknown = await readRaw(
      await GET(
        apiRequest(`/api/my-bookings/${unknownReference}/receipt`, { headers: bearer(MEMBER_TOKENS.a) }),
        routeParams({ bookingReference: unknownReference })
      )
    );

    expect(forOther.status).toBe(404);
    expect(forOther.text).toBe(forUnknown.text);
    expect(forOther.text).not.toContain('pay.stripe.com');
    expect(receiptLookup).not.toHaveBeenCalled();
  });

  it('returns the receipt to its owner (control)', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const receiptLookup = await stubReceiptLookup();
    const own = await seedBooking(app, { userId: MEMBER_A.id, pilotEmail: MEMBER_A.email });
    const { GET } = await app.routes.myBookingReceipt();

    const response = await readJson<{ receiptUrl: string }>(
      await GET(
        apiRequest(`/api/my-bookings/${own.bookingReference}/receipt`, { headers: bearer(MEMBER_TOKENS.a) }),
        routeParams({ bookingReference: own.bookingReference })
      )
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ receiptUrl: 'https://pay.stripe.com/receipts/owner' });
    expect(receiptLookup).toHaveBeenCalledWith(own.stripePaymentIntentId, { expand: ['latest_charge'] });
  });
});

describe('public booking lookup by reference', () => {
  it('returns only the narrow public projection for a Stripe-paid booking', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const booking = await paidCardBooking(app);

    const response = await lookupByReference(app, booking.bookingReference);

    expect(response.status).toBe(200);
    expect(Object.keys(response.json as object).sort()).toEqual(PUBLIC_BOOKING_FIELDS);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('never leaks email, phone, Stripe ids, internal ids or staff notes', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const booking = await paidCardBooking(app);

    const response = await lookupByReference(app, booking.bookingReference);

    expect(response.status).toBe(200);
    for (const secret of [booking.pilotEmail, booking.pilotPhone, booking.id, 'pi_test_secret_intent', 'door code']) {
      expect(response.text).not.toContain(secret);
    }
    expect(response.text).not.toMatch(/\b(?:pi|cs|ch|cus)_[A-Za-z0-9_]+/);
  });

  it('never leaks the voucher code used to pay for a booking', async () => {
    const app = await loadApp();
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();
    const created = await readJson<{ bookingReference: string }>(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }) }))
    );

    const response = await lookupByReference(app, created.body.bookingReference);

    expect(response.status).toBe(200);
    expect(response.text).not.toContain(SEED_VOUCHER_CODE);
    expect(response.text).not.toContain('SD-VOUCH-');
  });

  it.each([
    ['lowercased', (ref: string) => ref.toLowerCase()],
    ['truncated', (ref: string) => ref.slice(0, -1)],
    ['extended', (ref: string) => `${ref}A`],
    ['prefix only', () => 'SD-737-'],
    ['legacy short seed format', () => 'SD-737-1000'],
    ['with a trailing wildcard', (ref: string) => `${ref.slice(0, -1)}%`],
  ])('requires the exact full reference (%s variant is not found)', async (_variant, mutate) => {
    const app = await loadApp({ stripe: 'mocked' });
    const booking = await paidCardBooking(app);

    const response = await lookupByReference(app, mutate(booking.bookingReference));

    expect(response.status).toBe(404);
    expect(response.json).toEqual({ error: 'Booking not found' });
  });
});

describe('voucher verification', () => {
  it('returns only code, balance and expiry, never recipient or sender details', async () => {
    const app = await loadApp();
    const voucher = await app.store.getVoucherByCode(SEED_VOUCHER_CODE);
    if (!voucher) throw new Error('seed voucher missing');
    const { POST } = await app.routes.vouchers();

    const response = await readRaw(await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code: SEED_VOUCHER_CODE } })));

    expect(response.status).toBe(200);
    expect(Object.keys(response.json as object).sort()).toEqual(PUBLIC_VOUCHER_FIELDS);
    for (const secret of [
      voucher.id,
      voucher.recipientName,
      voucher.recipientEmail,
      voucher.senderName,
      voucher.senderEmail,
      voucher.personalMessage,
    ]) {
      expect(response.text).not.toContain(secret);
    }
  });

  it('treats a purchased-but-unpaid voucher exactly like an unknown code', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const checkout = await app.routes.checkout();
    await checkout.POST(apiRequest('/api/checkout', { body: voucherCheckoutBody() }));
    const voucherId = app.checkoutSessions[0].voucherId;
    const pending = voucherId ? await app.store.getVoucherById(voucherId) : undefined;
    if (!pending) throw new Error('pending voucher was not created');
    const { POST } = await app.routes.vouchers();

    const forPending = await readRaw(await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code: pending.code } })));
    const forUnknown = await readRaw(
      await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code: 'SD-VOUCH-ZZZZZZZZZZZZZZZZZZ' } }))
    );

    expect(pending.paymentStatus).toBe('pending');
    expect(forPending.status).toBe(404);
    expect(forPending.text).toBe(forUnknown.text);
  });
});

describe('capability identifier entropy', () => {
  const SAMPLES = 4000;

  function suffixStats(values: string[], prefix: string) {
    const suffixes = values.map((value) => {
      expect(value.startsWith(prefix)).toBe(true);
      return value.slice(prefix.length);
    });
    const lengths = new Set(suffixes.map((suffix) => suffix.length));
    const counts = new Map<string, number>();
    for (const char of suffixes.join('')) counts.set(char, (counts.get(char) ?? 0) + 1);
    return { suffixes, lengths, counts };
  }

  it.each([
    { kind: 'booking reference', prefix: 'SD-737-', generator: 'generateBookingReference' as const },
    { kind: 'voucher code', prefix: 'SD-VOUCH-', generator: 'generateVoucherCode' as const },
  ])('gives every $kind at least 80 bits of uniformly distributed entropy', async ({ prefix, generator }) => {
    const utils = await import('@/lib/utils');
    const values = Array.from({ length: SAMPLES }, () => utils[generator]());

    const { suffixes, lengths, counts } = suffixStats(values, prefix);

    expect(lengths.size).toBe(1);
    const [length] = [...lengths];
    const alphabetSize = counts.size;
    expect(length * Math.log2(alphabetSize)).toBeGreaterThanOrEqual(80);
    expect(new Set(suffixes).size).toBe(SAMPLES);
    // Uniformity: each symbol within 15% of its expected frequency (about 7 standard deviations).
    const expected = (SAMPLES * length) / alphabetSize;
    for (const [symbol, count] of counts) {
      expect(Math.abs(count - expected) / expected, `symbol ${symbol}`).toBeLessThan(0.15);
    }
  });

  it('draws identifiers from the cryptographic RNG, never Math.random', async () => {
    const utils = await import('@/lib/utils');
    const mathRandom = vi.spyOn(Math, 'random');
    const cryptoRandom = vi.spyOn(globalThis.crypto, 'getRandomValues');

    utils.generateBookingReference();
    utils.generateVoucherCode();

    expect(mathRandom).not.toHaveBeenCalled();
    expect(cryptoRandom).toHaveBeenCalledTimes(2);
  });

  it('issues references through checkout that match the public lookup format', async () => {
    const app = await loadApp();
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson<{ bookingReference: string }>(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }) }))
    );

    expect(response.status).toBe(201);
    expect(response.body.bookingReference).toMatch(/^SD-737-[A-Z2-9]{16}$/);
  });
});
