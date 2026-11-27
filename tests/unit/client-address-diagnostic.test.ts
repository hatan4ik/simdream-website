import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/diagnostics/client-address/route';
import { describeClientAddressHeaders } from '@/lib/security/client-address-diagnostic';

// Which header carries the visitor's address on a given host cannot be read from documentation: it
// has to be observed on the deployed application. This diagnostic reports which candidate headers
// arrive and whether they hold an address the caller already knows, without echoing any value.

const VISITOR = '203.0.113.7';
const PROXY = '198.51.100.20';
const SPOOF = '192.0.2.99';

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('describeClientAddressHeaders', () => {
  it('reports each candidate header as present or absent', () => {
    const report = describeClientAddressHeaders(headers({ 'cf-connecting-ip': VISITOR }), {}, null);
    expect(report.headers['cf-connecting-ip']).toMatchObject({ present: true, entries: 1, validAddress: true });
    expect(report.headers['x-real-ip']).toEqual({ present: false, entries: 0, validAddress: false, matchesExpected: null, expectedEntryFromRight: null });
    expect(Object.keys(report.headers).sort()).toEqual(['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for']);
  });

  it('says whether a header holds the address the caller expects', () => {
    const report = describeClientAddressHeaders(headers({ 'cf-connecting-ip': VISITOR, 'x-real-ip': PROXY }), {}, VISITOR);
    expect(report.headers['cf-connecting-ip'].matchesExpected).toBe(true);
    expect(report.headers['x-real-ip'].matchesExpected).toBe(false);
  });

  it('locates the expected address in x-forwarded-for from the right, the side proxies append to', () => {
    const report = describeClientAddressHeaders(headers({ 'x-forwarded-for': `${SPOOF}, ${VISITOR}, ${PROXY}` }), {}, VISITOR);
    expect(report.headers['x-forwarded-for']).toEqual({
      present: true,
      entries: 3,
      validAddress: true,
      matchesExpected: false,
      expectedEntryFromRight: 2,
    });
  });

  it('flags a single-address header that carries a list or a non-address', () => {
    const report = describeClientAddressHeaders(headers({ 'cf-connecting-ip': `${SPOOF}, ${VISITOR}`, 'x-real-ip': 'proxy.internal' }), {}, null);
    expect(report.headers['cf-connecting-ip']).toMatchObject({ entries: 2, validAddress: false });
    expect(report.headers['x-real-ip']).toMatchObject({ entries: 1, validAddress: false });
  });

  it('reports what the application resolves today, as a kind and never as a value', () => {
    const unconfigured = describeClientAddressHeaders(headers({ 'x-forwarded-for': `${VISITOR}, ${PROXY}` }), {}, VISITOR);
    expect(unconfigured).toMatchObject({ configured: false, resolvedFrom: 'x-forwarded-for', resolved: 'address', resolvedMatchesExpected: false });

    const configured = describeClientAddressHeaders(
      headers({ 'cf-connecting-ip': VISITOR }),
      { RATE_LIMIT_CLIENT_IP_HEADER: 'CF-Connecting-IP' },
      VISITOR
    );
    expect(configured).toMatchObject({ configured: true, resolvedFrom: 'cf-connecting-ip', resolved: 'address', resolvedMatchesExpected: true });

    const missing = describeClientAddressHeaders(headers({}), { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' }, VISITOR);
    expect(missing).toMatchObject({ resolved: 'unknown-client', resolvedMatchesExpected: false });
  });

  it('ignores an expectation that is not an address', () => {
    const report = describeClientAddressHeaders(headers({ 'cf-connecting-ip': VISITOR }), {}, 'not an address');
    expect(report.expectationUsable).toBe(false);
    expect(report.headers['cf-connecting-ip'].matchesExpected).toBeNull();
    expect(report.resolvedMatchesExpected).toBeNull();
  });

  it('never returns a header value', () => {
    const report = describeClientAddressHeaders(
      headers({ 'cf-connecting-ip': VISITOR, 'x-forwarded-for': `${SPOOF}, ${PROXY}`, 'x-real-ip': PROXY }),
      { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' },
      VISITOR
    );
    const serialized = JSON.stringify(report);
    for (const value of [VISITOR, PROXY, SPOOF]) expect(serialized).not.toContain(value);
  });
});

describe('GET /api/diagnostics/client-address', () => {
  const request = (init: Record<string, string> = {}) =>
    new Request('https://staging.example.test/api/diagnostics/client-address', { headers: init });

  it('does not exist unless the deployment switches it on', async () => {
    for (const value of [undefined, '', '0', 'true', 'yes']) {
      vi.stubEnv('CLIENT_ADDRESS_DIAGNOSTIC', value as string);
      const response = await GET(request({ 'cf-connecting-ip': VISITOR }));
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toBe('');
    }
  });

  it('answers with the report, uncached, when switched on', async () => {
    vi.stubEnv('CLIENT_ADDRESS_DIAGNOSTIC', '1');
    const response = await GET(request({ 'cf-connecting-ip': VISITOR, 'x-diagnostic-expect': VISITOR }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    expect(text).not.toContain(VISITOR);
    expect(JSON.parse(text)).toMatchObject({
      expectationUsable: true,
      headers: { 'cf-connecting-ip': { present: true, matchesExpected: true } },
    });
  });
});
