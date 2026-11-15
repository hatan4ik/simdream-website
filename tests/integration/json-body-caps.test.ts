import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, readJson } from '../support/http';
import { errorBody, expectContract } from './contracts';

/**
 * Every JSON route reads its body through lib/http/read-json-body.ts with an explicit cap: a body
 * one byte over it is refused with 413 before it is parsed (declared or actually sent), a body of
 * exactly the cap still reaches the route's own validation, and an admin route challenges an
 * anonymous caller before it reads any of the body. Malformed JSON keeps each route's own answer
 * (the per-route suites pin those).
 */

type Handler = (request: Request) => Promise<Response>;

interface CappedRoute {
  label: string;
  method: 'POST' | 'PATCH';
  path: string;
  maxBytes: number;
  admin: boolean;
  handler: (app: TestApp) => Promise<Handler>;
}

const KIB = 1024;
const TOO_LARGE = { error: 'Request body is too large.' };

const pick = (module: Record<string, unknown>, method: string) => module[method] as Handler;

const CAPPED_ROUTES: CappedRoute[] = [
  { label: 'POST /api/checkout', method: 'POST', path: '/api/checkout', maxBytes: 16 * KIB, admin: false, handler: async (app) => pick(await app.routes.checkout(), 'POST') },
  { label: 'POST /api/vouchers', method: 'POST', path: '/api/vouchers', maxBytes: 16 * KIB, admin: false, handler: async (app) => pick(await app.routes.vouchers(), 'POST') },
  {
    label: 'POST /api/ground-school/inquiries',
    method: 'POST',
    path: '/api/ground-school/inquiries',
    maxBytes: 16 * KIB,
    admin: false,
    handler: async (app) => pick(await app.routes.groundSchoolInquiries(), 'POST'),
  },
  {
    label: 'POST /api/subscriptions/checkout',
    method: 'POST',
    path: '/api/subscriptions/checkout',
    maxBytes: 16 * KIB,
    admin: false,
    handler: async () => {
      // This route reads `req.nextUrl`, which only a NextRequest carries.
      const post = pick(await import('@/app/api/subscriptions/checkout/route'), 'POST');
      return (request) => post(new NextRequest(request));
    },
  },
  {
    label: 'POST /api/wix/bookings/checkout',
    method: 'POST',
    path: '/api/wix/bookings/checkout',
    maxBytes: 16 * KIB,
    admin: false,
    handler: async () => pick(await import('@/app/api/wix/bookings/checkout/route'), 'POST'),
  },
  { label: 'PATCH /api/bookings', method: 'PATCH', path: '/api/bookings', maxBytes: 16 * KIB, admin: true, handler: async (app) => pick(await app.routes.bookings(), 'PATCH') },
  { label: 'PATCH /api/vouchers', method: 'PATCH', path: '/api/vouchers', maxBytes: 64 * KIB, admin: true, handler: async (app) => pick(await app.routes.vouchers(), 'PATCH') },
  { label: 'PATCH /api/workshops', method: 'PATCH', path: '/api/workshops', maxBytes: 64 * KIB, admin: true, handler: async (app) => pick(await app.routes.workshops(), 'PATCH') },
  {
    label: 'PATCH /api/ground-school/inquiries',
    method: 'PATCH',
    path: '/api/ground-school/inquiries',
    maxBytes: 64 * KIB,
    admin: true,
    handler: async (app) => pick(await app.routes.groundSchoolInquiries(), 'PATCH'),
  },
  {
    label: 'POST /api/admin/schedule-optimization',
    method: 'POST',
    path: '/api/admin/schedule-optimization',
    maxBytes: 64 * KIB,
    admin: true,
    handler: async (app) => pick(await app.routes.adminScheduleOptimization(), 'POST'),
  },
];

/** Valid JSON of exactly `bytes` bytes that no route's schema accepts. */
function paddedJson(bytes: number): string {
  const empty = JSON.stringify({ padding: '' });
  return JSON.stringify({ padding: 'x'.repeat(bytes - empty.length) });
}

function request(route: CappedRoute, rawBody: string, headers: Record<string, string> = {}): Request {
  const credentials = route.admin ? adminHeaders() : {};
  return apiRequest(route.path, { method: route.method, rawBody, headers: { 'content-type': 'application/json', ...credentials, ...headers } });
}

describe.each(CAPPED_ROUTES)('$label body cap ($maxBytes bytes)', (route) => {
  it('refuses a body one byte over the cap with 413, whether sent or only declared', async () => {
    const app = await loadApp();
    const handler = await route.handler(app);

    const sent = await readJson(await handler(request(route, paddedJson(route.maxBytes + 1))));
    const declared = await readJson(await handler(request(route, '{}', { 'content-length': String(route.maxBytes + 1) })));

    for (const response of [sent, declared]) {
      expect(response.status).toBe(413);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(expectContract(errorBody, response.body)).toEqual(TOO_LARGE);
    }
  });

  it('passes a body of exactly the cap on to the route’s own validation', async () => {
    const app = await loadApp();
    const handler = await route.handler(app);
    const atCap = paddedJson(route.maxBytes);
    expect(new TextEncoder().encode(atCap).byteLength).toBe(route.maxBytes);

    const response = await readJson(await handler(request(route, atCap)));

    expect(response.status).toBe(400);
    expect(response.body).not.toEqual(TOO_LARGE);
  });
});

describe.each(CAPPED_ROUTES.filter((route) => route.admin))('$label admin guard', (route) => {
  it('challenges an anonymous caller before reading any of an oversized body', async () => {
    const app = await loadApp();
    const handler = await route.handler(app);
    const anonymous = apiRequest(route.path, {
      method: route.method,
      rawBody: paddedJson(route.maxBytes + 1),
      headers: { 'content-type': 'application/json' },
    });

    const response = await readJson(await handler(anonymous));

    expect(response.status).toBe(401);
    expect(anonymous.bodyUsed).toBe(false);
  });
});
