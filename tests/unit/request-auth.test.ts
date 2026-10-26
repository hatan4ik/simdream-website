import { describe, expect, it, vi } from 'vitest';
import { SANDBOX_ENV } from '../support/test-env';
import { apiRequest, bearer, basicAuth } from '../support/http';

/** `isProduction` is evaluated at import time, so every case re-imports the module. */
async function loadRequestAuth(nodeEnv: 'production' | 'test') {
  vi.resetModules();
  for (const [name, value] of Object.entries({ ...SANDBOX_ENV, NODE_ENV: nodeEnv })) vi.stubEnv(name, value);
  return import('@/lib/auth/request-auth');
}

describe('requireAuthenticatedUser', () => {
  it.each([
    ['no Authorization header', {}],
    ['Basic credentials', { authorization: basicAuth('pilot', 'secret') }],
    ['an empty Bearer token', { authorization: 'Bearer    ' }],
  ])('treats a request with %s as a guest without contacting the identity provider', async (_label, headers) => {
    const { requireAuthenticatedUser } = await loadRequestAuth('test');
    await expect(requireAuthenticatedUser(apiRequest('/api/my-bookings', { headers }))).resolves.toBeNull();
  });

  it('fails closed instead of trusting a Bearer token when the identity provider is not configured', async () => {
    const { requireAuthenticatedUser } = await loadRequestAuth('test');
    await expect(requireAuthenticatedUser(apiRequest('/api/my-bookings', { headers: bearer('forged-token') }))).rejects.toThrow(
      'Persistent storage is not configured.'
    );
  });
});

describe('getDevelopmentDemoEmail', () => {
  it('ignores the demo header in production', async () => {
    const { getDevelopmentDemoEmail } = await loadRequestAuth('production');
    const request = apiRequest('/api/my-bookings', { headers: { 'x-simdream-demo-email': 'pilot@simdream.co.il' } });
    expect(getDevelopmentDemoEmail(request)).toBeNull();
  });

  it('normalises the demo header outside production', async () => {
    const { getDevelopmentDemoEmail } = await loadRequestAuth('test');
    const request = apiRequest('/api/my-bookings', { headers: { 'x-simdream-demo-email': '  Pilot@SimDream.co.il ' } });
    expect(getDevelopmentDemoEmail(request)).toBe('pilot@simdream.co.il');
  });

  it.each<Record<string, string>>([{}, { 'x-simdream-demo-email': 'not-an-email' }, { 'x-simdream-demo-email': '   ' }])(
    'returns nothing for a missing or malformed demo header %j',
    async (headers) => {
      const { getDevelopmentDemoEmail } = await loadRequestAuth('test');
      expect(getDevelopmentDemoEmail(apiRequest('/api/my-bookings', { headers }))).toBeNull();
    }
  );
});
