import { describe, expect, it, vi, type MockInstance } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, basicAuth, bearer, routeParams, TEST_ORIGIN } from '../support/http';
import { TEST_ADMIN } from '../support/test-env';
import {
  BOOKING_DATE,
  FAKE_LIVE_STRIPE_KEY,
  IDENTITIES,
  IDENTITY_HEADERS,
  MEMBER_A,
  MEMBER_TOKENS,
  MEMBERS,
  PRODUCTION_ORIGIN,
  SEED_VOUCHER_CODE,
  readRaw,
  seedBooking,
  snapshotState,
  type Identity,
} from './security-helpers';

/**
 * Intended access policy per route and method:
 * - public: anyone, whatever credentials they present
 * - admin: HTTP Basic admin only; authenticated cross-origin mutations are refused (CSRF)
 * - member: verified-member Bearer token; an unverified email is refused with 403
 * - verified-member: verified-member Bearer token; anything else is 401
 * - stripe-signature: no caller identity grants access; only a Stripe signature does
 * - method-not-allowed: nobody
 */
type Policy = 'public' | 'admin' | 'member' | 'verified-member' | 'stripe-signature' | 'method-not-allowed';
type RouteName = keyof TestApp['routes'];
type Method = 'GET' | 'POST' | 'PATCH';

interface Arranged {
  app: TestApp;
  openSlotStart: string;
  ownedBookingReference: string;
  seedBookingId: string;
  receiptLookup: MockInstance;
}

interface RouteCase {
  label: string;
  route: RouteName;
  method: Method;
  policy: Policy;
  /** Status an authorized caller receives with the valid request below. */
  allowedStatus: number;
  path: (ctx: Arranged) => string;
  body?: (ctx: Arranged) => unknown;
  params?: (ctx: Arranged) => Record<string, string>;
}

const ROUTES: RouteCase[] = [
  {
    label: 'GET /api/admin/schedule-efficiency',
    route: 'adminScheduleEfficiency',
    method: 'GET',
    policy: 'admin',
    allowedStatus: 200,
    path: () => `/api/admin/schedule-efficiency?date=${BOOKING_DATE}`,
  },
  {
    label: 'POST /api/admin/schedule-optimization',
    route: 'adminScheduleOptimization',
    method: 'POST',
    policy: 'admin',
    allowedStatus: 200,
    path: () => '/api/admin/schedule-optimization',
    body: () => ({
      date: '2026-11-02',
      requests: [{ id: 'draft-1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }],
    }),
  },
  { label: 'GET /api/bookings (all)', route: 'bookings', method: 'GET', policy: 'admin', allowedStatus: 200, path: () => '/api/bookings' },
  // Lookups by email or internal id would enable customer enumeration if they were public.
  {
    label: 'GET /api/bookings?email=',
    route: 'bookings',
    method: 'GET',
    policy: 'admin',
    allowedStatus: 200,
    path: () => `/api/bookings?email=${encodeURIComponent(MEMBER_A.email)}`,
  },
  {
    label: 'GET /api/bookings?id=',
    route: 'bookings',
    method: 'GET',
    policy: 'admin',
    allowedStatus: 200,
    path: (ctx) => `/api/bookings?id=${ctx.seedBookingId}`,
  },
  {
    label: 'GET /api/bookings?ref=',
    route: 'bookings',
    method: 'GET',
    policy: 'public',
    allowedStatus: 200,
    path: (ctx) => `/api/bookings?ref=${ctx.ownedBookingReference}`,
  },
  {
    label: 'POST /api/bookings',
    route: 'bookings',
    method: 'POST',
    policy: 'method-not-allowed',
    allowedStatus: 405,
    path: () => '/api/bookings',
    body: () => bookingCheckoutBody(),
  },
  {
    label: 'PATCH /api/bookings',
    route: 'bookings',
    method: 'PATCH',
    policy: 'admin',
    allowedStatus: 200,
    path: () => '/api/bookings',
    body: (ctx) => ({ id: ctx.seedBookingId, status: 'completed' }),
  },
  {
    label: 'POST /api/checkout',
    route: 'checkout',
    method: 'POST',
    policy: 'public',
    allowedStatus: 201,
    path: () => '/api/checkout',
    body: (ctx) => bookingCheckoutBody({ startTime: ctx.openSlotStart }),
  },
  {
    label: 'POST /api/membership/bootstrap',
    route: 'membershipBootstrap',
    method: 'POST',
    policy: 'member',
    allowedStatus: 200,
    path: () => '/api/membership/bootstrap',
  },
  { label: 'GET /api/my-bookings', route: 'myBookings', method: 'GET', policy: 'member', allowedStatus: 200, path: () => '/api/my-bookings' },
  {
    label: 'GET /api/my-bookings/[ref]/receipt',
    route: 'myBookingReceipt',
    method: 'GET',
    policy: 'verified-member',
    allowedStatus: 200,
    path: (ctx) => `/api/my-bookings/${ctx.ownedBookingReference}/receipt`,
    params: (ctx) => ({ bookingReference: ctx.ownedBookingReference }),
  },
  { label: 'GET /api/packages', route: 'packages', method: 'GET', policy: 'public', allowedStatus: 200, path: () => '/api/packages' },
  { label: 'GET /api/reviews', route: 'reviews', method: 'GET', policy: 'public', allowedStatus: 200, path: () => '/api/reviews' },
  { label: 'POST /api/reviews (sync)', route: 'reviews', method: 'POST', policy: 'admin', allowedStatus: 200, path: () => '/api/reviews' },
  {
    label: 'GET /api/slots',
    route: 'slots',
    method: 'GET',
    policy: 'public',
    allowedStatus: 200,
    path: () => `/api/slots?date=${BOOKING_DATE}&duration=60`,
  },
  { label: 'GET /api/vouchers', route: 'vouchers', method: 'GET', policy: 'admin', allowedStatus: 200, path: () => '/api/vouchers' },
  {
    label: 'POST /api/vouchers (verify)',
    route: 'vouchers',
    method: 'POST',
    policy: 'public',
    allowedStatus: 200,
    path: () => '/api/vouchers',
    body: () => ({ action: 'verify', code: SEED_VOUCHER_CODE }),
  },
  {
    label: 'PATCH /api/vouchers (redeem)',
    route: 'vouchers',
    method: 'PATCH',
    policy: 'admin',
    allowedStatus: 200,
    path: () => '/api/vouchers',
    body: () => ({ code: SEED_VOUCHER_CODE, amount: 50 }),
  },
  {
    label: 'POST /api/webhooks/stripe',
    route: 'stripeWebhook',
    method: 'POST',
    policy: 'stripe-signature',
    allowedStatus: 200,
    path: () => '/api/webhooks/stripe',
    body: () => ({ type: 'checkout.session.completed', data: { object: { metadata: {} } } }),
  },
  { label: 'GET /api/workshops', route: 'workshops', method: 'GET', policy: 'admin', allowedStatus: 200, path: () => '/api/workshops' },
  {
    label: 'POST /api/workshops (inquiry)',
    route: 'workshops',
    method: 'POST',
    policy: 'public',
    allowedStatus: 201,
    path: () => '/api/workshops',
    body: () => ({
      companyName: 'Matrix Corp',
      contactName: 'Matrix Contact',
      email: 'contact@matrix.test',
      phone: '+972501234567',
      teamSize: 6,
      primaryGoal: 'leadership',
    }),
  },
  {
    label: 'PATCH /api/workshops',
    route: 'workshops',
    method: 'PATCH',
    policy: 'admin',
    allowedStatus: 200,
    path: () => '/api/workshops',
    body: () => ({ id: 'corp-01', status: 'contacted' }),
  },
];

type Outcome = { allowed: true } | { allowed: false; status: number };

function expectedOutcome(route: RouteCase, identity: Identity): Outcome {
  switch (route.policy) {
    case 'public':
      return { allowed: true };
    case 'method-not-allowed':
      return { allowed: false, status: 405 };
    case 'stripe-signature':
      return { allowed: false, status: 400 };
    case 'admin':
      if (identity === 'admin') return { allowed: true };
      if (identity === 'admin from a cross-origin page') {
        return route.method === 'GET' ? { allowed: true } : { allowed: false, status: 403 };
      }
      return { allowed: false, status: 401 };
    case 'member':
      if (identity === 'verified member') return { allowed: true };
      return { allowed: false, status: identity === 'unverified member' ? 403 : 401 };
    case 'verified-member':
      return identity === 'verified member' ? { allowed: true } : { allowed: false, status: 401 };
  }
}

async function arrange(): Promise<Arranged> {
  const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
  const slot = await findOpenSlot(app, BOOKING_DATE, 20);
  const owned = await seedBooking(app, { userId: MEMBER_A.id, pilotEmail: MEMBER_A.email });

  // The receipt route asks Stripe for the charge; answer in-process instead of over the network.
  const { stripe } = await import('@/lib/stripe');
  if (!stripe) throw new Error('Stripe client should exist with test keys outside production');
  const receiptLookup = vi
    .spyOn(stripe.paymentIntents, 'retrieve')
    .mockResolvedValue({ latest_charge: { receipt_url: 'https://pay.stripe.com/receipts/test' } } as never);

  return {
    app,
    openSlotStart: slot.startTime,
    ownedBookingReference: owned.bookingReference,
    seedBookingId: app.seed.DEMO_BOOKINGS[0].id,
    receiptLookup,
  };
}

async function call(ctx: Arranged, route: RouteCase, headers: Record<string, string>): Promise<Response> {
  const module = (await ctx.app.routes[route.route]()) as Record<string, unknown>;
  const handler = module[route.method] as (request: Request, context?: unknown) => Promise<Response>;
  const request = apiRequest(route.path(ctx), {
    method: route.method,
    body: route.body?.(ctx),
    headers,
  });
  return route.params ? handler(request, routeParams(route.params(ctx))) : handler(request);
}

const MATRIX = ROUTES.flatMap((route) =>
  IDENTITIES.map((identity) => ({ route, identity, label: route.label, outcome: expectedOutcome(route, identity) }))
);

describe('authorization matrix (route x method x identity)', () => {
  it.each(MATRIX)('$label as $identity', async ({ route, identity, outcome }) => {
    const ctx = await arrange();
    const before = await snapshotState(ctx.app);

    const response = await readRaw(await call(ctx, route, IDENTITY_HEADERS[identity]));

    if (outcome.allowed) {
      expect(response.status, response.text.slice(0, 200)).toBe(route.allowedStatus);
      expect(response.json).not.toHaveProperty('error');
      return;
    }

    expect(response.status, response.text.slice(0, 200)).toBe(outcome.status);
    expect(response.json).toMatchObject({ error: expect.any(String) });
    expect(await snapshotState(ctx.app), 'a refused request must not change state').toBe(before);
    expect(ctx.receiptLookup).not.toHaveBeenCalled();
    if (route.policy === 'admin' && outcome.status === 401) {
      expect(response.headers.get('www-authenticate')).toMatch(/^Basic realm="Sim Dream Admin"/);
    }
  });
});

const ADMIN_MUTATIONS = ROUTES.filter((route) => route.policy === 'admin' && route.method !== 'GET');
const HOSTILE_ORIGINS = [
  'https://evil.example',
  'null',
  'http://localhost:3000.evil.example',
  'http://localhost:3001',
  'https://localhost:3000',
  'not a url',
];

describe('admin CSRF defence', () => {
  it.each(ADMIN_MUTATIONS.flatMap((route) => HOSTILE_ORIGINS.map((origin) => ({ route, origin, label: route.label }))))(
    'refuses $label from Origin "$origin" with valid admin credentials',
    async ({ route, origin }) => {
      const ctx = await arrange();
      const before = await snapshotState(ctx.app);

      const response = await readRaw(await call(ctx, route, adminHeaders({ origin })));

      expect(response.status).toBe(403);
      expect(response.json).toEqual({ error: 'Cross-origin admin mutations are not allowed.' });
      expect(await snapshotState(ctx.app)).toBe(before);
    }
  );

  it.each(ADMIN_MUTATIONS)('accepts $label from the same origin', async (route) => {
    const ctx = await arrange();

    const response = await readRaw(await call(ctx, route, adminHeaders({ origin: TEST_ORIGIN })));

    expect(response.status, response.text.slice(0, 200)).toBe(route.allowedStatus);
  });
});

describe('identity provider failure', () => {
  it('fails closed (401) when a Bearer token cannot be verified because Supabase is unreachable', async () => {
    // No members map: the real resolver runs and Supabase is not configured in the sandbox.
    const app = await loadApp();
    const { GET } = await app.routes.myBookings();

    const response = await readRaw(await GET(apiRequest('/api/my-bookings', { headers: bearer(MEMBER_TOKENS.a) })));

    expect(response.status).toBe(401);
    expect(response.json).toEqual({ error: 'Authentication required.' });
  });
});

describe('admin configuration', () => {
  it('disables admin access (503) when ADMIN_USER and ADMIN_PASSWORD are not configured', async () => {
    const app = await loadApp({ env: { ADMIN_USER: '', ADMIN_PASSWORD: '' } });
    const { GET } = await app.routes.bookings();

    const response = await readRaw(await GET(apiRequest('/api/bookings', { headers: adminHeaders() })));

    expect(response.status).toBe(503);
    expect(response.json).toMatchObject({ error: expect.stringContaining('disabled') });
  });
});

describe('production-mode rules', () => {
  const PRODUCTION = { NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: PRODUCTION_ORIGIN };

  it('ignores the x-simdream-demo-email header on /api/my-bookings in production (401)', async () => {
    const app = await loadApp({ env: PRODUCTION });
    const { GET } = await app.routes.myBookings();

    const response = await readRaw(
      await GET(apiRequest('/api/my-bookings', { headers: { 'x-simdream-demo-email': 'pilot@simdream.co.il' } }))
    );

    expect(response.status).toBe(401);
    expect(response.json).toEqual({ error: 'Authentication required.' });
  });

  it('honours the demo header outside production (control proving the header is otherwise effective)', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.myBookings();

    const response = await readRaw(
      await GET(apiRequest('/api/my-bookings', { headers: { 'x-simdream-demo-email': 'pilot@simdream.co.il' } }))
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual(expect.arrayContaining([expect.objectContaining({ pilotEmail: 'pilot@simdream.co.il' })]));
  });

  const SHORT_PASSWORD = 'short-pass-123';
  const ADMIN_READS: Array<{ label: string; route: RouteName; path: string }> = [
    { label: 'GET /api/bookings', route: 'bookings', path: '/api/bookings' },
    { label: 'GET /api/vouchers', route: 'vouchers', path: '/api/vouchers' },
    { label: 'GET /api/workshops', route: 'workshops', path: '/api/workshops' },
  ];

  it.each(ADMIN_READS)(
    'disables admin access (503) on $label when the production admin password is shorter than 16 characters',
    async ({ route, path }) => {
      const app = await loadApp({ env: { ...PRODUCTION, ADMIN_PASSWORD: SHORT_PASSWORD } });
      const module = (await app.routes[route]()) as { GET: (request: Request) => Promise<Response> };

      const response = await readRaw(
        await module.GET(apiRequest(path, { headers: { authorization: basicAuth(TEST_ADMIN.user, SHORT_PASSWORD) } }))
      );

      expect(SHORT_PASSWORD.length).toBeLessThan(16);
      expect(response.status).toBe(503);
      expect(response.json).toMatchObject({ error: expect.stringContaining('disabled') });
    }
  );

  it('accepts a 16+ character admin password in production (control)', async () => {
    const app = await loadApp({ env: PRODUCTION });
    const { GET } = await app.routes.bookings();

    const response = await readRaw(await GET(apiRequest('/api/bookings', { headers: adminHeaders() })));

    expect(response.status).toBe(200);
  });

  it('keeps card payments disabled (503) in production when Stripe uses sk_test keys, creating nothing', async () => {
    const app = await loadApp({ env: PRODUCTION, stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const before = await snapshotState(app);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: slot.startTime }) }))
    );

    expect(response.status).toBe(503);
    expect(response.json).toEqual({ error: 'Online payments are temporarily unavailable. Please contact us to book.' });
    expect(app.checkoutSessions).toHaveLength(0);
    expect(await snapshotState(app)).toBe(before);
  });

  it('enables card payments in production only with a live-mode key (control)', async () => {
    const app = await loadApp({ env: { ...PRODUCTION, STRIPE_SECRET_KEY: FAKE_LIVE_STRIPE_KEY }, stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readRaw(
      await POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: slot.startTime }) }))
    );

    expect(response.status).toBe(201);
    expect(app.checkoutSessions).toHaveLength(1);
  });
});
