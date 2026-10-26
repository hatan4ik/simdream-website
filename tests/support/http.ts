import { TEST_ADMIN } from './test-env';

export const TEST_ORIGIN = 'http://localhost:3000';

export interface ApiRequestInit {
  method?: string;
  /** Serialized as JSON with a JSON content type. */
  body?: unknown;
  /** Sent verbatim; use for malformed payloads and signed webhook bodies. */
  rawBody?: string;
  headers?: Record<string, string>;
}

/** Builds a Request for calling an App Router route handler in-process. */
export function apiRequest(path: string, init: ApiRequestInit = {}): Request {
  const headers = new Headers(init.headers);
  let body: string | undefined;
  if (init.rawBody !== undefined) {
    body = init.rawBody;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  return new Request(new URL(path, TEST_ORIGIN), {
    method: init.method ?? (body === undefined ? 'GET' : 'POST'),
    headers,
    body,
  });
}

export interface JsonResponse<T> {
  status: number;
  headers: Headers;
  body: T;
}

export async function readJson<T = Record<string, unknown>>(response: Response): Promise<JsonResponse<T>> {
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

export function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { authorization: basicAuth(TEST_ADMIN.user, TEST_ADMIN.password), ...extra };
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** Second argument for dynamic route handlers such as `[bookingReference]`. */
export function routeParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}
