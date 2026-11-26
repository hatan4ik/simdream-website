import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The two Wix checkout starts are unauthenticated and each one fans out to Wix (availability reads, a
// redirect session), so one client must not be able to drive them without bound. They also run on the
// Wix-hosted Worker, which has no durable limiter store, so they must never answer 503 for that reason.

const resolveWixBookingCheckout = vi.hoisted(() => vi.fn());
const resolveWixPlanId = vi.hoisted(() => vi.fn());
const createPlanCheckoutUrl = vi.hoisted(() => vi.fn());

vi.mock('@/lib/wix/booking-checkout', async (original) => ({
  ...(await original<typeof import('@/lib/wix/booking-checkout')>()),
  resolveWixBookingCheckout,
}));
vi.mock('@/lib/wix', async (original) => ({
  ...(await original<typeof import('@/lib/wix')>()),
  resolveWixPlanId,
  createPlanCheckoutUrl,
}));

const ORIGIN = 'https://simdream.co.il';
const ADDRESS_A = { 'x-forwarded-for': '203.0.113.7' };
const ADDRESS_B = { 'x-forwarded-for': '198.51.100.20' };

const bookingRequest = (headers: Record<string, string> = {}, body: unknown = { packageId: 'pkg-captain-60', bookingDate: '2027-01-10', startTime: '10:00' }) =>
  new Request(`${ORIGIN}/api/wix/bookings/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const subscriptionJson = (headers: Record<string, string> = {}, planId = 'flight-foundations-5x60') =>
  new NextRequest(`${ORIGIN}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ planId }),
  });

const subscriptionPage = (headers: Record<string, string> = {}) =>
  new NextRequest(`${ORIGIN}/api/subscriptions/checkout?planId=flight-foundations-5x60`, {
    method: 'GET',
    headers: { accept: 'text/html', ...headers },
  });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T10:00:00Z') });
  resolveWixBookingCheckout.mockReset().mockResolvedValue({ ok: true });
  resolveWixPlanId.mockReset().mockResolvedValue('wix-plan-guid');
  createPlanCheckoutUrl.mockReset().mockResolvedValue('https://checkout.wix.com/plan');
  (await import('@/lib/security/rate-limit')).resetInMemoryRateLimitsForTests();
  (await import('@/lib/wix/checkout-start-throttle')).resetWixCheckoutStartFallbackForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('POST /api/wix/bookings/checkout', () => {
  it('refuses the 31st lookup from one address in ten minutes with 429 and makes no Wix call for it', async () => {
    const { POST } = await import('@/app/api/wix/bookings/checkout/route');
    for (let attempt = 0; attempt < 30; attempt += 1) expect((await POST(bookingRequest(ADDRESS_A))).status).toBe(200);

    const refused = await POST(bookingRequest(ADDRESS_A));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await refused.json()).toEqual({ error: 'Too many checkout attempts. Please wait and try again.' });
    expect(resolveWixBookingCheckout).toHaveBeenCalledTimes(30);
    expect((await POST(bookingRequest(ADDRESS_B))).status).toBe(200);

    vi.setSystemTime(new Date('2026-11-01T10:10:00Z'));
    expect((await POST(bookingRequest(ADDRESS_A))).status).toBe(200);
  });

  it('does not count a request the schema refuses', async () => {
    const { POST } = await import('@/app/api/wix/bookings/checkout/route');
    for (let attempt = 0; attempt < 40; attempt += 1) expect((await POST(bookingRequest(ADDRESS_A, { packageId: '' }))).status).toBe(400);

    expect((await POST(bookingRequest(ADDRESS_A))).status).toBe(200);
  });

  it('gives requests with no resolvable address a looser shared limit', async () => {
    const { POST } = await import('@/app/api/wix/bookings/checkout/route');
    for (let attempt = 0; attempt < 240; attempt += 1) expect((await POST(bookingRequest())).status).toBe(200);

    expect((await POST(bookingRequest())).status).toBe(429);
  });
});

describe('/api/subscriptions/checkout', () => {
  it('refuses the 11th JSON start from one address with 429 and creates no Wix redirect for it', async () => {
    const { POST } = await import('@/app/api/subscriptions/checkout/route');
    for (let attempt = 0; attempt < 10; attempt += 1) expect((await POST(subscriptionJson(ADDRESS_A))).status).toBe(200);

    const refused = await POST(subscriptionJson(ADDRESS_A));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(resolveWixPlanId).toHaveBeenCalledTimes(10);
    expect(createPlanCheckoutUrl).toHaveBeenCalledTimes(10);
    expect((await POST(subscriptionJson(ADDRESS_B))).status).toBe(200);
  });

  it('sends a throttled page navigation to the dispatch contact page instead of a JSON error, with no Wix call', async () => {
    const { GET } = await import('@/app/api/subscriptions/checkout/route');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await GET(subscriptionPage(ADDRESS_A))).headers.get('location')).toBe('https://checkout.wix.com/plan');
    }

    const throttled = await GET(subscriptionPage(ADDRESS_A));

    expect(throttled.status).toBe(303);
    expect(throttled.headers.get('location')).toContain('/contact?subject=subscription&plan=flight-foundations-5x60');
    expect(createPlanCheckoutUrl).toHaveBeenCalledTimes(10);
  });

  it('does not count an unknown plan', async () => {
    const { POST } = await import('@/app/api/subscriptions/checkout/route');
    for (let attempt = 0; attempt < 20; attempt += 1) expect((await POST(subscriptionJson(ADDRESS_A, 'no-such-plan'))).status).toBe(400);

    expect((await POST(subscriptionJson(ADDRESS_A))).status).toBe(200);
  });
});

describe('without a durable limiter store (the Wix-hosted Worker)', () => {
  it('counts in process with the loose shared limit and never answers 503', async () => {
    const rateLimit = await import('@/lib/security/rate-limit');
    vi.spyOn(rateLimit, 'consumeRateLimit').mockRejectedValue(new rateLimit.RateLimitUnavailableError());
    const { throttleWixCheckoutStart } = await import('@/lib/wix/checkout-start-throttle');

    for (let attempt = 0; attempt < 240; attempt += 1) {
      expect((await throttleWixCheckoutStart(bookingRequest(ADDRESS_A), 'wix-booking-checkout-ip')).allowed).toBe(true);
    }
    const refused = await throttleWixCheckoutStart(bookingRequest(ADDRESS_A), 'wix-booking-checkout-ip');

    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });
});
