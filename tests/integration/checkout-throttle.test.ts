import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest } from '../support/http';
import { EMPTY_DAY, findSlotWhere, postCheckout } from './api-helpers';
import { errorBody, expectContract, stripeCheckoutStarted } from './contracts';

/**
 * Checkout initialization is throttled before any record is created (lib/booking/checkout-throttle.ts):
 * per client address, per normalized email and per departure, with the durable limiter of
 * lib/security/rate-limit.ts. The Wix Gift Cards path has no limiter store and is never throttled.
 */

const DAY = EMPTY_DAY.sunday;
const THROTTLED = 'Too many checkout attempts. Please wait and try again.';
const UNAVAILABLE = 'Unable to start checkout. Please try again.';
const TEN_MINUTES_MS = 10 * 60_000;

function from(address: string): Record<string, string> {
  return { 'x-forwarded-for': address };
}

async function openThirtyMinuteStart(app: TestApp): Promise<string> {
  return (await findSlotWhere(app, DAY, 30, (candidate) => candidate.available, 'open')).startTime;
}

async function bookOpenDeparture(app: TestApp, pilotEmail: string, headers: Record<string, string>) {
  const startTime = await openThirtyMinuteStart(app);
  return postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime, pilotEmail }), headers);
}

function expectThrottled(response: { status: number; headers: Headers; body: unknown }, retryAfterSeconds: number) {
  expect(response.status).toBe(429);
  expect(expectContract(errorBody, response.body).error).toBe(THROTTLED);
  expect(response.headers.get('retry-after')).toBe(String(retryAfterSeconds));
  expect(response.headers.get('cache-control')).toBe('no-store');
}

afterEach(() => {
  vi.doUnmock('@/lib/security/rate-limit');
  vi.doUnmock('@/lib/wix');
});

describe('POST /api/checkout: per-address throttle', () => {
  it('refuses the 11th checkout from one address inside ten minutes without creating a booking, then recovers', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const accepted = await bookOpenDeparture(app, `pilot-${attempt}@throttle.test`, from('203.0.113.10'));
      expect(accepted.status, JSON.stringify(accepted.body)).toBe(201);
    }
    const bookingsBefore = (await app.store.getBookings()).length;
    const startTime = await openThirtyMinuteStart(app);
    const eleventh = bookingCheckoutBody({ bookingDate: DAY, startTime, pilotEmail: 'pilot-11@throttle.test' });

    const refused = await postCheckout(app, eleventh, from('203.0.113.10'));

    expectThrottled(refused, 600);
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect(app.checkoutSessions).toHaveLength(10);
    expect(await app.store.getBookingsByEmail('pilot-11@throttle.test')).toEqual([]);

    // Another address is not affected by this one's exhaustion.
    expect((await postCheckout(app, eleventh, from('203.0.113.11'))).status).toBe(201);

    vi.setSystemTime(Date.now() + TEN_MINUTES_MS);
    const recovered = await bookOpenDeparture(app, 'pilot-12@throttle.test', from('203.0.113.10'));
    expect(recovered.status).toBe(201);
    expectContract(stripeCheckoutStarted, recovered.body);
  });

  it('answers with the longest wait among the refused rules', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const sameBuyer = voucherCheckoutBody({ senderEmail: 'repeat-buyer@throttle.test' });
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      expect((await postCheckout(app, sameBuyer, from('203.0.113.20'))).status).toBe(201);
    }
    for (let attempt = 7; attempt <= 10; attempt += 1) {
      // The email rule (6 per 30 minutes) refuses; the address rule (10 per 10 minutes) still accepts.
      expectThrottled(await postCheckout(app, sameBuyer, from('203.0.113.20')), 1800);
    }

    // Now both rules refuse: the email window ends later than the address window.
    expectThrottled(await postCheckout(app, sameBuyer, from('203.0.113.20')), 1800);
    expectThrottled(
      await postCheckout(app, voucherCheckoutBody({ senderEmail: 'other-buyer@throttle.test' }), from('203.0.113.20')),
      600
    );
    expect(app.checkoutSessions).toHaveLength(6);
  });

  it('spends no allowance on a body it refuses before validation, oversized or malformed', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { POST } = await app.routes.checkout();
    const send = async (rawBody: string) =>
      (await POST(apiRequest('/api/checkout', { rawBody, headers: { 'content-type': 'application/json', ...from('203.0.113.40') } }))).status;
    const oversized = JSON.stringify({ ...voucherCheckoutBody(), padding: 'x'.repeat(16 * 1024) });

    // Eleven of each would exhaust the ten-per-address allowance if either kind were counted.
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      expect(await send(oversized)).toBe(413);
      expect(await send('{"kind":')).toBe(400);
    }

    const accepted = await postCheckout(app, voucherCheckoutBody(), from('203.0.113.40'));
    expect(accepted.status).toBe(201);
    expect(app.checkoutSessions).toHaveLength(1);
  });

  it('gives requests without a usable client address one shared, larger bucket', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const response = await postCheckout(app, voucherCheckoutBody({ senderEmail: `buyer-${attempt}@throttle.test` }));
      expect(response.status).toBe(201);
    }

    expectThrottled(await postCheckout(app, voucherCheckoutBody({ senderEmail: 'buyer-61@throttle.test' })), 600);
    // A forged, unparseable header falls into the same shared bucket.
    expectThrottled(
      await postCheckout(app, voucherCheckoutBody({ senderEmail: 'buyer-62@throttle.test' }), from('attacker.example')),
      600
    );
    // A real client address has its own bucket.
    const addressed = await postCheckout(app, voucherCheckoutBody({ senderEmail: 'buyer-63@throttle.test' }), from('203.0.113.30'));
    expect(addressed.status).toBe(201);
    expect(app.checkoutSessions).toHaveLength(61);
  });
});

describe('POST /api/checkout: per-email and per-departure throttles', () => {
  it('limits one normalized email to six checkouts in thirty minutes whatever address it comes from', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await postCheckout(app, voucherCheckoutBody({ senderEmail: 'gifter@throttle.test' }), from(`198.51.100.${attempt}`));
      expect(response.status).toBe(201);
    }

    const refused = await postCheckout(
      app,
      voucherCheckoutBody({ senderEmail: '  Gifter@Throttle.TEST ' }),
      from('198.51.100.7')
    );

    expectThrottled(refused, 1800);
    expect(app.checkoutSessions).toHaveLength(6);
    expect((await app.store.getVouchers()).filter((voucher) => voucher.senderEmail === 'gifter@throttle.test')).toHaveLength(6);
  });

  it('limits one departure to eight checkout attempts in thirty minutes whatever address and email they use', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const startTime = await openThirtyMinuteStart(app);
    const attempt = (index: number) =>
      postCheckout(
        app,
        bookingCheckoutBody({ bookingDate: DAY, startTime, pilotEmail: `contender-${index}@throttle.test` }),
        from(`192.0.2.${index}`)
      );

    expect((await attempt(1)).status).toBe(201);
    for (let index = 2; index <= 8; index += 1) {
      // Counted even though the departure is already held by the first contender.
      expect((await attempt(index)).status).toBe(409);
    }
    const bookingsBefore = (await app.store.getBookings()).length;

    expectThrottled(await attempt(9), 1800);
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);

    // The same address and email may still check out a different departure.
    const elsewhere = await bookOpenDeparture(app, 'contender-9@throttle.test', from('192.0.2.9'));
    expect(elsewhere.status).toBe(201);
  });
});

describe('POST /api/checkout: limiter outage', () => {
  async function appWithUnavailableLimiter() {
    const app = await loadApp({ stripe: 'mocked' });
    vi.doMock('@/lib/security/rate-limit', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/security/rate-limit')>();
      return {
        ...actual,
        consumeRateLimit: async () => {
          throw new actual.RateLimitUnavailableError();
        },
      };
    });
    return app;
  }

  it('fails closed with a 503 and creates no booking when the limiter cannot be reached', async () => {
    const app = await appWithUnavailableLimiter();
    const startTime = await openThirtyMinuteStart(app);
    const bookingsBefore = (await app.store.getBookings()).length;

    const response = await postCheckout(app, bookingCheckoutBody({ bookingDate: DAY, startTime }), from('203.0.113.40'));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe(UNAVAILABLE);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await app.store.getBookings()).length).toBe(bookingsBefore);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('fails closed with a 503 and creates no voucher when the limiter cannot be reached', async () => {
    const app = await appWithUnavailableLimiter();
    const vouchersBefore = (await app.store.getVouchers()).length;

    const response = await postCheckout(app, voucherCheckoutBody(), from('203.0.113.41'));

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe(UNAVAILABLE);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await app.store.getVouchers()).length).toBe(vouchersBefore);
    expect(app.checkoutSessions).toHaveLength(0);
  });
});

describe('POST /api/checkout: Wix Gift Cards', () => {
  it('is never throttled: the Wix deployment has no durable limiter store and keeps selling', async () => {
    // Production rules with no Supabase: any call to the durable limiter would fail closed with a 503.
    const app = await loadApp({
      env: { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '', NEXT_PUBLIC_WIX_CLIENT_ID: 'e03e8493-b29e-4681-9a76-30685ff52096' },
    });
    const createWixGiftCardCheckout = vi.fn(async () => ({ kind: 'wix', cartId: 'cart-1', checkoutUrl: 'https://wix.example.test/checkout' }));
    vi.doMock('@/lib/wix', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/wix')>()),
      createWixGiftCardCheckout,
    }));

    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const response = await postCheckout(app, voucherCheckoutBody(), from('203.0.113.50'));
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ kind: 'wix', cartId: 'cart-1' });
    }
    expect(createWixGiftCardCheckout).toHaveBeenCalledTimes(12);
  });
});
