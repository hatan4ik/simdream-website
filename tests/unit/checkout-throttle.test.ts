import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readJson } from '../support/http';

const BOOKING = { kind: 'booking', pilotEmail: '  Pilot@Example.TEST ', bookingDate: '2099-11-10', startTime: '10:00' } as const;
const VOUCHER = { kind: 'voucher', senderEmail: 'Gifter@Example.test' } as const;

async function loadThrottle() {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'test');
  return import('@/lib/booking/checkout-throttle');
}

afterEach(() => {
  vi.doUnmock('@/lib/security/rate-limit');
});

describe('checkout throttle rules', () => {
  it('limits a booking per client address, normalized pilot email and departure', async () => {
    const { checkoutThrottleRules } = await loadThrottle();
    const request = apiRequest('/api/checkout', { headers: { 'x-forwarded-for': '203.0.113.7' } });

    expect(checkoutThrottleRules(request, BOOKING)).toEqual([
      { scope: 'checkout-init-ip', subject: '203.0.113.7', limit: 10, windowSeconds: 600 },
      { scope: 'checkout-init-email', subject: 'pilot@example.test', limit: 6, windowSeconds: 1800 },
      { scope: 'checkout-init-slot', subject: '2099-11-10T10:00', limit: 8, windowSeconds: 1800 },
    ]);
  });

  it('limits a gift voucher per client address and normalized sender email, with a larger shared bucket for unknown clients', async () => {
    const { checkoutThrottleRules } = await loadThrottle();

    expect(checkoutThrottleRules(apiRequest('/api/checkout'), VOUCHER)).toEqual([
      { scope: 'checkout-init-ip', subject: 'unknown-client', limit: 60, windowSeconds: 600 },
      { scope: 'checkout-init-email', subject: 'gifter@example.test', limit: 6, windowSeconds: 1800 },
    ]);
  });
});

describe('checkout throttle decision', () => {
  it('lets a first attempt through', async () => {
    const { throttleCheckout } = await loadThrottle();

    await expect(throttleCheckout(apiRequest('/api/checkout'), BOOKING)).resolves.toBeNull();
  });

  it('fails closed with a 503 and logs no request data when the limiter fails unexpectedly', async () => {
    vi.resetModules();
    vi.doMock('@/lib/security/rate-limit', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/security/rate-limit')>()),
      consumeRateLimit: async () => {
        throw new Error('driver exploded');
      },
    }));
    const { throttleCheckout } = await import('@/lib/booking/checkout-throttle');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await throttleCheckout(
      apiRequest('/api/checkout', { headers: { 'x-forwarded-for': '203.0.113.7' } }),
      BOOKING
    );

    expect(response).not.toBeNull();
    const body = await readJson(response as Response);
    expect(body.status).toBe(503);
    expect(body.headers.get('cache-control')).toBe('no-store');
    expect(body.body).toEqual({ error: 'Unable to start checkout. Please try again.' });
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls[0], Object.getOwnPropertyNames(new Error()));
    for (const secret of ['203.0.113.7', 'pilot@example.test', 'Pilot@Example.TEST', '2099-11-10T10:00']) {
      expect(logged).not.toContain(secret);
    }
  });
});
