import { createClient, OAuthStrategy } from '@wix/sdk';
import { redirects } from '@wix/redirects';
import { getWixClientId } from './config';

/**
 * One SDK client per process, as the Wix docs require ("create your client once
 * and reuse it"). It authenticates as an anonymous visitor with the public
 * client id; every Bookings read goes through `fetchWithAuth`, which mints and
 * refreshes the visitor token itself.
 *
 * Bookings is called over REST rather than `@wix/bookings`: that package ships
 * React 18 components as a peer dependency and does not install beside React 19.
 */
export type WixClient = ReturnType<typeof buildClient>;

function buildClient(clientId: string) {
  return createClient({
    modules: { redirects },
    auth: OAuthStrategy({ clientId }),
  });
}

let cached: WixClient | null = null;

export class WixNotConfiguredError extends Error {
  constructor() {
    super('Wix Headless is not configured: set NEXT_PUBLIC_WIX_CLIENT_ID.');
    this.name = 'WixNotConfiguredError';
  }
}

export function getWixClient(): WixClient {
  const clientId = getWixClientId();
  if (!clientId) throw new WixNotConfiguredError();
  if (!cached) cached = buildClient(clientId);
  return cached;
}

/** Test seam: drop the cached client so a new client id takes effect. */
export function resetWixClientForTests(): void {
  cached = null;
}

export class WixApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string
  ) {
    super(`Wix API ${status} for ${url}: ${body.slice(0, 300)}`);
    this.name = 'WixApiError';
  }
}

export interface WixPostOptions {
  /** A deadline for the whole request. Pass it for idempotent reads only (lib/http/timeouts.ts). */
  timeoutMs?: number;
}

/**
 * POST a JSON body to a Wix REST endpoint as the visitor and return the parsed JSON. With `timeoutMs`
 * a request that does not answer in time fails as a 504 `WixApiError`, like any other upstream failure.
 */
export async function wixPost<T = unknown>(url: string, body: unknown, options: WixPostOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await getWixClient().fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
    });
  } catch (error) {
    if (options.timeoutMs && error instanceof DOMException && error.name === 'TimeoutError') {
      throw new WixApiError(504, url, `No answer from Wix within ${options.timeoutMs} ms.`);
    }
    throw error;
  }
  if (!response.ok) {
    throw new WixApiError(response.status, url, await response.text());
  }
  return (await response.json()) as T;
}
