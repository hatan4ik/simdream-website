import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readJson, TEST_ORIGIN } from '../support/http';
import type { RateLimitRule } from '@/lib/security/rate-limit';

// The route's own limiter, spied on so a test can make its store unavailable.
const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  actual: null as null | typeof import('@/lib/security/rate-limit'),
}));
vi.mock('@/lib/security/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security/rate-limit')>();
  limiter.actual = actual;
  return { ...actual, consumeRateLimit: limiter.consume };
});

const pricing = vi.hoisted(() => ({
  getConfig: vi.fn(),
  issueClaim: vi.fn(),
  calculate: vi.fn(),
  verifyBooking: vi.fn(),
  wixAvailability: vi.fn(),
  providerEnabled: vi.fn(),
  enforceable: vi.fn(),
}));

vi.mock('@/lib/wix/birthday-pricing-server', () => ({
  getWixBirthdayPricingProviderConfig: pricing.getConfig,
  issueWixBirthdayPricingClaim: pricing.issueClaim,
  calculateWixBirthdayBookingPrice: pricing.calculate,
  isWixBirthdayPricingProviderEnabled: pricing.providerEnabled,
}));
vi.mock('@/lib/wix/birthday-pricing-provider-auth', () => ({
  verifiedWixBirthdayPricingBooking: pricing.verifyBooking,
}));
vi.mock('@/lib/wix/config', () => ({ isWixAvailabilityAdapterEnabled: pricing.wixAvailability }));
vi.mock('@/lib/discounts/birthday', () => ({
  isBirthdayDiscountEnforceableOnActivePath: pricing.enforceable,
}));

import { POST as issueClaim } from '@/app/api/wix/birthday/claim/route';
import { POST as calculatePrice } from '@/app/api/wix/birthday-pricing/v1/calculate-price/route';
import { GET as capabilities } from '@/app/api/offers/capabilities/route';
import { requestWixBirthdayPricingClaim } from '@/lib/booking/client/wix-birthday-claim';
import { RateLimitUnavailableError } from '@/lib/security/rate-limit';
import { resetBirthdayClaimFallbackForTests } from '@/lib/wix/birthday-claim-throttle';
import { createFixedWindowLimiter } from '@/lib/wix/birthday-claim-fallback-limiter';

const config = {
  claimFieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  claimSecret: 'birthday-pricing-secret-that-is-longer-than-thirty-two-bytes',
  providerAppId: 'b4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  providerPublicKey: '-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----',
};

const SELECTION = { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: '2026-11-13' };
const CLAIM_REQUEST = { ...SELECTION, email: '  Captain@Example.com ', phone: '050-123 4567' };
const ISSUED = { ok: true, applied: true, fieldId: config.claimFieldId, token: 'opaque-proof' };

function claimRequest(body: unknown = CLAIM_REQUEST, address: string | null = '203.0.113.7'): Request {
  return apiRequest('/api/wix/birthday/claim', { body, headers: address ? { 'x-forwarded-for': address } : {} });
}

async function claimStatuses(requests: Request[]): Promise<number[]> {
  const statuses: number[] = [];
  for (const request of requests) statuses.push((await issueClaim(request)).status);
  return statuses;
}

beforeEach(() => {
  vi.resetAllMocks();
  limiter.consume.mockImplementation((rule: RateLimitRule) => limiter.actual!.consumeRateLimit(rule));
  limiter.actual!.resetInMemoryRateLimitsForTests();
  resetBirthdayClaimFallbackForTests();
  pricing.getConfig.mockReturnValue(config);
  pricing.issueClaim.mockResolvedValue(ISSUED);
  pricing.wixAvailability.mockReturnValue(false);
  pricing.providerEnabled.mockReturnValue(false);
  pricing.enforceable.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/wix/birthday/claim', () => {
  it('fails closed before the provider is configured', async () => {
    pricing.getConfig.mockReturnValue(null);
    const response = await readJson<{ error: string }>(await issueClaim(apiRequest('/api/wix/birthday/claim', { body: {} })));
    expect(response).toMatchObject({ status: 503, body: { error: 'Birthday pricing is temporarily unavailable.' } });
  });

  it('rejects a malformed request, or one without a valid email, before issuing or counting anything', async () => {
    const { email: _email, ...withoutEmail } = CLAIM_REQUEST;
    for (const request of [
      apiRequest('/api/wix/birthday/claim', { rawBody: '{' }),
      claimRequest(withoutEmail),
      claimRequest({ ...CLAIM_REQUEST, email: 'not-an-email' }),
      claimRequest({ ...CLAIM_REQUEST, packageId: '' }),
    ]) {
      const response = await readJson<{ error: string }>(await issueClaim(request));
      expect(response).toMatchObject({ status: 400, body: { error: 'Use a valid birthday, flight selection and email.' } });
    }
    expect(pricing.issueClaim).not.toHaveBeenCalled();
    expect(limiter.consume).not.toHaveBeenCalled();
  });

  it('hands the issuer the normalized email and the phone, and refuses an ineligible request', async () => {
    pricing.issueClaim.mockResolvedValueOnce({ ok: false, reason: 'invalid-birthday' });
    const response = await readJson<{ error: string }>(await issueClaim(claimRequest()));
    expect(response).toMatchObject({ status: 400, body: { error: 'Use a valid birthday, flight selection and email.' } });
    expect(pricing.issueClaim).toHaveBeenCalledWith({ ...SELECTION, email: 'captain@example.com', phone: '050-123 4567' }, { config });
  });

  it('returns only the opaque field proof when eligible', async () => {
    const response = await readJson<{ applied: boolean; fieldId: string; token: string }>(await issueClaim(claimRequest()));
    expect(response).toMatchObject({ status: 200, body: { applied: true, fieldId: config.claimFieldId, token: 'opaque-proof' } });
    expect(JSON.stringify(response.body)).not.toContain('1990');
  });

  it('answers applied false for a valid but non-qualifying date and 503 on an issuer outage', async () => {
    pricing.issueClaim.mockResolvedValueOnce({ ok: true, applied: false }).mockRejectedValueOnce(new Error('unavailable'));
    await expect(readJson(await issueClaim(claimRequest()))).resolves.toMatchObject({ status: 200, body: { applied: false } });
    await expect(readJson(await issueClaim(claimRequest()))).resolves.toMatchObject({
      status: 503,
      body: { error: 'Birthday pricing is temporarily unavailable.' },
    });
  });
});

describe('POST /api/wix/birthday/claim issuance limits', () => {
  // A fixed clock 30 seconds into a window, so no test straddles a window boundary.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T12:00:30.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refuses the 11th issuance from one address in ten minutes with 429 and Retry-After', async () => {
    const requests = Array.from({ length: 11 }, (_, index) => claimRequest({ ...CLAIM_REQUEST, email: `pilot${index}@example.com` }));
    const statuses = await claimStatuses(requests.slice(0, 10));
    expect(statuses).toEqual(Array(10).fill(200));

    const refused = await readJson<{ error: string }>(await issueClaim(requests[10]!));
    expect(refused).toMatchObject({ status: 429, body: { error: 'Too many birthday pricing requests. Please wait and try again.' } });
    expect(refused.headers.get('retry-after')).toBe('570');
    expect(refused.headers.get('cache-control')).toBe('no-store');
    expect(pricing.issueClaim).toHaveBeenCalledTimes(10);
    // Another address is unaffected.
    expect((await issueClaim(claimRequest({ ...CLAIM_REQUEST, email: 'pilot10@example.com' }, '198.51.100.9'))).status).toBe(200);
  });

  it('refuses the 6th issuance for one email in an hour, from any address and in any letter case', async () => {
    const emails = ['captain@example.com', ' CAPTAIN@example.com', 'Captain@Example.com ', 'captain@EXAMPLE.com', 'captain@example.com'];
    const statuses = await claimStatuses(emails.map((email, index) => claimRequest({ ...CLAIM_REQUEST, email }, `203.0.113.${index + 1}`)));
    expect(statuses).toEqual(Array(5).fill(200));
    const refused = await issueClaim(claimRequest(CLAIM_REQUEST, '203.0.113.99'));
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('3570');
    expect(pricing.issueClaim).toHaveBeenCalledTimes(5);
  });

  it('gives requests without a client address one shared, looser bucket', async () => {
    const requests = Array.from({ length: 61 }, (_, index) => claimRequest({ ...CLAIM_REQUEST, email: `pilot${index}@example.com` }, null));
    expect(await claimStatuses(requests.slice(0, 60))).toEqual(Array(60).fill(200));
    expect((await issueClaim(requests[60]!)).status).toBe(429);
  });

  it('keeps issuing on a bounded in-process limit when the limiter store is unavailable', async () => {
    limiter.consume.mockRejectedValue(new RateLimitUnavailableError());
    await expect(readJson(await issueClaim(claimRequest()))).resolves.toMatchObject({ status: 200, body: { applied: true } });

    // Per email: still 5 per hour, so the 6th issuance for the same email is refused.
    const sameEmail = Array.from({ length: 5 }, (_, index) => claimRequest(CLAIM_REQUEST, `198.51.100.${index + 1}`));
    expect(await claimStatuses(sameEmail)).toEqual([200, 200, 200, 200, 429]);

    // Per address: 60 per 10 minutes, because the Wix Worker cannot yet trust the address.
    const sameAddress = Array.from({ length: 60 }, (_, index) => claimRequest({ ...CLAIM_REQUEST, email: `pilot${index}@example.com` }, '192.0.2.1'));
    expect(await claimStatuses(sameAddress)).toEqual(Array(60).fill(200));
    const refused = await issueClaim(claimRequest({ ...CLAIM_REQUEST, email: 'pilot60@example.com' }, '192.0.2.1'));
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('570');
  });

  it('fails closed with 503 and logs no request data when the limiter fails unexpectedly', async () => {
    limiter.consume.mockRejectedValue(new Error('driver exploded'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await readJson<{ error: string }>(await issueClaim(claimRequest()));
    expect(response).toMatchObject({ status: 503, body: { error: 'Birthday pricing is temporarily unavailable.' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(pricing.issueClaim).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls[0], Object.getOwnPropertyNames(new Error()));
    for (const secret of ['203.0.113.7', 'captain@example.com', 'Captain@Example.com', '050-123 4567', '1990-11-25']) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe('the in-process fallback limiter', () => {
  const rule = (subject: string): RateLimitRule => ({ scope: 'birthday-claim-identity', subject, limit: 1, windowSeconds: 60 });

  it('counts per subject in fixed windows', async () => {
    let now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const fallback = createFixedWindowLimiter({ maxBuckets: 10, now: () => now });
    await expect(fallback.consume(rule('a'))).resolves.toEqual({ allowed: true, retryAfterSeconds: 60 });
    await expect(fallback.consume(rule('a'))).resolves.toEqual({ allowed: false, retryAfterSeconds: 60 });
    await expect(fallback.consume(rule('b'))).resolves.toMatchObject({ allowed: true });
    now += 60_000;
    await expect(fallback.consume(rule('a'))).resolves.toMatchObject({ allowed: true });
  });

  it('never tracks more subjects than its cap, dropping expired windows first and then the oldest', async () => {
    let now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const fallback = createFixedWindowLimiter({ maxBuckets: 2, now: () => now });
    await fallback.consume(rule('a'));
    await fallback.consume(rule('b'));
    await fallback.consume(rule('c'));
    expect(fallback.size()).toBe(2);
    // 'c' is still counted; 'a' was the oldest and was dropped, so it starts a fresh count.
    await expect(fallback.consume(rule('c'))).resolves.toMatchObject({ allowed: false });
    await expect(fallback.consume(rule('a'))).resolves.toMatchObject({ allowed: true });
    await expect(fallback.consume(rule('a'))).resolves.toMatchObject({ allowed: false });
    expect(fallback.size()).toBe(2);

    // Once both windows have closed, a new subject replaces both expired buckets.
    now += 60_000;
    await fallback.consume({ ...rule('d'), windowSeconds: 3_600 });
    expect(fallback.size()).toBe(1);
    await fallback.consume({ ...rule('e'), windowSeconds: 3_600 });
    expect(fallback.size()).toBe(2);
    fallback.clear();
    expect(fallback.size()).toBe(0);
  });
});

describe('browser birthday claim request', () => {
  it('sends the normalized email and the phone, which the route hands to the issuer', async () => {
    const fetchMock = vi.fn((input: string, init?: RequestInit) => issueClaim(new Request(new URL(input, TEST_ORIGIN), init)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestWixBirthdayPricingClaim({ ...SELECTION, pilotEmail: ' Captain@Example.com ', pilotPhone: ' 050-123 4567 ' }, 'pricing failed')
    ).resolves.toEqual({ fieldId: config.claimFieldId, token: 'opaque-proof' });
    expect(fetchMock).toHaveBeenCalledWith('/api/wix/birthday/claim', expect.objectContaining({ method: 'POST' }));
    expect(pricing.issueClaim).toHaveBeenCalledWith({ ...SELECTION, email: 'captain@example.com', phone: '050-123 4567' }, { config });
  });

  it('throws the given message unless a claim was issued', async () => {
    for (const response of [
      Response.json({ error: 'Too many birthday pricing requests. Please wait and try again.' }, { status: 429 }),
      Response.json({ applied: false }),
      new Response('not json', { status: 200 }),
    ]) {
      vi.stubGlobal('fetch', vi.fn(async () => response));
      await expect(requestWixBirthdayPricingClaim({ ...SELECTION, pilotEmail: 'a@example.com' }, 'pricing failed')).rejects.toThrow('pricing failed');
    }
  });
});

describe('POST /api/wix/birthday-pricing/v1/calculate-price', () => {
  it('only accepts a Wix-authenticated booking', async () => {
    pricing.verifyBooking.mockResolvedValue(null);
    const response = await readJson<{ error: string }>(
      await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'unsigned' }))
    );
    expect(response).toMatchObject({ status: 401, body: { error: 'Invalid Wix pricing-provider request.' } });
  });

  it('returns the provider price only for a priceable booking', async () => {
    const booking = { bookedEntity: { slot: { serviceId: 'service' } } };
    pricing.verifyBooking.mockResolvedValue(booking);
    pricing.calculate.mockResolvedValue({ ok: true, calculatedPrice: 807, birthdayApplied: true });
    const response = await readJson<{ calculatedPrice: number }>(
      await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'signed-wix-jwt' }))
    );
    expect(response).toMatchObject({ status: 200, body: { calculatedPrice: 807 } });
    expect(pricing.calculate).toHaveBeenCalledWith(booking, { config });
  });

  it('refuses an off-grid departure with the same error as any booking it cannot price', async () => {
    pricing.verifyBooking.mockResolvedValue({ bookedEntity: { slot: { serviceId: 'service' } } });
    pricing.calculate.mockResolvedValue({ ok: false, code: 'off-grid-departure' });
    const response = await readJson<{ error: string; calculatedPrice?: number }>(
      await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'signed-wix-jwt' }))
    );
    expect(response).toMatchObject({ status: 400, body: { error: 'Wix booking could not be priced.' } });
    expect(response.body.calculatedPrice).toBeUndefined();
  });

  it('fails closed for an unsupported booking, a calculator outage, or missing config', async () => {
    pricing.verifyBooking.mockResolvedValue({});
    pricing.calculate.mockResolvedValueOnce({ ok: false, code: 'unsupported-service' }).mockRejectedValueOnce(new Error('offline'));
    await expect(readJson(await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'signed' })))).resolves.toMatchObject({
      status: 400,
      body: { error: 'Wix booking could not be priced.' },
    });
    await expect(readJson(await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'signed' })))).resolves.toMatchObject({
      status: 503,
      body: { error: 'Pricing provider is temporarily unavailable.' },
    });
    pricing.getConfig.mockReturnValue(null);
    await expect(readJson(await calculatePrice(apiRequest('/api/wix/birthday-pricing/v1/calculate-price', { rawBody: 'signed' })))).resolves.toMatchObject({
      status: 503,
      body: { error: 'Pricing provider is not configured.' },
    });
  });
});

describe('GET /api/offers/capabilities', () => {
  it('reports the dynamic provider capability and passes it through to the enforceability policy', async () => {
    pricing.wixAvailability.mockReturnValueOnce(false).mockReturnValueOnce(true);
    // The provider check is intentionally short-circuited on the local path.
    pricing.providerEnabled.mockReturnValue(true);
    pricing.enforceable.mockReturnValueOnce(true).mockReturnValueOnce(true);

    const local = await readJson<{ birthdayDiscountEnforceable: boolean; wixBirthdayPricingProviderEnabled: boolean }>(await capabilities());
    const wix = await readJson<{ birthdayDiscountEnforceable: boolean; wixBirthdayPricingProviderEnabled: boolean }>(await capabilities());

    expect(local).toMatchObject({ status: 200, body: { birthdayDiscountEnforceable: true, wixBirthdayPricingProviderEnabled: false } });
    expect(wix).toMatchObject({ status: 200, body: { birthdayDiscountEnforceable: true, wixBirthdayPricingProviderEnabled: true } });
    expect(local.headers.get('cache-control')).toContain('s-maxage=60');
    expect(pricing.enforceable).toHaveBeenNthCalledWith(1, { wixAuthoritative: false, wixPathCanEnforce: false });
    expect(pricing.enforceable).toHaveBeenNthCalledWith(2, { wixAuthoritative: true, wixPathCanEnforce: true });
  });
});
