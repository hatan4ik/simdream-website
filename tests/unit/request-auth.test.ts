import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('fails closed instead of trusting a malformed Bearer token when no identity provider can verify it', async () => {
    const { requireAuthenticatedUser } = await loadRequestAuth('test');
    await expect(requireAuthenticatedUser(apiRequest('/api/my-bookings', { headers: bearer('forged-token') }))).resolves.toBeNull();
  });

  describe('with Supabase Auth configured', () => {
    type SupabaseUser = { id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown> };
    const wixLookup = vi.fn();

    async function loadWithSupabase(answer: { user: SupabaseUser | null; error: { message: string } | null }) {
      vi.resetModules();
      for (const [name, value] of Object.entries({ ...SANDBOX_ENV, NODE_ENV: 'test' })) vi.stubEnv(name, value);
      vi.doMock('@/lib/db/supabase-admin', () => ({
        getSupabaseAdmin: () => ({ auth: { getUser: async () => ({ data: { user: answer.user }, error: answer.error }) } }),
      }));
      vi.doMock('@/lib/wix/member-auth', () => ({ getWixMemberIdentity: wixLookup }));
      return import('@/lib/auth/request-auth');
    }

    afterEach(() => {
      vi.doUnmock('@/lib/db/supabase-admin');
      vi.doUnmock('@/lib/wix/member-auth');
      wixLookup.mockReset();
    });

    it('returns the verified Supabase identity with a bounded display name', async () => {
      const { requireAuthenticatedUser } = await loadWithSupabase({
        user: { id: 'user-1', email: 'pilot@simdream.co.il', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: `  ${'A'.repeat(130)}  ` } },
        error: null,
      });

      const identity = await requireAuthenticatedUser(apiRequest('/api/my-bookings', { headers: bearer('supabase-jwt') }));

      expect(identity).toEqual({ id: 'user-1', email: 'pilot@simdream.co.il', emailVerified: true, fullName: 'A'.repeat(120), provider: 'supabase' });
      expect(wixLookup).not.toHaveBeenCalled();
    });

    it('falls back to the `name` claim, and leaves the name out when it is not a string', async () => {
      const named = await loadWithSupabase({ user: { id: 'user-2', email: 'a@b.test', user_metadata: { name: 'Dana' } }, error: null });
      await expect(named.requireAuthenticatedUser(apiRequest('/x', { headers: bearer('t') }))).resolves.toMatchObject({ fullName: 'Dana', emailVerified: false });

      const unnamed = await loadWithSupabase({ user: { id: 'user-3', email: 'a@b.test', user_metadata: { name: 42 } }, error: null });
      await expect(unnamed.requireAuthenticatedUser(apiRequest('/x', { headers: bearer('t') }))).resolves.toMatchObject({ fullName: undefined });
    });

    it('asks Wix when Supabase rejects the token or knows no email for it', async () => {
      wixLookup.mockResolvedValue(null);
      const rejected = await loadWithSupabase({ user: null, error: { message: 'invalid JWT' } });
      await expect(rejected.requireAuthenticatedUser(apiRequest('/x', { headers: bearer('wix-token') }))).resolves.toBeNull();
      const noEmail = await loadWithSupabase({ user: { id: 'user-4' }, error: null });
      await expect(noEmail.requireAuthenticatedUser(apiRequest('/x', { headers: bearer('wix-token') }))).resolves.toBeNull();

      expect(wixLookup).toHaveBeenCalledTimes(2);
      expect(wixLookup).toHaveBeenCalledWith('wix-token');
    });
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
