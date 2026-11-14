import { CANONICAL_STAGING_WIX_SITE_ID } from '../../lib/wix/backend-blueprint';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface WixHttp {
  readonly siteId: string;
  request<T = unknown>(method: HttpMethod, url: string, body?: unknown): Promise<T>;
}

export class WixHttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`Wix API ${status} for ${url}: ${body.slice(0, 300)}`);
    this.name = 'WixHttpError';
  }
}

const WIX_API = 'https://www.wixapis.com';

/** The only calls the source (production) client may make: every one reads, none writes. */
const READ_ONLY_CALLS: ReadonlyArray<{ method: HttpMethod; path: RegExp }> = [
  { method: 'POST', path: /^\/contacts\/v5\/contacts\/query$/ },
  { method: 'POST', path: /^\/contacts\/v5\/contacts\/count$/ },
  { method: 'POST', path: /^\/contacts\/v4\/contacts\/query$/ },
  { method: 'POST', path: /^\/contacts\/v4\/labels\/query$/ },
  { method: 'POST', path: /^\/ecom\/v1\/orders\/search$/ },
  { method: 'GET', path: /^\/pricing-plans\/v2\/orders$/ },
  // Related records (see export-related.ts). Each is a query, count or list-by-ids: none changes anything.
  { method: 'POST', path: /^\/bookings\/bookings-reader\/v2\/extended-bookings\/query$/ },
  { method: 'POST', path: /^\/bookings\/bookings-reader\/v2\/extended-bookings\/count$/ },
  { method: 'POST', path: /^\/form-schema-service\/v4\/forms\/query$/ },
  { method: 'POST', path: /^\/form-submission-service\/v4\/submissions\/query$/ },
  { method: 'POST', path: /^\/members\/v1\/members\/query$/ },
  { method: 'POST', path: /^\/stores\/v2\/coupons\/query$/ },
  { method: 'POST', path: /^\/ecom\/v1\/payments\/list-by-ids$/ },
];

export function isReadOnlyCall(method: HttpMethod, url: string): boolean {
  if (!url.startsWith(`${WIX_API}/`)) return false;
  const path = url.slice(WIX_API.length).split('?')[0]!;
  return READ_ONLY_CALLS.some((call) => call.method === method && call.path.test(path));
}

interface HttpOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Minimum gap between requests. Wix answers 429 quickly under bursts, so the default is deliberately slow. */
  minIntervalMs?: number;
  maxAttempts?: number;
}

function buildHttp(
  apiKey: string,
  siteId: string,
  options: HttpOptions,
  allow: (method: HttpMethod, url: string) => boolean,
  denial: string,
): WixHttp {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const minInterval = options.minIntervalMs ?? 250;
  const maxAttempts = options.maxAttempts ?? 6;
  let lastRequestAt = Number.NEGATIVE_INFINITY;

  return {
    siteId,
    async request<T>(method: HttpMethod, url: string, body?: unknown): Promise<T> {
      if (!allow(method, url)) throw new Error(`${denial}: ${method} ${url.replace(WIX_API, '')}`);
      let lastError: WixHttpError | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const wait = minInterval - (now() - lastRequestAt);
        if (wait > 0) await sleep(wait);
        lastRequestAt = now();
        const response = await fetchImpl(url, {
          method,
          headers: { Authorization: apiKey, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (response.ok) return (await response.json().catch(() => ({}))) as T;
        lastError = new WixHttpError(response.status, url, await response.text().catch(() => ''));
        const transient = response.status === 429 || response.status >= 500;
        if (!transient || attempt === maxAttempts) break;
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 1000 * 2 ** (attempt - 1));
        await sleep(backoff);
      }
      throw lastError ?? new Error(`No response for ${url}`);
    },
  };
}

/**
 * Client for the production site. It can only call the read endpoints listed above, so the
 * export can never change live data (AGENTS.md §6.7), whatever else is added to this tool.
 */
export function createSourceHttp(options: HttpOptions & { apiKey: string; siteId: string }): WixHttp {
  if (!options.apiKey.trim()) throw new Error('WIX_SOURCE_API_KEY is required to read the source site.');
  if (!options.siteId.trim()) throw new Error('WIX_SOURCE_SITE_ID is required to read the source site.');
  if (options.siteId === CANONICAL_STAGING_WIX_SITE_ID) {
    throw new Error('The source site cannot be the staging site: it is the migration target.');
  }
  return buildHttp(options.apiKey.trim(), options.siteId.trim(), options, isReadOnlyCall, 'Source client is read-only; refused');
}

/**
 * Client for the SimDream-Staging headless site. The site id is not a parameter: the target
 * is fixed to CANONICAL_STAGING_WIX_SITE_ID, the only Wix site this repo may write to.
 */
export function createTargetHttp(options: HttpOptions & { apiKey: string }): WixHttp {
  if (!options.apiKey.trim()) throw new Error('WIX_ADMIN_API_KEY is required to write to the staging site.');
  return buildHttp(options.apiKey.trim(), CANONICAL_STAGING_WIX_SITE_ID, options, () => true, 'Refused');
}
