import { describe, expect, it } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { BOOKING_DATE, FAKE_LIVE_STRIPE_KEY, PRODUCTION_ORIGIN, SEED_VOUCHER_CODE } from './security-helpers';

const PRODUCTION_PAYMENTS = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_URL: PRODUCTION_ORIGIN,
  STRIPE_SECRET_KEY: FAKE_LIVE_STRIPE_KEY,
};

const HOSTILE_REQUESTS: Array<{ label: string; url: string; headers: Record<string, string> }> = [
  {
    label: 'hostile Host',
    url: 'http://evil.example/api/checkout',
    headers: { host: 'evil.example' },
  },
  {
    label: 'hostile Origin and Referer',
    url: 'http://localhost:3000/api/checkout',
    headers: { origin: 'https://evil.example', referer: 'https://evil.example/phish' },
  },
  {
    label: 'hostile X-Forwarded-Host/Proto',
    url: 'http://localhost:3000/api/checkout',
    headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'http', 'x-forwarded-port': '8080' },
  },
  {
    label: 'hostile RFC 7239 Forwarded',
    url: 'http://localhost:3000/api/checkout',
    headers: { forwarded: 'for=203.0.113.7;host=evil.example;proto=http' },
  },
  {
    label: 'every hostile header at once',
    url: 'https://evil.example:8443/api/checkout',
    headers: {
      host: 'evil.example:8443',
      origin: 'https://evil.example',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'http',
      forwarded: 'host=evil.example',
    },
  },
];

function expectProductionUrl(value: string | undefined, path: string): void {
  expect(value).toBeDefined();
  const url = new URL(value ?? '');
  expect(url.origin).toBe(PRODUCTION_ORIGIN);
  expect(url.pathname).toBe(path);
  expect(value).not.toContain('evil');
}

describe('checkout redirect URLs ignore request-controlled host data in production', () => {
  it.each(HOSTILE_REQUESTS)('keeps card booking success and cancel URLs on the configured origin with $label', async ({ url, headers }) => {
    const app = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await POST(apiRequest(url, { headers, body: bookingCheckoutBody({ startTime: slot.startTime }) }));

    expect(response.status).toBe(201);
    expect(app.checkoutSessions).toHaveLength(1);
    expectProductionUrl(app.checkoutSessions[0].successUrl.replace('{CHECKOUT_SESSION_ID}', 'cs'), '/book/success');
    expectProductionUrl(app.checkoutSessions[0].cancelUrl, '/book');
  });

  it.each(HOSTILE_REQUESTS)('keeps gift voucher success and cancel URLs on the configured origin with $label', async ({ url, headers }) => {
    const app = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS });
    const { POST } = await app.routes.checkout();

    const response = await POST(apiRequest(url, { headers, body: voucherCheckoutBody() }));

    expect(response.status).toBe(201);
    expectProductionUrl(app.checkoutSessions[0]?.successUrl.replace('{CHECKOUT_SESSION_ID}', 'cs'), '/vouchers');
    expectProductionUrl(app.checkoutSessions[0]?.cancelUrl, '/vouchers');
  });

  it.each(HOSTILE_REQUESTS)('returns a voucher-funded success URL on the configured origin with $label', async ({ url, headers }) => {
    const app = await loadApp({ env: PRODUCTION_PAYMENTS });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson<{ successUrl: string }>(
      await POST(apiRequest(url, { headers, body: bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }) }))
    );

    expect(response.status).toBe(201);
    expectProductionUrl(response.body.successUrl, '/book/success');
  });

  it('refuses to build redirect URLs from a plain-HTTP configured origin in production (503, no Stripe session)', async () => {
    const app = await loadApp({ stripe: 'mocked', env: { ...PRODUCTION_PAYMENTS, NEXT_PUBLIC_APP_URL: 'http://www.simdream.co.il' } });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson(await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: slot.startTime }) })));

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Unable to start checkout. Please try again.' });
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('cannot be steered to another site through the booking reference embedded in the success URL', async () => {
    const app = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    await POST(
      apiRequest('/api/checkout', {
        body: bookingCheckoutBody({ startTime: slot.startTime, pilotName: '//evil.example/@x', notes: 'https://evil.example' }),
      })
    );

    const success = new URL(app.checkoutSessions[0]?.successUrl ?? '');
    expect(success.origin).toBe(PRODUCTION_ORIGIN);
    expect(success.searchParams.get('ref')).toMatch(/^SD-737-[A-Z2-9]{16}$/);
    expect([...success.searchParams.keys()].sort()).toEqual(['ref', 'session_id']);
  });
});
