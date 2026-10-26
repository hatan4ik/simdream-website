import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ADMIN } from '../support/test-env';
import { TEST_ORIGIN, adminHeaders, apiRequest, basicAuth, readJson } from '../support/http';

interface GuardEnv {
  NODE_ENV?: 'production' | 'test';
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

/** Re-imports the guard so `isProduction` is evaluated against the stubbed NODE_ENV. */
async function loadGuard(env: GuardEnv = {}) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', env.NODE_ENV ?? 'test');
  vi.stubEnv('ADMIN_USER', env.ADMIN_USER ?? TEST_ADMIN.user);
  vi.stubEnv('ADMIN_PASSWORD', env.ADMIN_PASSWORD ?? TEST_ADMIN.password);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', env.NEXT_PUBLIC_APP_URL ?? '');
  return import('@/lib/auth/admin-guard');
}

function adminRequest(headers: Record<string, string> = {}, method = 'GET') {
  return apiRequest('/api/admin/schedule-optimization', { method, headers });
}

async function expectUnauthorized(response: Response | null) {
  expect(response).not.toBeNull();
  const { status, headers, body } = await readJson<{ error: string }>(response!);
  expect(status).toBe(401);
  expect(body).toEqual({ error: 'Admin authentication required' });
  expect(headers.get('www-authenticate')).toBe('Basic realm="Sim Dream Admin", charset="UTF-8"');
}

async function expectNotConfigured(response: Response | null) {
  expect(response).not.toBeNull();
  const { status, body } = await readJson<{ error: string }>(response!);
  expect(status).toBe(503);
  expect(body.error).toMatch(/disabled until ADMIN_USER and ADMIN_PASSWORD are configured/);
}

describe('requireAdmin: credentials', () => {
  it('lets correct Basic credentials through', async () => {
    const { requireAdmin } = await loadGuard();
    expect(requireAdmin(adminRequest(adminHeaders()))).toBeNull();
  });

  it.each([
    ['no Authorization header', {}],
    ['a Bearer token', { authorization: 'Bearer some-session-token' }],
    ['malformed base64', { authorization: 'Basic !!!not-base64!!!' }],
    ['credentials without a colon', { authorization: `Basic ${Buffer.from('qa-admin').toString('base64')}` }],
    ['an empty Basic value', { authorization: 'Basic ' }],
    ['the wrong user', { authorization: basicAuth('someone-else', TEST_ADMIN.password) }],
    ['the wrong password', { authorization: basicAuth(TEST_ADMIN.user, 'wrong-password-0000000000') }],
    ['swapped user and password', { authorization: basicAuth(TEST_ADMIN.password, TEST_ADMIN.user) }],
  ])('challenges a request with %s', async (_label, headers) => {
    const { requireAdmin } = await loadGuard();
    await expectUnauthorized(requireAdmin(adminRequest(headers)));
  });

  it('accepts passwords containing colons, splitting only at the first one', async () => {
    const password = 'pass:with:colons:0123456789';
    const { requireAdmin } = await loadGuard({ ADMIN_PASSWORD: password });
    expect(requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, password) }))).toBeNull();
  });

  it('decodes UTF-8 credentials', async () => {
    const password = 'pässwörd-✈-ünïcödé-0123';
    const { requireAdmin } = await loadGuard({ ADMIN_USER: 'אדמין', ADMIN_PASSWORD: password });
    expect(requireAdmin(adminRequest({ authorization: basicAuth('אדמין', password) }))).toBeNull();
  });
});

describe('requireAdmin: constant-time comparison', () => {
  const expected = TEST_ADMIN.password;

  it.each([
    ['a strict prefix', expected.slice(0, -1)],
    ['an extension', `${expected}x`],
    ['a trailing NUL', `${expected}\u0000`],
    ['an empty password', ''],
    ['a single changed last character', `${expected.slice(0, -1)}X`],
  ])('rejects %s of the real password', async (_label, attempt) => {
    const { requireAdmin } = await loadGuard();
    await expectUnauthorized(requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, attempt) })));
  });

  it('authorises exactly the configured password and nothing else', async () => {
    const { requireAdmin } = await loadGuard();
    const nearMiss = fc.oneof(
      fc.string({ maxLength: 40 }),
      fc.tuple(fc.nat({ max: expected.length }), fc.string({ minLength: 1, maxLength: 3 })).map(
        ([cut, tail]) => expected.slice(0, cut) + tail
      )
    );
    fc.assert(
      fc.property(nearMiss, (attempt) => {
        const response = requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, attempt) }));
        expect(response === null).toBe(attempt === expected);
      }),
      { numRuns: 300 }
    );
  });
});

describe('requireAdmin: configuration', () => {
  it.each([
    ['ADMIN_USER is blank', { ADMIN_USER: '' }],
    ['ADMIN_PASSWORD is blank', { ADMIN_PASSWORD: '' }],
    ['ADMIN_PASSWORD is whitespace', { ADMIN_PASSWORD: '    ' }],
    ['ADMIN_USER is a placeholder', { ADMIN_USER: 'your_admin_user' }],
    ['ADMIN_PASSWORD is a placeholder', { ADMIN_PASSWORD: 'changeme-0123456789abcdef' }],
  ])('disables admin access with 503 when %s', async (_label, env) => {
    const { requireAdmin } = await loadGuard(env);
    await expectNotConfigured(requireAdmin(adminRequest(adminHeaders())));
  });

  it('disables admin access in production when the password is shorter than 16 characters', async () => {
    const password = 'short-pass-0123';
    expect(password).toHaveLength(15);
    const { requireAdmin } = await loadGuard({ NODE_ENV: 'production', ADMIN_PASSWORD: password });
    await expectNotConfigured(requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, password) })));
  });

  it('accepts a 16-character password in production', async () => {
    const password = 'long-pass-012345';
    expect(password).toHaveLength(16);
    const { requireAdmin } = await loadGuard({ NODE_ENV: 'production', ADMIN_PASSWORD: password });
    expect(requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, password) }))).toBeNull();
  });

  it('allows a short password outside production for local work', async () => {
    const { requireAdmin } = await loadGuard({ ADMIN_PASSWORD: 'dev' });
    expect(requireAdmin(adminRequest({ authorization: basicAuth(TEST_ADMIN.user, 'dev') }))).toBeNull();
  });
});

describe('requireAdmin: cross-origin mutations', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('forbids an authenticated cross-origin %s', async (method) => {
    const { requireAdmin } = await loadGuard();
    const response = requireAdmin(adminRequest(adminHeaders({ origin: 'https://attacker.example' }), method));
    expect(response).not.toBeNull();
    const { status, body } = await readJson(response!);
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Cross-origin admin mutations are not allowed.' });
  });

  it.each([
    ['a different port', 'http://localhost:3001'],
    ['a different scheme', 'https://localhost:3000'],
    ['an opaque origin', 'null'],
    ['a malformed origin', 'not a url'],
  ])('treats %s as cross-origin', async (_label, origin) => {
    const { requireAdmin } = await loadGuard();
    const response = requireAdmin(adminRequest(adminHeaders({ origin }), 'POST'));
    expect(response).not.toBeNull();
    const { status, body } = await readJson(response!);
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Cross-origin admin mutations are not allowed.' });
  });

  it('allows a same-origin mutation', async () => {
    const { requireAdmin } = await loadGuard();
    expect(requireAdmin(adminRequest(adminHeaders({ origin: TEST_ORIGIN }), 'POST'))).toBeNull();
  });

  it('allows a mutation without an Origin header, as sent by operations scripts', async () => {
    const { requireAdmin } = await loadGuard();
    expect(requireAdmin(adminRequest(adminHeaders(), 'PATCH'))).toBeNull();
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows a cross-origin %s, which cannot mutate', async (method) => {
    const { requireAdmin } = await loadGuard();
    expect(requireAdmin(adminRequest(adminHeaders({ origin: 'https://attacker.example' }), method))).toBeNull();
  });

  it('challenges an unauthenticated cross-origin mutation before checking its origin', async () => {
    const { requireAdmin } = await loadGuard();
    await expectUnauthorized(requireAdmin(adminRequest({ origin: 'https://attacker.example' }, 'POST')));
  });
});

describe('requireAdmin: receiving-origin allowlist for authenticated PATCH', () => {
  // hasUsableValue treats any value containing "example" as a placeholder, so the configured URL avoids it.
  const APP_URL = 'https://book.simdream.co.il';
  const PROXY = { host: 'internal-node:3000', 'x-forwarded-host': 'simdream.co.il', 'x-forwarded-proto': 'https' };

  it.each<[string, GuardEnv, Record<string, string>]>([
    ['the configured NEXT_PUBLIC_APP_URL', { NEXT_PUBLIC_APP_URL: APP_URL }, { origin: APP_URL }],
    ['the origin of a NEXT_PUBLIC_APP_URL that carries a path', { NEXT_PUBLIC_APP_URL: `${APP_URL}/he/admin` }, { origin: APP_URL }],
    ['the Host the browser connected to', {}, { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' }],
    ['X-Forwarded-Host when Host names the internal node', {}, { ...PROXY, origin: 'https://simdream.co.il' }],
    ['the first value of a comma-separated X-Forwarded-Host', {}, { 'x-forwarded-host': 'a.example, b.example', origin: 'http://a.example' }],
    ['the first value of a comma-separated X-Forwarded-Proto', {}, { 'x-forwarded-host': 'simdream.co.il', 'x-forwarded-proto': 'https, http', origin: 'https://simdream.co.il' }],
    ['the request URL even behind a proxy', {}, { ...PROXY, origin: TEST_ORIGIN }],
    ['the request URL when NEXT_PUBLIC_APP_URL is malformed', { NEXT_PUBLIC_APP_URL: 'book.simdream.co.il' }, { origin: TEST_ORIGIN }],
  ])('allows an Origin matching %s', async (_label, env, headers) => {
    const { requireAdmin } = await loadGuard(env);
    expect(requireAdmin(adminRequest(adminHeaders(headers), 'PATCH'))).toBeNull();
  });

  it.each<[string, GuardEnv, Record<string, string>]>([
    ['a later value of a comma-separated X-Forwarded-Host', {}, { 'x-forwarded-host': 'a.example, b.example', origin: 'http://b.example' }],
    ['the Host when X-Forwarded-Host names another host', {}, { ...PROXY, origin: 'http://internal-node:3000' }],
    ['an http Origin when X-Forwarded-Proto is https', {}, { 'x-forwarded-host': 'simdream.co.il', 'x-forwarded-proto': 'https', origin: 'http://simdream.co.il' }],
    ['a scheme-less NEXT_PUBLIC_APP_URL read as https', { NEXT_PUBLIC_APP_URL: 'book.simdream.co.il' }, { origin: 'https://book.simdream.co.il' }],
    ['a scheme-less NEXT_PUBLIC_APP_URL read as http', { NEXT_PUBLIC_APP_URL: 'book.simdream.co.il' }, { origin: 'http://book.simdream.co.il' }],
    ['the malformed NEXT_PUBLIC_APP_URL value itself', { NEXT_PUBLIC_APP_URL: 'book.simdream.co.il' }, { origin: 'book.simdream.co.il' }],
    ['a placeholder NEXT_PUBLIC_APP_URL', { NEXT_PUBLIC_APP_URL: 'https://your-domain.co.il' }, { origin: 'https://your-domain.co.il' }],
    ['a cross-site page even when Host, X-Forwarded-Host and NEXT_PUBLIC_APP_URL all name this site',{ NEXT_PUBLIC_APP_URL: APP_URL }, { ...PROXY, origin: 'https://attacker.co' }],
    ['a lookalike host that only starts with the forwarded host', {}, { ...PROXY, origin: 'https://simdream.co.il.attacker.co' }],
    ['a different port on the Host', {}, { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3001' }],
  ])('forbids an Origin matching %s', async (_label, env, headers) => {
    const { requireAdmin } = await loadGuard(env);
    const response = requireAdmin(adminRequest(adminHeaders(headers), 'PATCH'));
    expect(response).not.toBeNull();
    const { status, body } = await readJson(response!);
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'Cross-origin admin mutations are not allowed.' });
  });

  // Browsers serialise Origin in canonical form (lowercase host, no default port), but a proxy
  // may forward Host or X-Forwarded-Host verbatim. Same-origin requests must still pass.
  it.each<[string, Record<string, string>]>([
    ['an explicit default port', { ...PROXY, 'x-forwarded-host': 'simdream.co.il:443' }],
    ['upper-case letters', { ...PROXY, 'x-forwarded-host': 'SimDream.co.il' }],
    ['an upper-case X-Forwarded-Proto', { ...PROXY, 'x-forwarded-proto': 'HTTPS' }],
  ])('allows a same-origin PATCH when the forwarded host carries %s (UNIT-10)', async (_label, headers) => {
    const { requireAdmin } = await loadGuard();
    expect(requireAdmin(adminRequest(adminHeaders({ ...headers, origin: 'https://simdream.co.il' }), 'PATCH'))).toBeNull();
  });

  // URL parsing of "proto://host" must not let userinfo, a path or an odd scheme name another origin.
  it.each<[string, Record<string, string>, string]>([
    ['userinfo in X-Forwarded-Host', { 'x-forwarded-host': 'simdream.co.il@attacker.co', 'x-forwarded-proto': 'https' }, 'https://attacker.co'],
    ['a path in X-Forwarded-Host', { 'x-forwarded-host': 'attacker.co/simdream.co.il', 'x-forwarded-proto': 'https' }, 'https://attacker.co'],
    ['a non-HTTP X-Forwarded-Proto', { 'x-forwarded-host': 'simdream.co.il', 'x-forwarded-proto': 'ftp' }, 'ftp://simdream.co.il'],
    ['a sandboxed-frame "null" Origin', { 'x-forwarded-host': 'simdream.co.il', 'x-forwarded-proto': 'javascript' }, 'null'],
  ])('forbids a PATCH when %s would otherwise widen the allowlist', async (_label, headers, origin) => {
    const { requireAdmin } = await loadGuard();
    const response = requireAdmin(adminRequest(adminHeaders({ ...headers, origin }), 'PATCH'));
    expect(response?.status).toBe(403);
  });
});
