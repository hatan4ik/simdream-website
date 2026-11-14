import { describe, expect, it, vi } from 'vitest';
import { CANONICAL_STAGING_WIX_SITE_ID } from '../../lib/wix/backend-blueprint';
import { WixHttpError, createSourceHttp, createTargetHttp, isReadOnlyCall } from '../../tools/crm-migration/wix-http';

const PRODUCTION_SITE = '00000000-0000-4000-8000-0000000000aa'; // any id other than the staging site

function fakeFetch(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const queue = [...responses];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = queue.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status, headers: next.headers });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const instant = async () => undefined;

describe('isReadOnlyCall', () => {
  it('allows exactly the read endpoints the export uses', () => {
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v5/contacts/query')).toBe(true);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v5/contacts/count')).toBe(true);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v4/contacts/query')).toBe(true);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v4/labels/query')).toBe(true);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/ecom/v1/orders/search')).toBe(true);
    expect(isReadOnlyCall('GET', 'https://www.wixapis.com/pricing-plans/v2/orders?limit=50&offset=0')).toBe(true);
  });

  it('refuses every write, including look-alike paths', () => {
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v5/contacts')).toBe(false);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v5/bulk/contacts/create')).toBe(false);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/ecom/v1/orders/import')).toBe(false);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v4/bulk/contacts/delete')).toBe(false);
    expect(isReadOnlyCall('DELETE', 'https://www.wixapis.com/contacts/v5/contacts/query')).toBe(false);
    expect(isReadOnlyCall('POST', 'https://evil.example.com/contacts/v5/contacts/query')).toBe(false);
    expect(isReadOnlyCall('POST', 'https://www.wixapis.com/contacts/v5/contacts/query/../')).toBe(false);
  });
});

describe('createSourceHttp', () => {
  it('sends the key and the source site id, and refuses to write to the source', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { contacts: [] } }]);
    const http = createSourceHttp({ apiKey: 'key-1', siteId: PRODUCTION_SITE, fetchImpl: impl, sleep: instant });
    await http.request('POST', 'https://www.wixapis.com/contacts/v5/contacts/query', { query: {} });
    expect(calls[0]!.init.headers).toMatchObject({ Authorization: 'key-1', 'wix-site-id': PRODUCTION_SITE });

    await expect(http.request('POST', 'https://www.wixapis.com/ecom/v1/orders/import', {})).rejects.toThrow(/read-only/i);
    expect(calls).toHaveLength(1);
  });

  it('refuses to be built for the staging site, so a mix-up cannot read the wrong side', () => {
    expect(() => createSourceHttp({ apiKey: 'key', siteId: CANONICAL_STAGING_WIX_SITE_ID })).toThrow(/staging/i);
  });

  it('refuses to be built without a key or site id', () => {
    expect(() => createSourceHttp({ apiKey: '', siteId: PRODUCTION_SITE })).toThrow(/WIX_SOURCE_API_KEY/);
    expect(() => createSourceHttp({ apiKey: 'key', siteId: '' })).toThrow(/WIX_SOURCE_SITE_ID/);
  });
});

describe('createTargetHttp', () => {
  it('is pinned to the staging site: there is no site id to pass', async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: {} }]);
    const http = createTargetHttp({ apiKey: 'key-2', fetchImpl: impl, sleep: instant });
    expect(http.siteId).toBe(CANONICAL_STAGING_WIX_SITE_ID);
    await http.request('POST', 'https://www.wixapis.com/contacts/v5/bulk/contacts/create', { contacts: [] });
    expect(calls[0]!.init.headers).toMatchObject({ 'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID });
  });

  it('refuses a key-less client', () => {
    expect(() => createTargetHttp({ apiKey: '  ' })).toThrow(/WIX_ADMIN_API_KEY/);
  });
});

describe('request behaviour', () => {
  it('retries rate limits and server errors, honouring Retry-After, then succeeds', async () => {
    const { impl, calls } = fakeFetch([
      { status: 429, headers: { 'retry-after': '1' } },
      { status: 503 },
      { status: 200, body: { ok: true } },
    ]);
    const waits: number[] = [];
    const http = createTargetHttp({ apiKey: 'k', fetchImpl: impl, sleep: async (ms) => void waits.push(ms), minIntervalMs: 0 });
    await expect(http.request('POST', 'https://www.wixapis.com/x', {})).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(3);
    expect(waits.some((ms) => ms >= 1000)).toBe(true);
  });

  it('does not retry a client error and reports status, url and body', async () => {
    const { impl, calls } = fakeFetch([{ status: 400, body: { message: 'bad field' } }]);
    const http = createTargetHttp({ apiKey: 'k', fetchImpl: impl, sleep: instant, minIntervalMs: 0 });
    const error = await http.request('POST', 'https://www.wixapis.com/x', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(WixHttpError);
    expect((error as WixHttpError).status).toBe(400);
    expect((error as WixHttpError).body).toContain('bad field');
    expect(calls).toHaveLength(1);
  });

  it('gives up after repeated throttling', async () => {
    const { impl, calls } = fakeFetch(Array.from({ length: 10 }, () => ({ status: 429 })));
    const http = createTargetHttp({ apiKey: 'k', fetchImpl: impl, sleep: instant, minIntervalMs: 0, maxAttempts: 3 });
    await expect(http.request('POST', 'https://www.wixapis.com/x', {})).rejects.toMatchObject({ status: 429 });
    expect(calls).toHaveLength(3);
  });

  it('spaces requests by the minimum interval', async () => {
    const { impl } = fakeFetch([{ status: 200 }, { status: 200 }]);
    const waits: number[] = [];
    let clock = 1000;
    const http = createTargetHttp({
      apiKey: 'k',
      fetchImpl: impl,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      now: () => clock,
      minIntervalMs: 300,
    });
    await http.request('POST', 'https://www.wixapis.com/x', {});
    await http.request('POST', 'https://www.wixapis.com/x', {});
    expect(waits).toEqual([300]);
  });
});
