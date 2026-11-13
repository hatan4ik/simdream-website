import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readJson } from '../support/http';

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

const config = {
  claimFieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  claimSecret: 'birthday-pricing-secret-that-is-longer-than-thirty-two-bytes',
  providerAppId: 'b4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  providerPublicKey: '-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----',
};

beforeEach(() => {
  vi.resetAllMocks();
  pricing.getConfig.mockReturnValue(config);
  pricing.wixAvailability.mockReturnValue(false);
  pricing.providerEnabled.mockReturnValue(false);
  pricing.enforceable.mockReturnValue(true);
});

describe('POST /api/wix/birthday/claim', () => {
  it('fails closed before the provider is configured', async () => {
    pricing.getConfig.mockReturnValue(null);
    const response = await readJson<{ error: string }>(await issueClaim(apiRequest('/api/wix/birthday/claim', { body: {} })));
    expect(response).toMatchObject({ status: 503, body: { error: 'Birthday pricing is temporarily unavailable.' } });
  });

  it('rejects malformed or ineligible requests without leaking a birthday', async () => {
    pricing.issueClaim.mockResolvedValue({ ok: false, reason: 'invalid-request' });
    const response = await readJson<{ error: string }>(
      await issueClaim(apiRequest('/api/wix/birthday/claim', { rawBody: '{' }))
    );
    expect(response).toMatchObject({ status: 400, body: { error: 'Use a valid birthday and flight selection.' } });
    expect(pricing.issueClaim).toHaveBeenCalledWith(null, { config });
  });

  it('returns only the opaque field proof when eligible', async () => {
    pricing.issueClaim.mockResolvedValue({ ok: true, applied: true, fieldId: config.claimFieldId, token: 'opaque-proof' });
    const response = await readJson<{ applied: boolean; fieldId: string; token: string }>(
      await issueClaim(apiRequest('/api/wix/birthday/claim', { body: { birthDate: '1990-11-25' } }))
    );
    expect(response).toMatchObject({ status: 200, body: { applied: true, fieldId: config.claimFieldId, token: 'opaque-proof' } });
    expect(JSON.stringify(response.body)).not.toContain('1990');
  });

  it('answers applied false for a valid but non-qualifying date and 503 on an issuer outage', async () => {
    pricing.issueClaim.mockResolvedValueOnce({ ok: true, applied: false }).mockRejectedValueOnce(new Error('unavailable'));
    await expect(readJson(await issueClaim(apiRequest('/api/wix/birthday/claim', { body: {} })))).resolves.toMatchObject({
      status: 200,
      body: { applied: false },
    });
    await expect(readJson(await issueClaim(apiRequest('/api/wix/birthday/claim', { body: {} })))).resolves.toMatchObject({
      status: 503,
      body: { error: 'Birthday pricing is temporarily unavailable.' },
    });
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
