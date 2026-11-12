import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadApp } from '../support/app';
import { adminRequest } from './api-helpers';
import { apiRequest, readJson } from '../support/http';

/**
 * The refund API's failure answers: what a customer or a staff member sees when storage or email is
 * down. The happy paths and validation live in refund-requests.test.ts; the production fail-closed rules
 * in refund-requests-production.test.ts. Here the service layer is made to throw each kind of error so
 * that every catch branch answers 503, keeps personal data out of the log, and never claims success.
 */
const REQUEST = {
  clientRequestId: '8d7f8f2e-9c41-4b0e-a8c1-0a1b2c3d4e5f',
  language: 'en',
  productKind: 'flight',
  orderReference: 'WIX-10234',
  contactName: 'Dana Pilot',
  email: 'dana@pilots.test',
  phone: '+972501234567',
  sessionDate: '2026-11-20',
  sessionTime: '18:30',
  reason: 'change_of_plans',
  message: 'I cannot make it that evening.',
  acceptedTruth: true,
  acceptedRules: true,
  website: '',
};

type ServerModule = typeof import('@/lib/refund/server');

/** What the replaced service calls do; each test sets one before calling the route. */
const behaviour: { submit: () => Promise<never>; list: () => Promise<never> } = {
  submit: async () => {
    throw new Error('unset');
  },
  list: async () => {
    throw new Error('unset');
  },
};

/**
 * Loads the routes with the two service calls replaced; everything else stays real. The error classes
 * come from the same module instances the route imports, so its `instanceof` checks see them.
 */
async function loadRoute() {
  vi.resetModules();
  vi.doMock('@/lib/refund/server', async (importOriginal) => ({
    ...(await importOriginal<ServerModule>()),
    submitRefundRequest: () => behaviour.submit(),
    listRefundRequests: () => behaviour.list(),
  }));
  await loadApp();
  const route = await import('@/app/api/refund-requests/route');
  const server = await import('@/lib/refund/server');
  const store = await import('@/lib/db/store');
  return { route, RefundUnavailableError: server.RefundUnavailableError, PersistenceError: store.PersistenceError };
}

let logged: unknown[][];
beforeEach(() => {
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });
});
afterEach(() => {
  vi.doUnmock('@/lib/refund/server');
  vi.restoreAllMocks();
});

describe('POST /api/refund-requests when the service fails', () => {
  async function submitWith(makeError: (classes: { RefundUnavailableError: new () => Error }) => unknown) {
    const { route, RefundUnavailableError } = await loadRoute();
    behaviour.submit = async () => {
      throw makeError({ RefundUnavailableError });
    };
    return readJson<{ error: string; contact?: unknown }>(
      await route.POST(apiRequest('/api/refund-requests', { body: { ...REQUEST, clientRequestId: crypto.randomUUID() } }))
    );
  }

  it('answers 503 with the desk contact and no log line when neither storage nor email is available', async () => {
    const response = await submitWith(({ RefundUnavailableError }) => new RefundUnavailableError());

    expect(response.status).toBe(503);
    expect(response.body.error).toContain('Nothing was sent');
    expect(response.body.contact).toBeTruthy();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(logged).toEqual([]);
  });

  it('answers 503 and logs only the error name for an unexpected failure', async () => {
    const response = await submitWith(() => new TypeError('connect ECONNREFUSED dana@pilots.test'));

    expect(response.status).toBe(503);
    expect(response.body.contact).toBeTruthy();
    expect(logged).toEqual([['Refund request failed', 'TypeError']]);
    expect(JSON.stringify(logged)).not.toContain('dana@pilots.test');
  });

  it('answers 503 and logs "unknown" when something that is not an Error is thrown', async () => {
    const response = await submitWith(() => 'a plain string');

    expect(response.status).toBe(503);
    expect(logged).toEqual([['Refund request failed', 'unknown']]);
  });
});

describe('GET /api/refund-requests when the list fails', () => {
  async function listWith(makeError: (classes: { PersistenceError: new (message?: string) => Error }) => unknown) {
    const { route, PersistenceError } = await loadRoute();
    behaviour.list = async () => {
      throw makeError({ PersistenceError });
    };
    return readJson<{ error: string }>(await route.GET(adminRequest('/api/refund-requests')));
  }

  it('says the requests are not stored here when persistence is not configured', async () => {
    const response = await listWith(({ PersistenceError }) => new PersistenceError('Persistent storage is not configured.'));

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Refund requests are not stored in this environment.');
    expect(logged).toEqual([]);
  });

  it('answers 503 and logs only the error name for an unexpected failure', async () => {
    const response = await listWith(() => new RangeError('row 12 for dana@pilots.test is corrupt'));

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Refund requests are temporarily unavailable.');
    expect(logged).toEqual([['Refund request listing failed', 'RangeError']]);
    expect(JSON.stringify(logged)).not.toContain('dana@pilots.test');
  });

  it('logs "unknown" when something that is not an Error is thrown', async () => {
    const response = await listWith(() => ({ code: 'XX000' }));

    expect(response.status).toBe(503);
    expect(logged).toEqual([['Refund request listing failed', 'unknown']]);
  });
});
