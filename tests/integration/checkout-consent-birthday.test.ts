import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from '@/lib/legal';
import { DEFAULT_TEST_NOW, bookingCheckoutBody, loadApp, validConsentBody } from '../support/app';
import { EMPTY_DAY, findSlotWhere, postCheckout, SEED_VOUCHER } from './api-helpers';
import { errorBody, expectContract, stripeCheckoutStarted, validationErrorBody, voucherCheckoutConfirmed } from './contracts';

/**
 * POST /api/checkout: the mandatory consent and the pilot's birthday. Flights are on EMPTY_DAY.sunday
 * (2026-12-13), the clock is frozen at 2026-11-01 (tests/support/app.ts).
 */
const DAY = EMPTY_DAY.sunday;
/** In the flight's month: 15 percent. */
const DECEMBER_BIRTHDAY = '1990-12-05';
/** Far from the flight: nothing. */
const JUNE_BIRTHDAY = '1990-06-15';
/** Integer half-up percentage, written out so the test does not reuse the engine it checks. */
const fifteenPercentOff = (subtotal: number) => Math.floor((subtotal * 15 + 50) / 100);

async function openSlot(app: Awaited<ReturnType<typeof loadApp>>, duration: number) {
  return findSlotWhere(app, DAY, duration, (candidate) => candidate.available, 'open');
}

describe('POST /api/checkout: consent is mandatory', () => {
  it('rejects a booking with no consent at all (400), storing and charging nothing', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const { consent: _consent, ...withoutConsent } = bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime });

    const response = await postCheckout(app, withoutConsent);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields).some((path) => path.startsWith('consent'))).toBe(true);
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await app.store.getBookings()).not.toEqual(expect.arrayContaining([expect.objectContaining({ startTime: slot.startTime, bookingDate: DAY })]));
  });

  it.each([
    ['only the rules box is ticked', { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: false }, 'consent.mediaReleaseAndWaiver'],
    ['only the media box is ticked', { rulesRefundsAndPrivacy: false, mediaReleaseAndWaiver: true }, 'consent.rulesRefundsAndPrivacy'],
    ['neither box is ticked', { rulesRefundsAndPrivacy: false, mediaReleaseAndWaiver: false }, 'consent.rulesRefundsAndPrivacy'],
    ['a box is the string "true"', { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: 'true' }, 'consent.mediaReleaseAndWaiver'],
    ['a box is missing', { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: undefined }, 'consent.mediaReleaseAndWaiver'],
  ])('rejects the booking (400) when %s', async (_label, flags, field) => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, consent: { ...validConsentBody(), ...flags } })
    );

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects a consent given in a language the site does not have', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, consent: validConsentBody('de') })
    );
    expect(response.status).toBe(400);
  });

  it('is required for a voucher-funded booking too', async () => {
    const app = await loadApp();
    const slot = await openSlot(app, 30);
    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        bookingDate: DAY,
        startTime: slot.startTime,
        voucherCode: SEED_VOUCHER.code,
        consent: { ...validConsentBody(), mediaReleaseAndWaiver: false },
      })
    );
    expect(response.status).toBe(400);
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });
});

describe('POST /api/checkout: the consent record', () => {
  it('stores the record with the server time, the current versions and the page language', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, consent: validConsentBody('he') })
    );

    expect(response.status).toBe(201);
    const booking = await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? '');
    expect(booking?.consentRecord).toEqual({
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
      consentVersion: CONSENT_VERSION,
      acceptedAt: new Date(DEFAULT_TEST_NOW).toISOString(),
      language: 'he',
      rulesRefundsAndPrivacy: true,
      mediaReleaseAndWaiver: true,
    });
  });

  it('ignores a version, a timestamp or any extra field the client supplies', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        bookingDate: DAY,
        startTime: slot.startTime,
        consent: {
          ...validConsentBody(),
          acceptedAt: '1999-01-01T00:00:00.000Z',
          consentVersion: 'forged-1',
          legalDocumentVersion: 'forged-2',
          version: 'forged-3',
          ip: '203.0.113.9',
        },
      })
    );

    expect(response.status).toBe(201);
    const record = (await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? ''))?.consentRecord;
    expect(record).toMatchObject({
      acceptedAt: new Date(DEFAULT_TEST_NOW).toISOString(),
      consentVersion: CONSENT_VERSION,
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
    });
    expect(JSON.stringify(record)).not.toMatch(/forged|1999|203\.0\.113/);
  });

  it('keeps the record after the payment webhook confirms the booking', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: DECEMBER_BIRTHDAY }));
    const bookingId = app.checkoutSessions[0].bookingId ?? '';
    const { checkoutSessionEvent } = await import('../support/stripe');
    const { deliverWebhook } = await import('./api-helpers');

    await deliverWebhook(app, checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } }));

    expect(await app.store.getBookingById(bookingId)).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'paid',
      pilotBirthdayMonth: 12,
      pilotBirthdayDay: 5,
      consentRecord: { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true },
    });
  });
});

describe('POST /api/checkout: the pilot birthday is mandatory and valid', () => {
  it('rejects a booking without a birth date (400)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const { pilotBirthDate: _birthDate, ...withoutBirthday } = bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime });
    const response = await postCheckout(app, withoutBirthday);
    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain('pilotBirthDate');
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it.each([
    ['an empty string', ''],
    ['a wrong format', '25/12/1990'],
    ['an impossible date', '1990-02-30'],
    ['a number', 19901205],
  ])('rejects %s (400)', async (_label, pilotBirthDate) => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate }));
    expect(response.status).toBe(400);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it.each([
    ['a date in the future', '2026-11-02', /future|בעתיד/],
    ['a pilot younger than 10 on the flight date', '2020-01-01', /at least 10 years/],
    ['a birth year that cannot be right', '1890-01-01', /check the year/i],
  ])('rejects %s (400) with a message in the page language', async (_label, pilotBirthDate, message) => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const language = _label === 'a date in the future' ? 'he' : 'en';

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate, consent: validConsentBody(language) })
    );

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toMatch(message);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('is required, and validated, for PRO training too, where it earns nothing', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 90, (candidate) => candidate.available, 'open');
    const pro = bookingCheckoutBody({ packageId: 'pkg-pro-90', bookingDate: DAY, startTime: slot.startTime });
    const { pilotBirthDate: _drop, ...missing } = pro;
    expect((await postCheckout(app, missing)).status).toBe(400);
    expect((await postCheckout(app, { ...pro, pilotBirthDate: '2020-01-01' })).status).toBe(400);
  });
});

describe('POST /api/checkout: the birthday discount', () => {
  it('charges Stripe the discounted total and stores only the birthday month and day, never the full date', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 60);
    const subtotal = slot.dynamicPriceIls;

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: DECEMBER_BIRTHDAY })
    );

    expect(response.status).toBe(201);
    expectContract(stripeCheckoutStarted, response.body);
    const discount = fifteenPercentOff(subtotal);
    const [session] = app.checkoutSessions;
    expect(session.amountIls).toBe(subtotal - discount);
    expect(Math.round(session.amountIls * 100)).toBe((subtotal - discount) * 100);
    const booking = await app.store.getBookingById(session.bookingId ?? '');
    expect(booking).toMatchObject({
      subtotalIls: subtotal,
      discountIls: discount,
      birthdayDiscountIls: discount,
      totalIls: subtotal - discount,
      pilotBirthdayMonth: 12,
      pilotBirthdayDay: 5,
      status: 'pending',
      paymentStatus: 'pending',
    });
    expect(JSON.stringify(booking)).not.toContain('1990');
  });

  it('honours the 14-day grace across the month boundary (flight 2026-12-13, birthday 2026-11-29)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: '1990-11-29' })
    );
    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(slot.dynamicPriceIls - fifteenPercentOff(slot.dynamicPriceIls));
  });

  it('gives nothing when the birthday is outside the window, and still stores month and day', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: JUNE_BIRTHDAY })
    );
    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(slot.dynamicPriceIls);
    expect(await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? '')).toMatchObject({
      discountIls: 0,
      birthdayDiscountIls: 0,
      pilotBirthdayMonth: 6,
      pilotBirthdayDay: 15,
    });
  });

  it('follows the flight date, not the booking date: a December flight earns nothing for a November birthday booked in November', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    // The clock is 2026-11-01, the birthday month; the flight is 2026-12-13, 42 days after 2026-11-01's birthday window.
    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: '1990-11-01' })
    );
    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(slot.dynamicPriceIls);
  });

  it.each([
    ['PRO training', 'pkg-pro-90', 90],
    ['the Fear of Flying course', 'pkg-fear-of-flying-90', 90],
  ])('gives no discount on %s even in the birthday month', async (_label, packageId, duration) => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, duration, (candidate) => candidate.available, 'open');
    const price = app.seed.SIMULATOR_PACKAGES.find((pkg) => pkg.id === packageId)!.priceIls;

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId, bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: DECEMBER_BIRTHDAY })
    );

    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(price);
    expect(await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? '')).toMatchObject({
      discountIls: 0,
      birthdayDiscountIls: 0,
    });
  });

  it('gives no discount on the Discounted Promotion (no stacking), the 45-minute daytime flight', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findSlotWhere(app, DAY, 45, (candidate) => candidate.available && !candidate.isPrimeTime, 'an open promotion slot');
    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-promo-45', bookingDate: DAY, startTime: slot.startTime, pilotBirthDate: DECEMBER_BIRTHDAY })
    );
    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(490);
  });

  it('applies the percentage to the whole subtotal, add-ons included', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const addons = ['addon-xwind-ifr'];
    const slot = await findSlotWhere(
      app,
      DAY,
      60,
      (candidate) => candidate.available && (candidate.maxAvailableMinutes ?? 0) >= 75,
      'an open slot with room for the add-on'
    );
    const subtotal = slot.dynamicPriceIls + 250;

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: DAY, startTime: slot.startTime, addons, pilotBirthDate: DECEMBER_BIRTHDAY })
    );

    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(subtotal - fifteenPercentOff(subtotal));
  });

  it('never lets the client choose the discount: price fields in the body are dropped', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlot(app, 30);
    const response = await postCheckout(
      app,
      bookingCheckoutBody({
        bookingDate: DAY,
        startTime: slot.startTime,
        pilotBirthDate: JUNE_BIRTHDAY,
        birthdayDiscountIls: 400,
        discountIls: 400,
        totalIls: 1,
      })
    );
    expect(response.status).toBe(201);
    expect(app.checkoutSessions[0].amountIls).toBe(slot.dynamicPriceIls);
  });
});

describe('POST /api/checkout: a voucher covers what is left after the birthday discount', () => {
  it('accepts a voucher that covers the discounted total but not the list total, and debits the discounted total', async () => {
    const app = await loadApp();
    // Leave 400 on the seed voucher: below the 450 list price, above the 382 birthday price.
    await app.store.redeemVoucher(SEED_VOUCHER.code, SEED_VOUCHER.balanceIls - 400);
    const slot = await openSlot(app, 30);
    const list = slot.dynamicPriceIls;
    const payable = list - fifteenPercentOff(list);
    expect(400).toBeLessThan(list);
    expect(400).toBeGreaterThanOrEqual(payable);

    const plain = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: SEED_VOUCHER.code, pilotBirthDate: JUNE_BIRTHDAY })
    );
    expect(plain.status).toBe(409);

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ bookingDate: DAY, startTime: slot.startTime, voucherCode: SEED_VOUCHER.code, pilotBirthDate: DECEMBER_BIRTHDAY })
    );

    expect(response.status).toBe(201);
    const { bookingReference } = expectContract(voucherCheckoutConfirmed, response.body);
    expect(await app.store.getBookingByRef(bookingReference)).toMatchObject({
      paymentMethod: 'voucher',
      status: 'confirmed',
      subtotalIls: list,
      birthdayDiscountIls: list - payable,
      discountIls: list,
      totalIls: 0,
    });
    expect(await app.store.getVoucherByCode(SEED_VOUCHER.code)).toMatchObject({ currentBalanceIls: 400 - payable });
  });
});
