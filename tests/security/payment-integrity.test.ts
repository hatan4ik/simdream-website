import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest, basicAuth, readJson } from '../support/http';
import { TEST_ADMIN } from '../support/test-env';
import { PRODUCTION_ORIGIN, SEED_VOUCHER_CODE, propertyOptions, readRaw, snapshotState } from './security-helpers';

const CONSUMER_PACKAGES = [
  'pkg-discovery-30',
  'pkg-promo-45',
  'pkg-captain-60',
  'pkg-ultimate-90',
  'pkg-pro-60',
  'pkg-pro-90',
  'pkg-assessment-prep-120',
  'pkg-fear-of-flying-90',
];
// Add-ons that add no flight time, so any combination fits any departure window.
const ZERO_DURATION_ADDONS = ['addon-hd-video', 'addon-logbook', 'addon-extra-seat'];
// Dates relative to DEFAULT_TEST_NOW (2026-11-01, before opening).
const CANDIDATE_DATES = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];

const injectedNumber = fc.oneof(
  fc.constantFrom(0, 1, -1, 0.01, 999_999, -690),
  fc.double({ min: -1e6, max: 1e6, noNaN: true }),
  fc.constantFrom('0', '1', 'free')
);

/** Client-supplied price fields an attacker might try; the server must ignore all of them. */
const injectedPriceFields = fc.record(
  {
    totalIls: injectedNumber,
    subtotalIls: injectedNumber,
    amountIls: injectedNumber,
    priceIls: injectedNumber,
    discountIls: injectedNumber,
    dynamicPriceIls: injectedNumber,
    unit_amount: injectedNumber,
    currency: fc.constantFrom('usd', 'jpy', 'ils'),
  },
  { requiredKeys: [] }
);

async function openSlotFor(app: TestApp, durationMinutes: number) {
  for (const date of CANDIDATE_DATES) {
    const slot = (await app.store.getAvailableSlots(date, durationMinutes)).find((candidate) => candidate.available);
    if (slot) return slot;
  }
  throw new Error(`No open ${durationMinutes}m slot in the candidate week`);
}

/** Independent oracle for the server-side price: slot price (or list price) plus add-on prices. */
/** Catalog total: the package's own price (its prime-time tariff when it defines one) plus add-ons. */
function expectedTotal(app: TestApp, packageId: string, slot: { isPrimeTime: boolean }, addonIds: readonly string[]): number {
  const pkg = app.seed.SIMULATOR_PACKAGES.find((item) => item.id === packageId);
  if (!pkg) throw new Error(`unknown package ${packageId}`);
  const addons = [...new Set(addonIds)].map((id) => app.seed.FLIGHT_ADDONS.find((addon) => addon.id === id)?.priceIls ?? NaN);
  const base = slot.isPrimeTime && pkg.primeTimePriceIls ? pkg.primeTimePriceIls : pkg.priceIls;
  return base + addons.reduce((sum, price) => sum + price, 0);
}

async function voucherBalance(app: TestApp, code = SEED_VOUCHER_CODE): Promise<number | undefined> {
  return (await app.store.getVoucherByCode(code))?.currentBalanceIls;
}

describe('server-authoritative pricing', () => {
  it('charges exactly the server-side manifest whatever price fields the client injects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CONSUMER_PACKAGES),
        fc.subarray(ZERO_DURATION_ADDONS),
        injectedPriceFields,
        async (packageId, candidateAddons, injected) => {
          const app = await loadApp({ stripe: 'mocked' });
          const pkg = app.seed.SIMULATOR_PACKAGES.find((item) => item.id === packageId);
          if (!pkg) throw new Error(`unknown package ${packageId}`);
          // Training and Fear of Flying are noise-free: the server refuses any add-on for them (API-2).
          const addons = pkg.category === 'training' || pkg.category === 'fear_of_flying' ? [] : candidateAddons;
          const slot = await openSlotFor(app, pkg.durationMinutes);
          const { POST } = await app.routes.checkout();

          const response = await readRaw(
            await POST(
              apiRequest('/api/checkout', {
                body: { ...bookingCheckoutBody({ packageId, bookingDate: slot.date, startTime: slot.startTime, addons }), ...injected },
              })
            )
          );

          const total = expectedTotal(app, packageId, slot, addons);
          expect(response.status, response.text).toBe(201);
          expect(app.checkoutSessions).toHaveLength(1);
          expect(app.checkoutSessions[0].amountIls).toBe(total);
          const booking = await app.store.getBookingById(app.checkoutSessions[0].bookingId ?? '');
          expect(booking).toMatchObject({ totalIls: total, subtotalIls: total, discountIls: 0, status: 'pending' });
        }
      ),
      propertyOptions(30)
    );
  }, 60_000);

  it('charges a duplicated add-on only once', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await openSlotFor(app, 20);
    const { POST } = await app.routes.checkout();

    await POST(
      apiRequest('/api/checkout', {
        body: bookingCheckoutBody({
          bookingDate: slot.date,
          startTime: slot.startTime,
          addons: ['addon-hd-video', 'addon-hd-video', 'addon-hd-video'],
        }),
      })
    );

    expect(app.checkoutSessions[0]?.amountIls).toBe(expectedTotal(app, 'pkg-discovery-30', slot, ['addon-hd-video']));
  });

  it('creates a gift voucher worth exactly what is charged, ignoring injected balance fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 100_000 }),
        fc.record(
          {
            initialValueIls: injectedNumber,
            currentBalanceIls: injectedNumber,
            paymentStatus: fc.constantFrom('paid', 'refunded'),
            isRedeemed: fc.boolean(),
            code: fc.constantFrom('SD-VOUCH-ATTACKERCHOSEN0000', SEED_VOUCHER_CODE),
          },
          { requiredKeys: [] }
        ),
        async (amountIls, injected) => {
          const app = await loadApp({ stripe: 'mocked' });
          const { POST } = await app.routes.checkout();

          const response = await POST(apiRequest('/api/checkout', { body: { ...voucherCheckoutBody({ amountIls }), ...injected } }));

          expect(response.status).toBe(201);
          expect(app.checkoutSessions[0]?.amountIls).toBe(amountIls);
          const voucher = await app.store.getVoucherById(app.checkoutSessions[0]?.voucherId ?? '');
          expect(voucher).toMatchObject({ initialValueIls: amountIls, currentBalanceIls: 0, paymentStatus: 'pending', isRedeemed: false });
          expect(voucher?.code).not.toBe(injected.code);
          expect(await voucherBalance(app)).toBe(400);
        }
      ),
      propertyOptions(30)
    );
  }, 60_000);

  it('deducts exactly the server-side total from a voucher, ignoring injected totals and discounts', async () => {
    const app = await loadApp();
    const slot = await openSlotFor(app, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson<{ bookingReference: string }>(
      await POST(
        apiRequest('/api/checkout', {
          body: {
            ...bookingCheckoutBody({ bookingDate: slot.date, startTime: slot.startTime, addons: ['addon-logbook'], voucherCode: SEED_VOUCHER_CODE }),
            totalIls: 1,
            discountIls: 0,
            subtotalIls: 1,
          },
        })
      )
    );

    const total = expectedTotal(app, 'pkg-discovery-30', slot, ['addon-logbook']);
    expect(response.status).toBe(201);
    expect(await voucherBalance(app)).toBe(400 - total);
    expect(await app.store.getBookingByRef(response.body.bookingReference)).toMatchObject({
      subtotalIls: total,
      discountIls: total,
      totalIls: 0,
      paymentMethod: 'voucher',
    });
  });

  it('refuses a voucher that does not cover the order (409), leaving balance and bookings untouched', async () => {
    const app = await loadApp();
    const slot = await openSlotFor(app, 60);
    const before = await snapshotState(app);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(
      await POST(
        apiRequest('/api/checkout', {
          body: bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: slot.date, startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }),
        })
      )
    );

    expect(response.status).toBe(409);
    expect(response.json).toMatchObject({ error: expect.any(String) });
    expect(await snapshotState(app)).toBe(before);
  });

  it.each([
    ['negative', -500],
    ['zero', 0],
    ['below the minimum', 99.99],
    ['above the maximum', 100_000.01],
    ['astronomically large', 1e308],
    ['a numeric string', '500'],
    ['null', null],
  ])('rejects a gift voucher amount that is %s (400) and creates nothing', async (_label, amountIls) => {
    const app = await loadApp({ stripe: 'mocked' });
    const before = await snapshotState(app);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(await POST(apiRequest('/api/checkout', { body: voucherCheckoutBody({ amountIls }) })));

    expect(response.status).toBe(400);
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await snapshotState(app)).toBe(before);
  });

  it.each([
    ['the corporate package', { packageId: 'pkg-corporate-crm' }],
    ['an unknown package', { packageId: 'pkg-free-flight' }],
    ['an unknown add-on', { addons: ['addon-free-upgrade'] }],
    ['a past date', { bookingDate: '2026-10-31' }],
  ])('refuses checkout for %s (400) without contacting Stripe', async (_label, overrides) => {
    const app = await loadApp({ stripe: 'mocked' });
    const before = await snapshotState(app);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: '12:30', ...overrides }) })));

    expect(response.status).toBe(400);
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await snapshotState(app)).toBe(before);
  });
});

describe('fail-closed checkout when the application origin is misconfigured in production', () => {
  // NEXT_PUBLIC_APP_URL is blank here, exactly like the sandboxed browser-test server.
  const MISCONFIGURED = { NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: '' };

  it('does not consume the voucher or confirm a booking when it answers 503 (SEC-2)', async () => {
    const app = await loadApp({ env: MISCONFIGURED });
    const slot = await openSlotFor(app, 20);
    const before = await snapshotState(app);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(
      await POST(
        apiRequest('/api/checkout', { body: bookingCheckoutBody({ bookingDate: slot.date, startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }) })
      )
    );

    expect(response.status).toBe(503);
    expect(await voucherBalance(app)).toBe(400);
    expect(await snapshotState(app)).toBe(before);
  });

  it('does not leave a pending booking holding the slot when card checkout answers 503 (SEC-2)', async () => {
    const app = await loadApp({
      stripe: 'mocked',
      env: { NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: PRODUCTION_ORIGIN.replace('https:', 'http:'), STRIPE_SECRET_KEY: ['sk', 'live', 'qaOriginCheck000'].join('_') },
    });
    const slot = await openSlotFor(app, 20);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ bookingDate: slot.date, startTime: slot.startTime }) }))
    );

    expect(response.status).toBe(503);
    expect(app.checkoutSessions).toHaveLength(0);
    const after = await app.store.getAvailableSlots(slot.date, 20);
    expect(after.find((candidate) => candidate.startTime === slot.startTime)?.available).toBe(true);
  });
});

describe('brute-force protection', () => {
  const ATTEMPTS = 50;
  const CLIENT = { 'x-forwarded-for': '203.0.113.7' };

  it.fails('[KNOWN-DEFECT SEC-3] answers repeated failed voucher verifications from one client with HTTP 429', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.vouchers();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const code = `SD-VOUCH-GUESS${String(attempt).padStart(14, '0')}`;
      const response = await POST(apiRequest('/api/vouchers', { body: { action: 'verify', code }, headers: CLIENT }));
      statuses.push(response.status);
    }

    expect(statuses[0]).toBe(404);
    expect(statuses).toContain(429);
  });

  it.fails('[KNOWN-DEFECT SEC-4] answers repeated failed admin logins from one client with HTTP 429', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.bookings();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const authorization = basicAuth(TEST_ADMIN.user, `guess-password-${attempt}-0000000`);
      const response = await GET(apiRequest('/api/bookings', { headers: { authorization, ...CLIENT } }));
      statuses.push(response.status);
    }

    expect(statuses[0]).toBe(401);
    expect(statuses).toContain(429);
  });
});
