import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, bearer, routeParams } from '../support/http';
import {
  BOOKING_DATE,
  MEMBER_TOKENS,
  MEMBERS,
  SEED_VOUCHER_CODE,
  expectNoPrototypePollution,
  expectSafeApiResponse,
  propertyOptions,
  readRaw,
} from './security-helpers';

type RouteName = keyof TestApp['routes'];
type Handler = (request: Request, context?: unknown) => Promise<Response>;

// Regex-valid (YYYY-MM-DD) strings that are not real calendar dates.
const IMPOSSIBLE_DATES = ['2026-13-45', '2026-02-30', '2026-11-31', '2026-00-00', '0000-00-00', '9999-99-99'];

const HOSTILE_STRINGS = [
  "' OR '1'='1' --",
  "'; DROP TABLE bookings; --",
  '" OR ""="',
  '1; SELECT pg_sleep(5)',
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '{{7*7}}',
  '${7*7}',
  '../../../../etc/passwd',
  '%00',
  '\u0000',
  '‮‭',
  '\ud800',
  '😀🛫',
  'Z̷̢̛͓a̸l̶g̷o̵',
  '__proto__',
  'constructor',
  'NaN',
  'Infinity',
  'null',
  ...IMPOSSIBLE_DATES,
];

const hugeString = fc.integer({ min: 10_000, max: 200_000 }).map((length) => 'A'.repeat(length));

const hostileString: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(...HOSTILE_STRINGS),
  fc.string({ unit: 'binary', maxLength: 80 }),
  hugeString
);

const hostileValue: fc.Arbitrary<unknown> = fc.oneof(
  hostileString,
  fc.jsonValue({ maxDepth: 4 }),
  fc.constantFrom(Number.MAX_SAFE_INTEGER, -1, 0, 1e308, -1e308, 1e-308, 0.30000000000000004),
  fc.array(hostileString, { maxLength: 40 })
);

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'isAdmin', 'role'];

/** Serializes a body with some fields replaced, built as text so `__proto__` stays a plain JSON key. */
function serializeWithOverrides(valid: Record<string, unknown>, overrides: Array<[string, unknown]>): string {
  const replaced = new Set(overrides.map(([key]) => key));
  const entries = [
    ...Object.entries(valid).filter(([key]) => !replaced.has(key)),
    ...overrides,
  ].map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`);
  return `{${entries.join(',')}}`;
}

function prototypePollutionPayloads(valid: Record<string, unknown>): string[] {
  const base = JSON.stringify(valid).slice(1, -1);
  return [
    `{"__proto__":{"polluted":"yes","isAdmin":true},${base}}`,
    `{"constructor":{"prototype":{"polluted":"yes"}},${base}}`,
    `{${base},"__proto__":{"polluted":"yes"}}`,
    `[{"__proto__":{"polluted":"yes"}}]`,
    `{"kind":{"__proto__":{"polluted":"yes"}},"code":{"constructor":{"prototype":{"polluted":"yes"}}}}`,
  ];
}

function rawBodies(valid: Record<string, unknown>): fc.Arbitrary<string> {
  const keys = [...Object.keys(valid), ...DANGEROUS_KEYS];
  const nestable = Object.keys(valid);
  return fc.oneof(
    { arbitrary: fc.json({ maxDepth: 5 }), weight: 2 },
    { arbitrary: fc.string({ unit: 'binary', maxLength: 200 }), weight: 1 },
    {
      arbitrary: fc
        .array(fc.tuple(fc.constantFrom(...keys), hostileValue), { minLength: 1, maxLength: 4 })
        .map((overrides) => serializeWithOverrides(valid, overrides)),
      weight: 5,
    },
    {
      arbitrary: fc
        .tuple(fc.constantFrom(...nestable), fc.integer({ min: 200, max: 20_000 }), fc.constantFrom('[', '{"a":'))
        .map(([key, depth, opener]) => {
          const closer = opener === '[' ? ']' : '}';
          const nested = `${opener.repeat(depth)}${opener === '[' ? '' : '1'}${closer.repeat(depth)}`;
          return JSON.stringify(valid).replace(`${JSON.stringify(key)}:${JSON.stringify(valid[key])}`, `${JSON.stringify(key)}:${nested}`);
        }),
      weight: 1,
    },
    { arbitrary: fc.constantFrom(...prototypePollutionPayloads(valid)), weight: 1 }
  );
}

interface JsonEndpoint {
  label: string;
  route: RouteName;
  method: 'POST' | 'PATCH';
  headers?: Record<string, string>;
  valid: (app: TestApp) => Promise<Record<string, unknown>>;
}

const JSON_ENDPOINTS: JsonEndpoint[] = [
  {
    label: 'POST /api/checkout (booking)',
    route: 'checkout',
    method: 'POST',
    valid: async (app) => bookingCheckoutBody({ startTime: (await findOpenSlot(app, BOOKING_DATE, 20)).startTime }),
  },
  {
    label: 'POST /api/checkout (voucher-funded booking)',
    route: 'checkout',
    method: 'POST',
    valid: async (app) =>
      bookingCheckoutBody({ startTime: (await findOpenSlot(app, BOOKING_DATE, 20)).startTime, voucherCode: SEED_VOUCHER_CODE }),
  },
  { label: 'POST /api/checkout (gift voucher)', route: 'checkout', method: 'POST', valid: async () => voucherCheckoutBody() },
  { label: 'POST /api/vouchers (verify)', route: 'vouchers', method: 'POST', valid: async () => ({ action: 'verify', code: SEED_VOUCHER_CODE }) },
  {
    label: 'POST /api/workshops (inquiry)',
    route: 'workshops',
    method: 'POST',
    valid: async () => ({
      companyName: 'Fuzz Corp',
      contactName: 'Fuzz Contact',
      email: 'fuzz@corp.test',
      phone: '+972501234567',
      teamSize: 8,
      targetDate: '2026-12-01',
      primaryGoal: 'leadership',
      message: 'hello',
    }),
  },
  { label: 'POST /api/bookings (retired)', route: 'bookings', method: 'POST', valid: async () => bookingCheckoutBody() },
  {
    label: 'PATCH /api/bookings (admin)',
    route: 'bookings',
    method: 'PATCH',
    headers: adminHeaders(),
    valid: async (app) => ({ id: app.seed.DEMO_BOOKINGS[0].id, status: 'completed', startTime: '10:00' }),
  },
  {
    label: 'PATCH /api/vouchers (admin redeem)',
    route: 'vouchers',
    method: 'PATCH',
    headers: adminHeaders(),
    valid: async () => ({ code: SEED_VOUCHER_CODE, amount: 1 }),
  },
  {
    label: 'PATCH /api/workshops (admin)',
    route: 'workshops',
    method: 'PATCH',
    headers: adminHeaders(),
    valid: async () => ({ id: 'corp-01', status: 'contacted' }),
  },
  {
    label: 'POST /api/admin/schedule-optimization (admin)',
    route: 'adminScheduleOptimization',
    method: 'POST',
    headers: adminHeaders(),
    valid: async () => ({
      date: '2026-11-02',
      requests: [{ id: 'fuzz-1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00', '11:15'] }],
    }),
  },
];

async function handlerFor(app: TestApp, route: RouteName, method: string): Promise<Handler> {
  const module = (await app.routes[route]()) as Record<string, unknown>;
  return module[method] as Handler;
}

describe('JSON endpoint fuzzing', () => {
  it.each(JSON_ENDPOINTS)(
    '$label never answers malformed or hostile JSON with a 500, a leak or prototype pollution',
    async ({ route, method, headers, valid }) => {
      const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
      const handler = await handlerFor(app, route, method);
      const validBody = await valid(app);

      await fc.assert(
        fc.asyncProperty(rawBodies(validBody), async (rawBody) => {
          const response = await readRaw(
            await handler(
              apiRequest(`/api/${route}`, {
                method,
                rawBody,
                headers: { 'content-type': 'application/json', ...headers },
              })
            )
          );
          expectSafeApiResponse(response);
          expectNoPrototypePollution();
        }),
        propertyOptions(150)
      );
    },
    60_000
  );
});

const queryValue: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(...HOSTILE_STRINGS),
  fc.string({ unit: 'binary', maxLength: 80 }),
  fc.integer({ min: 2_000, max: 20_000 }).map((length) => '9'.repeat(length))
);

const regexValidDate = fc.oneof(fc.stringMatching(/^\d{4}-\d{2}-\d{2}$/), fc.constantFrom(...IMPOSSIBLE_DATES));

interface QueryEndpoint {
  label: string;
  route: RouteName;
  headers?: Record<string, string>;
  query: fc.Arbitrary<Record<string, string>>;
}

const QUERY_ENDPOINTS: QueryEndpoint[] = [
  {
    label: 'GET /api/slots',
    route: 'slots',
    query: fc.record({
      date: fc.oneof(regexValidDate, queryValue),
      duration: fc.oneof(fc.constantFrom('20', '30', '45', '60', '90', '120', '60abc', '-60', '1e3', '0x3c'), queryValue),
      includeEfficiency: fc.constantFrom('true', 'false', '', 'TRUE'),
    }),
  },
  {
    label: 'GET /api/packages',
    route: 'packages',
    query: fc.record({ category: queryValue, slug: queryValue }, { requiredKeys: [] }),
  },
  {
    label: 'GET /api/bookings?ref= (public)',
    route: 'bookings',
    query: fc.record({ ref: fc.oneof(queryValue, fc.stringMatching(/^SD-737-[A-Z2-9]{16}$/)) }),
  },
  {
    label: 'GET /api/bookings?id=&email= (admin)',
    route: 'bookings',
    headers: adminHeaders(),
    query: fc.record({ id: queryValue, email: queryValue }, { requiredKeys: [] }),
  },
];

describe('query parameter fuzzing', () => {
  it.each(QUERY_ENDPOINTS)(
    '$label never answers hostile query parameters with a 500 or a leak',
    async ({ route, headers, query }) => {
      const app = await loadApp({ members: MEMBERS });
      const handler = await handlerFor(app, route, 'GET');

      await fc.assert(
        fc.asyncProperty(query, async (params) => {
          const path = `/api/${route}?${new URLSearchParams(params).toString()}`;
          const response = await readRaw(await handler(apiRequest(path, { headers })));
          expectSafeApiResponse(response);
        }),
        propertyOptions(150)
      );
    },
    60_000
  );

  it('GET /api/my-bookings/[ref]/receipt never answers a hostile path parameter with a 500 or a leak', async () => {
    const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
    const { GET } = await app.routes.myBookingReceipt();

    await fc.assert(
      fc.asyncProperty(fc.oneof(queryValue, fc.stringMatching(/^SD-737-[A-Z2-9]{16}$/)), async (bookingReference) => {
        const response = await readRaw(
          await GET(
            // The handler reads the reference from route params; the URL path is incidental.
            apiRequest('/api/my-bookings/fuzzed/receipt', { headers: bearer(MEMBER_TOKENS.a) }),
            routeParams({ bookingReference })
          )
        );
        expectSafeApiResponse(response);
      }),
      propertyOptions(150)
    );
  });
});

describe('Authorization header fuzzing', () => {
  const printable = fc.string({ unit: 'binary-ascii', maxLength: 120 }).map((value) => value.replace(/[^\x20-\x7e]/g, ''));
  const header = fc.oneof(
    printable,
    printable.map((value) => `Bearer ${value}`),
    fc.uint8Array({ maxLength: 96 }).map((bytes) => `Basic ${Buffer.from(bytes).toString('base64')}`),
    fc.tuple(printable, printable).map(([user, password]) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`)
  );

  it('answers every forged or malformed admin Authorization header with 401 and a Basic challenge', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.vouchers();

    await fc.assert(
      fc.asyncProperty(header, async (authorization) => {
        const response = await readRaw(await GET(apiRequest('/api/vouchers', { headers: { authorization } })));
        expectSafeApiResponse(response);
        expect(response.status).toBe(401);
        expect(response.headers.get('www-authenticate')).toMatch(/^Basic /);
      }),
      propertyOptions(300)
    );
  });
});

describe('calendar date validation', () => {
  it('rejects an impossible calendar date (2026-13-45) on GET /api/slots with 400 (SEC-1)', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.slots();

    const response = await readRaw(await GET(apiRequest('/api/slots?date=2026-13-45&duration=60')));

    expect(response.status).toBe(400);
    expect(response.json).toMatchObject({ error: expect.any(String) });
  });

  it('rejects a booking checkout for an impossible calendar date with 400 and creates nothing (SEC-1)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { POST } = await app.routes.checkout();
    const before = (await app.store.getBookings()).length;

    const response = await readRaw(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ bookingDate: '2026-13-45', startTime: '10:00' }) }))
    );

    expect(response.status).toBe(400);
    expect((await app.store.getBookings()).length).toBe(before);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('rejects a workshop inquiry with an impossible target date with 400 (SEC-1)', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.workshops();

    const response = await readRaw(
      await POST(
        apiRequest('/api/workshops', {
          body: {
            companyName: 'Date Corp',
            contactName: 'Date Contact',
            email: 'date@corp.test',
            phone: '+972501234567',
            teamSize: 4,
            targetDate: '2026-02-30',
            primaryGoal: 'leadership',
          },
        })
      )
    );

    expect(response.status).toBe(400);
  });

  it('rejects an impossible calendar date on the admin schedule optimizer with 400 (SEC-1)', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.adminScheduleOptimization();

    const response = await readRaw(
      await POST(
        apiRequest('/api/admin/schedule-optimization', {
          headers: adminHeaders(),
          body: { date: '2026-13-45', requests: [{ id: 'r1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }] },
        })
      )
    );

    expect(response.status).toBe(400);
  });
});
