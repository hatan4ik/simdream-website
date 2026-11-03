import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../support/http';

async function loadRateLimit(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env.NODE_ENV ?? 'test');
  vi.stubEnv('ALLOW_IN_MEMORY_STORE', env.ALLOW_IN_MEMORY_STORE ?? '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY ?? '');
  vi.stubEnv('SIMDREAM_TEST_RATE_LIMIT_BYPASS', env.SIMDREAM_TEST_RATE_LIMIT_BYPASS ?? '');
  vi.stubEnv('NEXT_DIST_DIR', env.NEXT_DIST_DIR ?? '');
  return import('@/lib/security/rate-limit');
}

describe('rate-limit boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T10:00:00Z') });
  });

  it('limits only the matching scope and subject, then resets at the next window', async () => {
    const { consumeRateLimit } = await loadRateLimit();
    const rule = { scope: 'unit-voucher', subject: '203.0.113.7', limit: 2, windowSeconds: 60 };

    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 60 });
    await expect(consumeRateLimit({ ...rule, subject: '203.0.113.8' })).resolves.toMatchObject({ allowed: true });

    vi.advanceTimersByTime(60_000);
    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: true });
  });

  it('normalizes only valid forwarded client addresses and never stores a raw value', async () => {
    const { rateLimitClientAddress } = await loadRateLimit();
    expect(rateLimitClientAddress(apiRequest('/api/vouchers', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }))).toBe('203.0.113.7');
    expect(rateLimitClientAddress(apiRequest('/api/vouchers', { headers: { 'x-vercel-forwarded-for': '2001:db8::1' } }))).toBe('2001:db8::1');
    expect(rateLimitClientAddress(apiRequest('/api/vouchers', { headers: { 'x-forwarded-for': 'attacker.example' } }))).toBe('unknown-client');
  });

  it('fails closed in production when durable rate-limit storage is not configured', async () => {
    const { consumeRateLimit, RateLimitUnavailableError } = await loadRateLimit({ NODE_ENV: 'production' });
    await expect(
      consumeRateLimit({ scope: 'production-check', subject: '203.0.113.7', limit: 1, windowSeconds: 60 })
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });

  it('cannot bypass rate limiting unless all browser-sandbox markers are present', async () => {
    const { consumeRateLimit } = await loadRateLimit({ SIMDREAM_TEST_RATE_LIMIT_BYPASS: 'true' });
    const rule = { scope: 'bypass-check', subject: '203.0.113.7', limit: 1, windowSeconds: 60 };

    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(rule)).resolves.toMatchObject({ allowed: false });
  });
});
