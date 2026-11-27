import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/diagnostics/client-address/route';
import { clientAddressDiagnosticIsOpen, describeClientAddressHeaders } from '@/lib/security/client-address-diagnostic';

// Which header carries the visitor's address on a given host cannot be read from documentation: it
// has to be observed on the deployed application. This diagnostic reports which candidate headers
// arrive, whether they hold an address the caller already knows, and where a value the caller
// forged ends up, without echoing any value.

const VISITOR = '203.0.113.7';
const PROXY = '198.51.100.20';
const SPOOF = '192.0.2.99';
const NOW = new Date('2026-11-27T12:00:00Z');

const headers = (init: Record<string, string>) => new Headers(init);
const describe_ = (init: Record<string, string>, env: Record<string, string> = {}, probe: { expected?: string; spoof?: string } = {}) =>
  describeClientAddressHeaders(headers(init), env, { expected: probe.expected ?? null, spoof: probe.spoof ?? null });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('describeClientAddressHeaders', () => {
  it('reports each candidate header as present or absent, and nothing else', () => {
    const report = describe_({ 'cf-connecting-ip': VISITOR });
    expect(Object.keys(report).sort()).toEqual([
      'configured',
      'expectationUsable',
      'headers',
      'resolved',
      'resolvedFrom',
      'resolvedIsSpoof',
      'resolvedMatchesExpected',
      'spoofUsable',
    ]);
    expect(Object.keys(report.headers).sort()).toEqual(['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for']);
    expect(report.headers['cf-connecting-ip']).toMatchObject({ present: true, entries: 1, validAddress: true });
    expect(report.headers['x-real-ip']).toEqual({
      present: false,
      entries: 0,
      validAddress: false,
      matchesExpected: null,
      expectedEntryFromRight: null,
      spoofEntryFromRight: null,
    });
  });

  it('says whether a header holds the address the caller expects', () => {
    const report = describe_({ 'cf-connecting-ip': VISITOR, 'x-real-ip': PROXY }, {}, { expected: VISITOR });
    expect(report.headers['cf-connecting-ip'].matchesExpected).toBe(true);
    expect(report.headers['x-real-ip'].matchesExpected).toBe(false);
  });

  it('locates the expected and the forged address in x-forwarded-for from the right, the side proxies append to', () => {
    const report = describe_({ 'x-forwarded-for': `${SPOOF}, ${VISITOR}, ${PROXY}` }, {}, { expected: VISITOR, spoof: SPOOF });
    expect(report.headers['x-forwarded-for']).toEqual({
      present: true,
      entries: 3,
      validAddress: true,
      matchesExpected: false,
      expectedEntryFromRight: 2,
      spoofEntryFromRight: 3,
    });
  });

  it('shows a forged value that the edge passed through in a single-address header', () => {
    // An edge that copies the client's leftmost x-forwarded-for entry into x-real-ip: forging only
    // x-real-ip would be overwritten and look safe; forging every header at once exposes it.
    const report = describe_(
      { 'cf-connecting-ip': VISITOR, 'x-real-ip': SPOOF, 'x-forwarded-for': `${SPOOF}, ${VISITOR}` },
      { RATE_LIMIT_CLIENT_IP_HEADER: 'x-real-ip' },
      { expected: VISITOR, spoof: SPOOF }
    );
    expect(report.headers['cf-connecting-ip']).toMatchObject({ matchesExpected: true, spoofEntryFromRight: null });
    expect(report.headers['x-real-ip']).toMatchObject({ matchesExpected: false, spoofEntryFromRight: 1 });
    expect(report).toMatchObject({ resolved: 'address', resolvedMatchesExpected: false, resolvedIsSpoof: true });
  });

  it('flags a single-address header that carries a list or a non-address', () => {
    const report = describe_({ 'cf-connecting-ip': `${SPOOF}, ${VISITOR}`, 'x-real-ip': 'proxy.internal' });
    expect(report.headers['cf-connecting-ip']).toMatchObject({ entries: 2, validAddress: false });
    expect(report.headers['x-real-ip']).toMatchObject({ entries: 1, validAddress: false });
  });

  it('reports what the application resolves today, as a kind and never as a value', () => {
    expect(describe_({ 'x-forwarded-for': `${VISITOR}, ${PROXY}` }, {}, { expected: VISITOR })).toMatchObject({
      configured: false,
      resolvedFrom: 'x-forwarded-for',
      resolved: 'address',
      resolvedMatchesExpected: false,
    });
    expect(describe_({ 'cf-connecting-ip': VISITOR }, { RATE_LIMIT_CLIENT_IP_HEADER: 'CF-Connecting-IP' }, { expected: VISITOR })).toMatchObject({
      configured: true,
      resolvedFrom: 'cf-connecting-ip',
      resolved: 'address',
      resolvedMatchesExpected: true,
      resolvedIsSpoof: null,
    });
    expect(describe_({}, { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' }, { expected: VISITOR })).toMatchObject({
      resolved: 'unknown-client',
      resolvedMatchesExpected: false,
    });
  });

  it('follows the configured hop count when it says what x-forwarded-for resolves to', () => {
    const report = describe_(
      { 'x-forwarded-for': `${SPOOF}, ${VISITOR}, ${PROXY}` },
      { RATE_LIMIT_CLIENT_IP_HEADER: 'x-forwarded-for', RATE_LIMIT_TRUSTED_PROXY_HOPS: '2' },
      { expected: VISITOR, spoof: SPOOF }
    );
    expect(report).toMatchObject({ resolvedMatchesExpected: true, resolvedIsSpoof: false });
  });

  it('ignores an expectation or a forgery marker that is not an address', () => {
    const report = describe_({ 'cf-connecting-ip': VISITOR }, {}, { expected: 'not an address', spoof: '<script>' });
    expect(report).toMatchObject({ expectationUsable: false, spoofUsable: false, resolvedMatchesExpected: null, resolvedIsSpoof: null });
    expect(report.headers['cf-connecting-ip']).toMatchObject({ matchesExpected: null, spoofEntryFromRight: null });
  });

  it('never returns a header value, an address or free text from the request', () => {
    const report = describe_(
      { 'cf-connecting-ip': VISITOR, 'x-forwarded-for': `${SPOOF}, ${PROXY}`, 'x-real-ip': 'proxy.internal', 'x-vercel-forwarded-for': PROXY },
      { RATE_LIMIT_CLIENT_IP_HEADER: 'cf-connecting-ip' },
      { expected: VISITOR, spoof: SPOOF }
    );
    const serialized = JSON.stringify(report);
    for (const value of [VISITOR, PROXY, SPOOF, 'proxy.internal']) expect(serialized).not.toContain(value);
  });
});

describe('clientAddressDiagnosticIsOpen', () => {
  const open = (value: string | undefined) => clientAddressDiagnosticIsOpen({ CLIENT_ADDRESS_DIAGNOSTIC_UNTIL: value }, NOW);

  it('is open only until a stated instant in the near future', () => {
    expect(open('2026-11-27T13:00:00Z')).toBe(true);
    expect(open('2026-11-29T12:00:00Z')).toBe(true);
  });

  it('closes by itself when the instant has passed', () => {
    expect(open('2026-11-27T12:00:00Z')).toBe(false);
    expect(open('2026-11-27T11:59:59Z')).toBe(false);
  });

  it('refuses an instant more than 48 hours away, so it cannot be left open for long', () => {
    expect(open('2026-11-29T12:00:01Z')).toBe(false);
    expect(open('2099-01-01T00:00:00Z')).toBe(false);
  });

  it('refuses anything that is not a full UTC instant', () => {
    for (const value of [undefined, '', '1', 'true', ' 2026-11-27T13:00:00Z', '2026-11-27', '2026-11-27T13:00:00', '2026-11-27T13:00:00+02:00', 'tomorrow']) {
      expect(open(value), String(value)).toBe(false);
    }
  });
});

describe('GET /api/diagnostics/client-address', () => {
  const request = (init: Record<string, string> = {}) =>
    new Request('https://staging.example.test/api/diagnostics/client-address', { headers: init });

  it('does not exist unless the deployment has opened it', async () => {
    for (const value of [undefined, '', '1', '2026-11-27T11:00:00Z', '2099-01-01T00:00:00Z']) {
      vi.stubEnv('CLIENT_ADDRESS_DIAGNOSTIC_UNTIL', value as string);
      const response = await GET(request({ 'cf-connecting-ip': VISITOR }));
      expect(response.status, String(value)).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toBe('');
    }
  });

  it('answers with the report, uncached, while it is open', async () => {
    vi.stubEnv('CLIENT_ADDRESS_DIAGNOSTIC_UNTIL', '2026-11-27T13:00:00Z');
    const response = await GET(
      request({ 'cf-connecting-ip': VISITOR, 'x-real-ip': SPOOF, 'x-diagnostic-expect': VISITOR, 'x-diagnostic-spoof': SPOOF })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    expect(text).not.toContain(VISITOR);
    expect(text).not.toContain(SPOOF);
    expect(JSON.parse(text)).toMatchObject({
      expectationUsable: true,
      spoofUsable: true,
      headers: { 'cf-connecting-ip': { present: true, matchesExpected: true }, 'x-real-ip': { spoofEntryFromRight: 1 } },
    });
  });
});
