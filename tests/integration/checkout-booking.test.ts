import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { checkoutSessionEvent } from '../support/stripe';
import {
  addonMinutes,
  addonPrice,
  createVoucherFundedBooking,
  deliverWebhook,
  EMPTY_DAY,
  findSlotWhere,
  getSlots,
  isSlotOpen,
  packageDuration,
  postCheckout,
  SEED_FULL_VOUCHER,
  SEED_VOUCHER,
} from './api-helpers';
import {
  errorBody,
  expectContract,
  stripeCheckoutStarted,
  validationErrorBody,
  voucherCheckoutConfirmed,
  voucherRedeemed,
} from './contracts';

const DAY = EMPTY_DAY.sunday;
const PAYMENTS_DISABLED = 'Online payments are temporarily unavailable. Please contact us to book.';
const CONFIGURED_ORIGIN = 'https://booking.simdream.test';
const LIVE_STRIPE_KEY = 'sk_live_simdreamQaKey0000000000';

function minutesAfter(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

describe('POST /api/checkout: voucher-funded bookings', () => {
  it('confirms a fully voucher-funded booking immediately, consumes the slot and debits the voucher', async () => {
    const app = await loadApp();
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: SEED_VOUCHER.code })
    );

    expect(response.status).toBe(201);
    const body = expectContract(voucherCheckoutConfirmed, response.body);
    expect(body.successUrl).toBe(`http://localhost:3000/book/success?ref=${body.bookingReference}`);
    expect(await app.store.getBookingByRef(body.bookingReference)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'voucher',
      voucherCode: SEED_VOUCHER.code,
      subtotalIls: slot.dynamicPriceIls,
      discountIls: slot.dynamicPriceIls,
      totalIls: 0,
    });
    expect(await app.store.getVoucherByCode(SEED_VOUCHER.code)).toMatchObject({
      currentBalanceIls: SEED_VOUCHER.balanceIls - slot.dynamicPriceIls,
      isRedeemed: false,
    });
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(false);
  });

  it('accepts a voucher code regardless of letter case and surrounding whitespace', async () => {
    const app = await loadApp();
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        bookingDate: DAY,
        startTime: slot.startTime,
        voucherCode: `  ${SEED_VOUCHER.code.toLowerCase()}  `,
      })
    );

    expect(response.status).toBe(201);
    const { bookingReference } = expectContract(voucherCheckoutConfirmed, response.body);
    expect((await app.store.getBookingByRef(bookingReference))?.voucherCode).toBe(SEED_VOUCHER.code);
  });

  it('drains a voucher that exactly covers the order and marks it fully redeemed', async () => {
    const app = await loadApp();
    const addons = ['addon-cold-dark'];
    const slot = await findSlotWhere(
      app,
      DAY,
      60,
      (candidate) => candidate.available && (candidate.maxAvailableMinutes ?? 0) >= 60 + addonMinutes(app, addons),
      'open with room for Cold & Dark'
    );
    // Captain 60 plus Cold & Dark is priced to equal the seed voucher's full balance.
    expect(slot.dynamicPriceIls + addonPrice(app, addons)).toBe(SEED_FULL_VOUCHER.balanceIls);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        packageId: 'pkg-captain-60',
        bookingDate: DAY,
        startTime: slot.startTime,
        addons,
        voucherCode: SEED_FULL_VOUCHER.code,
      })
    );

    expect(response.status).toBe(201);
    expect(await app.store.getVoucherByCode(SEED_FULL_VOUCHER.code)).toMatchObject({
      currentBalanceIls: 0,
      isRedeemed: true,
    });
    const { POST } = await app.routes.vouchers();
    const verification = await readJson(
      await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code: SEED_FULL_VOUCHER.code } }))
    );
    expect(verification.status).toBe(400);
    expectContract(voucherRedeemed, verification.body);
  });

  it('rejects a voucher that only partially covers the order with 409 and leaves no trace', async () => {
    const app = await loadApp();
    const slot = await findSlotWhere(app, DAY, 60, (candidate) => candidate.available, 'open');
    expect(slot.dynamicPriceIls).toBeGreaterThan(SEED_VOUCHER.balanceIls);
    const bookingsBefore = (await app.store.getBookings()).length;

    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        packageId: 'pkg-captain-60',
        bookingDate: DAY,
        startTime: slot.startTime,
        voucherCode: SEED_VOUCHER.code,
      })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toMatch(/covers the full order total/);
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect(await isSlotOpen(app, DAY, 60, slot.startTime)).toBe(true);
  });

  it('rejects an expired voucher with 409', async () => {
    const app = await loadApp();
    // Seed vouchers expire one year after the frozen clock.
    vi.setSystemTime(new Date('2027-11-08T08:00:00+02:00'));
    const date = '2027-11-14';
    const slot = await findSlotWhere(app, date, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: date, startTime: slot.startTime, voucherCode: SEED_VOUCHER.code })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('This voucher has expired.');
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
    expect(await isSlotOpen(app, date, 20, slot.startTime)).toBe(true);
  });

  it('rejects a gift voucher whose purchase has not been paid with 409', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const purchase = await postCheckout(app, voucherCheckoutBody({ amountIls: 1000 }));
    expect(purchase.status).toBe(201);
    const pending = await app.store.getVoucherById(app.checkoutSessions[0].voucherId ?? '');
    expect(pending?.paymentStatus).toBe('pending');
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: pending?.code })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('This voucher is not active.');
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(true);
  });

  it('rejects an unknown voucher code with 409', async () => {
    const app = await loadApp();
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: 'SD-VOUCH-ZZZZZZZZZZZZZZZZZZ' })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('This voucher is not active.');
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(true);
  });
});

describe('POST /api/checkout: card bookings', () => {
  it('keeps a card booking pending and charges Stripe exactly the server-computed manifest', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const addons = ['addon-hd-video', 'addon-xwind-ifr'];
    const slot = await findSlotWhere(
      app,
      DAY,
      90,
      (candidate) => candidate.available && candidate.isPrimeTime && (candidate.maxAvailableMinutes ?? 0) >= 90 + addonMinutes(app, addons),
      'an open prime-time slot with room for the add-ons'
    );
    const catalogue = app.seed.SIMULATOR_PACKAGES.find((pkg) => pkg.id === 'pkg-ultimate-90');
    // The evening tariff differs from the catalogue price, proving the slot price is used.
    expect(slot.dynamicPriceIls).not.toBe(catalogue?.priceIls);
    const expectedTotal = slot.dynamicPriceIls + addonPrice(app, addons);
    const expectedMinutes = 90 + addonMinutes(app, addons);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        packageId: 'pkg-ultimate-90',
        bookingDate: DAY,
        startTime: slot.startTime,
        addons,
        pilotEmail: 'card.pilot@pilots.test',
      })
    );

    expect(response.status).toBe(201);
    expect(expectContract(stripeCheckoutStarted, response.body).url).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_mock_1'
    );
    expect(app.checkoutSessions).toHaveLength(1);
    const [session] = app.checkoutSessions;
    expect(session).toMatchObject({ amountIls: expectedTotal, customerEmail: 'card.pilot@pilots.test' });
    expect(session.voucherId).toBeUndefined();
    expect(session.title).toContain(`(${expectedMinutes} min)`);
    expect(await app.store.getBookingById(session.bookingId ?? '')).toMatchObject({
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'stripe',
      subtotalIls: expectedTotal,
      discountIls: 0,
      totalIls: expectedTotal,
      durationMinutes: expectedMinutes,
      startTime: slot.startTime,
      endTime: minutesAfter(slot.startTime, expectedMinutes),
      addons,
    });
  });

  it('builds Stripe return URLs from the configured application origin, not the request host', async () => {
    const app = await loadApp({ stripe: 'mocked', env: { NEXT_PUBLIC_APP_URL: `${CONFIGURED_ORIGIN}/ignored/path` } });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }));

    expect(response.status).toBe(201);
    const [session] = app.checkoutSessions;
    const booking = await app.store.getBookingById(session.bookingId ?? '');
    expect(session.successUrl).toBe(
      `${CONFIGURED_ORIGIN}/book/success?ref=${booking?.bookingReference}&session_id={CHECKOUT_SESSION_ID}`
    );
    expect(session.cancelUrl).toBe(`${CONFIGURED_ORIGIN}/book?cancelled=true`);
  });

  it('falls back to the request origin for return URLs outside production', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }));

    expect(response.status).toBe(201);
    const [session] = app.checkoutSessions;
    expect(session.successUrl.startsWith('http://localhost:3000/book/success?ref=SD-737-')).toBe(true);
    expect(session.cancelUrl).toBe('http://localhost:3000/book?cancelled=true');
  });

  it('starts a card checkout under production rules with a live key and an HTTPS origin', async () => {
    const app = await loadApp({
      stripe: 'mocked',
      env: { NODE_ENV: 'production', STRIPE_SECRET_KEY: LIVE_STRIPE_KEY, NEXT_PUBLIC_APP_URL: CONFIGURED_ORIGIN },
    });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }));

    expect(response.status).toBe(201);
    expectContract(stripeCheckoutStarted, response.body);
    expect(app.checkoutSessions[0].successUrl.startsWith(`${CONFIGURED_ORIGIN}/book/success`)).toBe(true);
    expect(await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? '')).toMatchObject({ status: 'pending' });
  });

  it.each([
    { name: 'no Stripe keys in development', options: {} },
    { name: 'test keys under production rules', options: { stripe: 'mocked' as const, env: { NODE_ENV: 'production' } } },
  ])('refuses card checkout with a friendly 503 and stores nothing when payments are off ($name)', async ({ options }) => {
    const app = await loadApp(options);
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');
    const bookingsBefore = (await app.store.getBookings()).length;

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe(PAYMENTS_DISABLED);
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(true);
  });

  it('cancels the pending booking and releases the slot when Stripe session creation fails', async () => {
    const app = await loadApp({ stripe: 'mocked', stripeFailure: new Error('Stripe API unreachable') });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotEmail: 'outage@pilots.test' })
    );

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe('Unable to start checkout. Please try again.');
    const attempts = await app.store.getBookingsByEmail('outage@pilots.test');
    expect(attempts.map((booking) => booking.status)).toEqual(['cancelled']);
    expect(await isSlotOpen(app, DAY, 20, slot.startTime)).toBe(true);
  });

  it('ignores unknown body fields, so clients cannot inject prices, payment state or ownership', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(app, {
      ...bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }),
      totalIls: 1,
      subtotalIls: 1,
      discountIls: 9_999,
      amountIls: 1,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'voucher',
      userId: 'member-ada',
      bookingReference: 'SD-737-AAAAAAAAAAAAAAAA',
      durationMinutes: 5,
      endTime: '23:59',
    });

    expect(response.status).toBe(201);
    const [session] = app.checkoutSessions;
    expect(session.amountIls).toBe(slot.dynamicPriceIls);
    const booking = await app.store.getBookingById(session.bookingId ?? '');
    expect(booking).toMatchObject({
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'stripe',
      totalIls: slot.dynamicPriceIls,
      discountIls: 0,
      durationMinutes: 20,
      endTime: slot.endTime,
    });
    expect(booking?.userId).toBeUndefined();
    expect(booking?.bookingReference).not.toBe('SD-737-AAAAAAAAAAAAAAAA');
  });

  it('charges the server price whatever extra fields a client adds (property)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const injectedKey = fc.constantFrom(
      'totalIls',
      'subtotalIls',
      'discountIls',
      'priceIls',
      'amountIls',
      'dynamicPriceIls',
      'basePriceIls',
      'unit_amount',
      'currency',
      'status',
      'paymentStatus',
      'paymentMethod',
      'userId',
      'id'
    );
    const injectedValue = fc.oneof(
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.string({ maxLength: 12 }),
      fc.boolean(),
      fc.constant(null)
    );

    await fc.assert(
      fc.asyncProperty(fc.dictionary(injectedKey, injectedValue, { minKeys: 1 }), async (injected) => {
        const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');
        const sessionsBefore = app.checkoutSessions.length;

        const response = await postCheckout(app, {
          ...bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime }),
          ...injected,
        });

        expect(response.status).toBe(201);
        const session = app.checkoutSessions[sessionsBefore];
        expect(session.amountIls).toBe(slot.dynamicPriceIls);
        expect(await app.store.getBookingById(session.bookingId ?? '')).toMatchObject({
          status: 'pending',
          paymentStatus: 'pending',
          totalIls: slot.dynamicPriceIls,
        });
        // Release the slot through the public webhook so every run books the same departure.
        await deliverWebhook(app, checkoutSessionEvent('checkout.session.expired', { metadata: { bookingId: session.bookingId } }));
      }),
      { numRuns: 25 }
    );
  });
});

describe('POST /api/checkout: catalogue and schedule rules', () => {
  it.each([
    { name: 'an unknown package', packageId: 'pkg-does-not-exist' },
    { name: 'the corporate workshop package, which is sold by inquiry only', packageId: 'pkg-corporate-crm' },
  ])('rejects $name with 400', async ({ packageId }) => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(app, bookingCheckoutBody({ packageId, bookingDate: DAY, startTime: '10:00' }));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Select an active consumer flight package.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects an unknown add-on with 400', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, addons: ['addon-hd-video', 'addon-free-upgrade'] })
    );

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('One or more selected mission add-ons are unavailable.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('prices a duplicated add-on only once', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, addons: ['addon-hd-video', 'addon-hd-video'] })
    );

    expect(response.status).toBe(201);
    const [session] = app.checkoutSessions;
    expect(session.amountIls).toBe(slot.dynamicPriceIls + addonPrice(app, ['addon-hd-video']));
    expect((await app.store.getBookingById(session.bookingId ?? ''))?.addons).toEqual(['addon-hd-video']);
  });

  it('rejects add-ons that overflow the departure window with 409 and keeps the slot open', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(
      app,
      DAY,
      60,
      (candidate) => candidate.available && candidate.maxAvailableMinutes === 60,
      'open with no spare minutes'
    );

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: DAY, startTime: slot.startTime, addons: ['addon-cold-dark'] })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe(
      'The selected mission add-ons no longer fit in this departure window.'
    );
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await isSlotOpen(app, DAY, 60, slot.startTime)).toBe(true);
  });

  it('rejects a departure that is already booked with 409', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const taken = await createVoucherFundedBooking(app, { date: DAY });

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: taken.startTime }));

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('The selected departure slot is no longer available.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it.each([
    { name: 'before opening time', startTime: '08:00', error: 'The selected departure time is outside operating hours.' },
    { name: 'off the slot grid', startTime: '10:05', error: 'The selected departure slot is no longer available.' },
  ])('rejects a start time $name with 409', async ({ startTime, error }) => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime }));

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe(error);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects the 45-minute daytime promo on a Saturday evening', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    // 19:00 is on the Saturday grid, so the promo rule is what closes it.
    expect((await getSlots(app, EMPTY_DAY.saturday, 45)).find((slot) => slot.startTime === '19:00')).toMatchObject({
      available: false,
      disabledReason: 'daytime_only_promo',
    });

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-promo-45', bookingDate: EMPTY_DAY.saturday, startTime: '19:00' })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('The selected departure slot is no longer available.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('sells the Friday 15:15 closer to a 20-minute flight', async () => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: EMPTY_DAY.friday, startTime: '15:15' }));

    expect(response.status).toBe(201);
    expectContract(stripeCheckoutStarted, response.body);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('refuses the Friday 15:15 closer to a 60-minute flight with 409', async () => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: EMPTY_DAY.friday, startTime: '15:15' })
    );

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('The selected departure slot is no longer available.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects a booking dated yesterday in Israel even while that date is still today in UTC', async () => {
    const app = await loadApp({ stripe: 'mocked', now: '2026-11-02T00:30:00+02:00' });
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-11-01');

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: '2026-11-01', startTime: '10:00' }));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Bookings must be for today or a future date.');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('accepts a booking for the current Israel date just after midnight', async () => {
    const app = await loadApp({ stripe: 'mocked', now: '2026-11-02T00:30:00+02:00' });
    const slot = await findSlotWhere(app, '2026-11-02', 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: '2026-11-02', startTime: slot.startTime }));

    expect(response.status).toBe(201);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('accepts a professional training package without add-ons', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 60, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-pro-60', bookingDate: DAY, startTime: slot.startTime, experienceLevel: 'atpl' })
    );

    expect(response.status).toBe(201);
    // The PRO catalog price (AGENTS.md section 2), not the consumer 60-minute tariff (UNIT-1).
    expect(app.checkoutSessions[0].amountIls).toBe(890);
  });

  for (const packageId of ['pkg-pro-60', 'pkg-fear-of-flying-90']) {
    it(`rejects add-ons on the noise-free ${packageId} package with 400 (API-2)`, async () => {
      const app = await loadApp({ stripe: 'mocked' });
      const addons = ['addon-hd-video'];
      const duration = packageDuration(app, packageId);
      // A slot with room for the add-on, so only the category rule can reject the request.
      const slot = await findSlotWhere(
        app,
        DAY,
        duration,
        (candidate) => candidate.available && (candidate.maxAvailableMinutes ?? 0) >= duration + addonMinutes(app, addons),
        'open with room for the add-on'
      );

      const response = await postCheckout(
        app,
        bookingCheckoutBody({ packageId, bookingDate: DAY, startTime: slot.startTime, addons })
      );

      expect(response.status).toBe(400);
      expect(app.checkoutSessions).toHaveLength(0);
      expect(await isSlotOpen(app, DAY, duration, slot.startTime)).toBe(true);
    });
  }

  it('rejects a departure that already left earlier today (Israel time) (API-3)', async () => {
    // Discover a morning departure before opening, then move the clock past it, so a
    // fix to slot listing alone cannot make this expected failure fail vacuously.
    const app = await loadApp({ stripe: 'mocked', now: '2026-12-13T08:00:00+02:00' });
    const elapsed = await findSlotWhere(
      app,
      '2026-12-13',
      20,
      (candidate) => candidate.available && candidate.startTime < '16:00',
      'open and departing before 16:00'
    );
    vi.setSystemTime(new Date('2026-12-13T16:00:00+02:00'));

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: '2026-12-13', startTime: elapsed.startTime })
    );

    expect(response.status).toBe(400);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects a calendar-invalid booking date with 400 and a bookingDate field error (API-7)', async () => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: '2027-02-30', startTime: '10:00' }));

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain('bookingDate');
    expect(app.checkoutSessions).toHaveLength(0);
    expect((await app.store.getBookings()).filter((booking) => booking.bookingDate === '2027-02-30')).toEqual([]);
  });
});

describe('POST /api/checkout: side effects stay consistent with the reported outcome', () => {
  it('debits the voucher and takes the slot only when a voucher-funded checkout succeeds (API-4)', async () => {
    // Production rules with NEXT_PUBLIC_APP_URL unset, exactly like the sandboxed browser-test server.
    const app = await loadApp({ env: { NODE_ENV: 'production' } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: SEED_VOUCHER.code })
    );

    // Whatever the outcome, the voucher and inventory must agree with what the customer was told.
    const succeeded = response.status === 201;
    const voucherDebited = (await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls !== SEED_VOUCHER.balanceIls;
    const slotTaken = !(await isSlotOpen(app, DAY, 20, slot.startTime));
    expect({ voucherDebited, slotTaken }).toEqual({ voucherDebited: succeeded, slotTaken: succeeded });
  });

  it('holds the slot for a card checkout only when a Stripe session was created (API-5)', async () => {
    const app = await loadApp({ stripe: 'mocked', env: { NODE_ENV: 'production', STRIPE_SECRET_KEY: LIVE_STRIPE_KEY } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slot = await findSlotWhere(app, DAY, 20, (candidate) => candidate.available, 'open');

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotEmail: 'origin@pilots.test' })
    );

    // Without a Stripe session no expiry webhook will ever arrive, so nothing may stay pending.
    const sessionCreated = app.checkoutSessions.length === 1;
    const pendingBookings = (await app.store.getBookingsByEmail('origin@pilots.test')).filter(
      (booking) => booking.status === 'pending'
    ).length;
    const slotTaken = !(await isSlotOpen(app, DAY, 20, slot.startTime));
    expect(response.status === 201).toBe(sessionCreated);
    expect({ pendingBookings, slotTaken }).toEqual({ pendingBookings: sessionCreated ? 1 : 0, slotTaken: sessionCreated });
  });
});

describe('POST /api/checkout: request validation', () => {
  it('rejects a malformed JSON body with 400', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.checkout();

    const response = await readJson(
      await POST(apiRequest('/api/checkout', { rawBody: '{"kind":', headers: { 'content-type': 'application/json' } }))
    );

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });

  const booking = bookingCheckoutBody({ bookingDate: DAY });
  const voucher = voucherCheckoutBody();
  it.each([
    { name: 'a missing kind', body: { ...booking, kind: undefined }, field: 'kind' },
    { name: 'an unknown kind', body: { ...booking, kind: 'gift' }, field: 'kind' },
    { name: 'a non-ISO booking date', body: { ...booking, bookingDate: '13/12/2026' }, field: 'bookingDate' },
    { name: 'an impossible start time', body: { ...booking, startTime: '25:00' }, field: 'startTime' },
    { name: 'an invalid pilot email', body: { ...booking, pilotEmail: 'not-an-email' }, field: 'pilotEmail' },
    { name: 'a too-short phone number', body: { ...booking, pilotPhone: '123' }, field: 'pilotPhone' },
    { name: 'a blank pilot name', body: { ...booking, pilotName: '   ' }, field: 'pilotName' },
    { name: 'an unknown experience level', body: { ...booking, experienceLevel: 'astronaut' }, field: 'experienceLevel' },
    { name: 'more than 16 add-ons', body: { ...booking, addons: Array.from({ length: 17 }, (_, i) => `addon-${i}`) }, field: 'addons' },
    { name: 'notes over 2,000 characters', body: { ...booking, notes: 'x'.repeat(2_001) }, field: 'notes' },
    { name: 'a gift voucher under 100 ILS', body: { ...voucher, amountIls: 99 }, field: 'amountIls' },
    { name: 'a non-numeric gift amount', body: { ...voucher, amountIls: '500' }, field: 'amountIls' },
    { name: 'an invalid recipient email', body: { ...voucher, recipientEmail: 'nobody' }, field: 'recipientEmail' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp({ stripe: 'mocked' });
    const bookingsBefore = (await app.store.getBookings()).length;
    const vouchersBefore = (await app.store.getVouchers()).length;

    const response = await postCheckout(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect((await app.store.getVouchers()).length).toBe(vouchersBefore);
    expect(app.checkoutSessions).toHaveLength(0);
  });
});
