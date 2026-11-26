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
  vi.stubEnv('VERCEL', env.VERCEL ?? '');
  vi.stubEnv('RATE_LIMIT_CLIENT_IP_HEADER', env.RATE_LIMIT_CLIENT_IP_HEADER ?? '');
  vi.stubEnv('RATE_LIMIT_TRUSTED_PROXY_HOPS', env.RATE_LIMIT_TRUSTED_PROXY_HOPS ?? '');
  return import('@/lib/security/rate-limit');
}

/** Resolves the client address of one request carrying exactly these headers. */
async function clientAddressFor(headers: Record<string, string>, env: Record<string, string> = {}) {
  const { rateLimitClientAddress } = await loadRateLimit(env);
  return rateLimitClientAddress(apiRequest('/api/vouchers', { headers }));
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
    // The entry the nearest proxy appended (rightmost), not the leftmost one the client may have written.
    expect(rateLimitClientAddress(apiRequest('/api/vouchers', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }))).toBe('10.0.0.1');
    expect(rateLimitClientAddress(apiRequest('/api/vouchers', { headers: { 'x-forwarded-for': '2001:DB8::1' } }))).toBe('2001:db8::1');
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

describe('trusted client address for rate limiting', () => {
  it('ignores a spoofed leftmost x-forwarded-for entry', async () => {
    for (const spoofed of ['198.51.100.1', '198.51.100.2', '2001:db8::99', 'attacker.example']) {
      await expect(clientAddressFor({ 'x-forwarded-for': `${spoofed}, 203.0.113.7` })).resolves.toBe('203.0.113.7');
    }
    await expect(clientAddressFor({ 'x-forwarded-for': '203.0.113.7' })).resolves.toBe('203.0.113.7');
  });

  it('ignores a rotating spoofed x-vercel-forwarded-for when not running on Vercel', async () => {
    for (const spoofed of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
      await expect(
        clientAddressFor({ 'x-vercel-forwarded-for': spoofed, 'x-forwarded-for': '203.0.113.7' })
      ).resolves.toBe('203.0.113.7');
    }
    await expect(clientAddressFor({ 'x-vercel-forwarded-for': '198.51.100.1' })).resolves.toBe('unknown-client');
  });

  it('reads only x-vercel-forwarded-for on Vercel and ignores x-forwarded-for there', async () => {
    const onVercel = { VERCEL: '1' };
    await expect(
      clientAddressFor({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '198.51.100.1, 198.51.100.2' }, onVercel)
    ).resolves.toBe('203.0.113.9');
    await expect(clientAddressFor({ 'x-forwarded-for': '198.51.100.2' }, onVercel)).resolves.toBe('unknown-client');
  });

  it('reads only the configured header and ignores every other forwarding header', async () => {
    const cloudflare = { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip', VERCEL: '1' };
    const otherHeaders = { 'x-vercel-forwarded-for': '198.51.100.3', 'x-forwarded-for': '198.51.100.4', 'x-real-ip': '198.51.100.5' };
    await expect(clientAddressFor({ 'cf-connecting-ip': '203.0.113.10', ...otherHeaders }, cloudflare)).resolves.toBe('203.0.113.10');
    await expect(clientAddressFor(otherHeaders, cloudflare)).resolves.toBe('unknown-client');

    // Header names are case-insensitive, so the configured name is too.
    await expect(
      clientAddressFor({ 'cf-connecting-ip': '203.0.113.10' }, { RATE_LIMIT_CLIENT_IP_HEADER: ' CF-Connecting-IP ' })
    ).resolves.toBe('203.0.113.10');
    await expect(
      clientAddressFor({ 'x-real-ip': '203.0.113.11', 'x-forwarded-for': '198.51.100.4' }, { RATE_LIMIT_CLIENT_IP_HEADER: 'x-real-ip' })
    ).resolves.toBe('203.0.113.11');
    await expect(
      clientAddressFor(
        { 'x-forwarded-for': '198.51.100.6, 203.0.113.12', 'x-vercel-forwarded-for': '198.51.100.7' },
        { RATE_LIMIT_CLIENT_IP_HEADER: 'x-forwarded-for', VERCEL: '1' }
      )
    ).resolves.toBe('203.0.113.12');
  });

  it('counts trusted proxy hops from the right of x-forwarded-for only', async () => {
    const twoHops = { RATE_LIMIT_TRUSTED_PROXY_HOPS: '2' };
    await expect(clientAddressFor({ 'x-forwarded-for': '198.51.100.1, 203.0.113.7, 10.0.0.1' }, twoHops)).resolves.toBe('203.0.113.7');
    // Fewer entries than trusted proxies means the request did not come through them.
    await expect(clientAddressFor({ 'x-forwarded-for': '10.0.0.1' }, twoHops)).resolves.toBe('unknown-client');
    await expect(
      clientAddressFor(
        { 'x-forwarded-for': '198.51.100.1, 198.51.100.2, 203.0.113.7, 10.0.0.2, 10.0.0.1' },
        { RATE_LIMIT_TRUSTED_PROXY_HOPS: '4' }
      )
    ).resolves.toBe('198.51.100.2');
    // Single-value headers are taken whole, whatever the hop count.
    await expect(
      clientAddressFor({ 'x-real-ip': '203.0.113.11' }, { RATE_LIMIT_CLIENT_IP_HEADER: 'x-real-ip', RATE_LIMIT_TRUSTED_PROXY_HOPS: '3' })
    ).resolves.toBe('203.0.113.11');
  });

  it('treats invalid configuration as unset and falls back to the defaults', async () => {
    const headers = { 'cf-connecting-ip': '198.51.100.8', 'true-client-ip': '198.51.100.9', 'x-forwarded-for': '198.51.100.1, 203.0.113.7' };
    for (const header of ['true-client-ip', 'x-client-ip', 'cf-connecting-ip, x-forwarded-for', 'forwarded', '   ']) {
      await expect(clientAddressFor(headers, { RATE_LIMIT_CLIENT_IP_HEADER: header })).resolves.toBe('203.0.113.7');
    }
    await expect(
      clientAddressFor({ ...headers, 'x-vercel-forwarded-for': '203.0.113.9' }, { RATE_LIMIT_CLIENT_IP_HEADER: 'true-client-ip', VERCEL: '1' })
    ).resolves.toBe('203.0.113.9');

    const chain = { 'x-forwarded-for': '198.51.100.1, 203.0.113.7, 10.0.0.1' };
    for (const hops of ['0', '6', '-1', '1.5', '2x', 'two', ' ']) {
      await expect(clientAddressFor(chain, { RATE_LIMIT_TRUSTED_PROXY_HOPS: hops })).resolves.toBe('10.0.0.1');
    }
    await expect(clientAddressFor(chain, { RATE_LIMIT_TRUSTED_PROXY_HOPS: ' 2 ' })).resolves.toBe('203.0.113.7');
  });

  it('resolves malformed or missing values to unknown-client', async () => {
    for (const value of ['attacker.example', '[2001:db8::1]', '203.0.113.7,', '203.0.113.7 ; 10.0.0.1', 'unknown', '1'.repeat(65)]) {
      await expect(clientAddressFor({ 'x-forwarded-for': value })).resolves.toBe('unknown-client');
    }
    await expect(clientAddressFor({})).resolves.toBe('unknown-client');
    // A single-value header is never split: a list there is malformed.
    await expect(
      clientAddressFor({ 'cf-connecting-ip': '203.0.113.7, 198.51.100.1' }, { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' })
    ).resolves.toBe('unknown-client');
    await expect(clientAddressFor({ 'x-vercel-forwarded-for': 'spoofed' }, { VERCEL: '1' })).resolves.toBe('unknown-client');
  });
});

describe('peekRateLimit: reading a budget without spending it', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T10:00:00Z') });
  });

  it('reports the budget as used up only after the last allowed attempt, and never consumes one itself', async () => {
    const { consumeRateLimit, peekRateLimit } = await loadRateLimit();
    const rule = { scope: 'peek-check', subject: '203.0.113.7', limit: 2, windowSeconds: 60 };

    for (let read = 0; read < 5; read += 1) await expect(peekRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    await consumeRateLimit(rule);
    await expect(peekRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    await consumeRateLimit(rule);
    await expect(peekRateLimit(rule)).resolves.toEqual({ allowed: false, retryAfterSeconds: 60 });
    await expect(peekRateLimit({ ...rule, subject: '203.0.113.8' })).resolves.toMatchObject({ allowed: true });

    vi.setSystemTime(new Date('2026-11-01T10:01:00Z'));
    await expect(peekRateLimit(rule)).resolves.toMatchObject({ allowed: true });
  });

  it('reads the current window of the durable store in production, by hashed subject, and writes nothing', async () => {
    const calls: { op: string; args: unknown[] }[] = [];
    let rows: unknown[] = [];
    const chain = {
      select: (...args: unknown[]) => (calls.push({ op: 'select', args }), chain),
      eq: (...args: unknown[]) => (calls.push({ op: 'eq', args }), chain),
      gt: (...args: unknown[]) => (calls.push({ op: 'gt', args }), chain),
      order: (...args: unknown[]) => (calls.push({ op: 'order', args }), chain),
      limit: (...args: unknown[]) => (calls.push({ op: 'limit', args }), chain),
      abortSignal: (...args: unknown[]) => (calls.push({ op: 'abortSignal', args }), Promise.resolve({ data: rows, error: null })),
    };
    const rpc = vi.fn();
    const deadline = vi.spyOn(AbortSignal, 'timeout');
    vi.resetModules();
    vi.doMock('@/lib/db/supabase-admin', () => ({
      requireSupabaseAdmin: () => ({ from: (table: string) => (calls.push({ op: 'from', args: [table] }), chain), rpc }),
    }));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_IN_MEMORY_STORE', '');
    const { peekRateLimit } = await import('@/lib/security/rate-limit');
    const rule = { scope: 'admin-login-ip', subject: '203.0.113.7', limit: 12, windowSeconds: 900 };

    await expect(peekRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    rows = [{ attempt_count: 11, window_started_at: '2026-11-01T10:00:00.000Z' }];
    await expect(peekRateLimit(rule)).resolves.toMatchObject({ allowed: true });
    rows = [{ attempt_count: 12, window_started_at: '2026-11-01T10:00:00.000Z' }];
    await expect(peekRateLimit(rule)).resolves.toEqual({ allowed: false, retryAfterSeconds: 900 });

    rows = [{ attempt_count: 'many', window_started_at: 'not a time' }];
    await expect(peekRateLimit(rule)).rejects.toThrow('Rate-limit persistence is unavailable.');

    expect(rpc).not.toHaveBeenCalled();
    // The read carries a deadline, so a hung database cannot stall every admin request.
    expect(calls.find((call) => call.op === 'abortSignal')?.args[0]).toBeInstanceOf(AbortSignal);
    expect(deadline).toHaveBeenCalledWith(5_000);
    expect(calls).toContainEqual({ op: 'from', args: ['security_rate_limits'] });
    expect(calls).toContainEqual({ op: 'eq', args: ['scope', 'admin-login-ip'] });
    const subject = calls.find((call) => call.op === 'eq' && call.args[0] === 'subject_hash');
    expect(subject?.args[1]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(calls)).not.toContain('203.0.113.7');
    // Only the window that is open now: rows are one window apart, so "started after now minus one window".
    expect(calls).toContainEqual({ op: 'gt', args: ['window_started_at', '2026-11-01T09:45:00.000Z'] });
    vi.doUnmock('@/lib/db/supabase-admin');
  });

  it('throws RateLimitUnavailableError when the durable store cannot be read', async () => {
    const failing = {
      select: () => failing,
      eq: () => failing,
      gt: () => failing,
      order: () => failing,
      limit: () => failing,
      abortSignal: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
    };
    vi.resetModules();
    vi.doMock('@/lib/db/supabase-admin', () => ({ requireSupabaseAdmin: () => ({ from: () => failing }) }));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_IN_MEMORY_STORE', '');
    const { peekRateLimit, RateLimitUnavailableError } = await import('@/lib/security/rate-limit');

    await expect(
      peekRateLimit({ scope: 'admin-login-ip', subject: '203.0.113.7', limit: 12, windowSeconds: 900 })
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
    vi.doUnmock('@/lib/db/supabase-admin');
  });
});

describe('clientAddressIsConfigured', () => {
  it.each([
    [{ RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' }, true],
    [{ RATE_LIMIT_CLIENT_IP_HEADER: ' X-Forwarded-For ' }, true],
    [{ VERCEL: '1' }, true],
    [{}, false],
    [{ RATE_LIMIT_CLIENT_IP_HEADER: '' }, false],
    [{ RATE_LIMIT_CLIENT_IP_HEADER: 'x-client-ip' }, false],
    [{ VERCEL: '0' }, false],
  ])('for %j answers %s', async (env, expected) => {
    const { clientAddressIsConfigured } = await import('@/lib/security/client-address');
    expect(clientAddressIsConfigured(env)).toBe(expected);
  });
});
