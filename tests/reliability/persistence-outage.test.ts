import { describe, expect, it } from 'vitest';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, bearer, routeParams } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import { PRODUCTION_PAYMENTS_ENV, UNREACHABLE_SUPABASE_ENV, withRetryClock } from './helpers';

// Production rules with Supabase configured but unreachable: every persistence call fails.
const MEMBER_TOKEN = 'member-outage-token';
const BOOKING_REFERENCE = 'SD-737-ABCDEFGHJKLMNPQR';
const SEED_VOUCHER_CODE = 'SD-VOUCH-DF7QK3MN8R2V6X9LPA';
const STACK_TRACE = /\bat \S+ \(|\.tsx?:\d+|node_modules|\/Users\//;
const INTERNALS = /fetch failed|127\.0\.0\.1|supabase|PersistenceError/i;

const MEMBERS = { [MEMBER_TOKEN]: { id: 'member-outage', email: 'member-outage@example.test', emailVerified: true } };

function loadOutageApp() {
  return loadApp({ stripe: 'mocked', env: { ...PRODUCTION_PAYMENTS_ENV, ...UNREACHABLE_SUPABASE_ENV }, members: MEMBERS });
}

interface OutageCase {
  name: string;
  call: (app: TestApp) => Promise<Response>;
}

const RESILIENT_ROUTES: OutageCase[] = [
  {
    // Fixed REL-4: previously a 500 carrying the driver message and stack trace.
    name: 'GET /api/slots',
    call: async (app) => (await app.routes.slots()).GET(apiRequest('/api/slots?date=2026-11-02&duration=60')),
  },
  {
    name: 'GET /api/bookings?ref (public lookup)',
    call: async (app) => (await app.routes.bookings()).GET(apiRequest(`/api/bookings?ref=${BOOKING_REFERENCE}`)),
  },
  {
    name: 'GET /api/bookings (admin list)',
    call: async (app) => (await app.routes.bookings()).GET(apiRequest('/api/bookings', { headers: adminHeaders() })),
  },
  {
    name: 'POST /api/checkout (gift voucher)',
    call: async (app) => (await app.routes.checkout()).POST(apiRequest('/api/checkout', { body: voucherCheckoutBody() })),
  },
  {
    name: 'POST /api/vouchers (verify)',
    call: async (app) =>
      (await app.routes.vouchers()).POST(
        apiRequest('/api/vouchers', { body: { action: 'verify', code: SEED_VOUCHER_CODE } })
      ),
  },
  {
    name: 'GET /api/vouchers (admin list)',
    call: async (app) => (await app.routes.vouchers()).GET(apiRequest('/api/vouchers', { headers: adminHeaders() })),
  },
  {
    name: 'POST /api/workshops (inquiry)',
    call: async (app) =>
      (await app.routes.workshops()).POST(
        apiRequest('/api/workshops', {
          body: {
            companyName: 'Outage Co',
            contactName: 'Ops Lead',
            email: 'ops@example.test',
            phone: '+972501234567',
            teamSize: 4,
            primaryGoal: 'leadership',
          },
        })
      ),
  },
  {
    name: 'GET /api/workshops (admin list)',
    call: async (app) => (await app.routes.workshops()).GET(apiRequest('/api/workshops', { headers: adminHeaders() })),
  },
  {
    name: 'PATCH /api/workshops (admin status)',
    call: async (app) =>
      (await app.routes.workshops()).PATCH(
        apiRequest('/api/workshops', {
          method: 'PATCH',
          body: { id: 'corp-01', status: 'contacted' },
          headers: adminHeaders(),
        })
      ),
  },
  {
    name: 'POST /api/admin/schedule-optimization',
    call: async (app) =>
      (await app.routes.adminScheduleOptimization()).POST(
        apiRequest('/api/admin/schedule-optimization', {
          body: {
            date: '2026-11-02',
            requests: [{ id: 'draft-1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }],
          },
          headers: adminHeaders(),
        })
      ),
  },
  {
    name: 'POST /api/membership/bootstrap',
    call: async (app) =>
      (await app.routes.membershipBootstrap()).POST(
        apiRequest('/api/membership/bootstrap', { method: 'POST', headers: bearer(MEMBER_TOKEN) })
      ),
  },
  {
    name: 'GET /api/my-bookings',
    call: async (app) => (await app.routes.myBookings()).GET(apiRequest('/api/my-bookings', { headers: bearer(MEMBER_TOKEN) })),
  },
  {
    name: 'GET /api/my-bookings/[ref]/receipt',
    call: async (app) =>
      (await app.routes.myBookingReceipt()).GET(
        apiRequest(`/api/my-bookings/${BOOKING_REFERENCE}/receipt`, { headers: bearer(MEMBER_TOKEN) }),
        routeParams({ bookingReference: BOOKING_REFERENCE })
      ),
  },
  {
    name: 'POST /api/webhooks/stripe (completed)',
    call: async (app) =>
      (await app.routes.stripeWebhook()).POST(
        signedWebhookRequest(
          checkoutSessionEvent('checkout.session.completed', {
            metadata: { bookingId: '7f1d5c8e-0000-4000-8000-000000000001' },
          })
        )
      ),
  },
  // Fixed REL-5 (previously 500) and REL-6 (previously 409 echoing the driver message).
  {
    name: 'GET /api/packages',
    call: async (app) => (await app.routes.packages()).GET(apiRequest('/api/packages')),
  },
  {
    name: 'POST /api/checkout (card booking)',
    call: async (app) =>
      (await app.routes.checkout()).POST(
        apiRequest('/api/checkout', {
          body: bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: '2026-11-02', startTime: '10:00' }),
        })
      ),
  },
  {
    name: 'POST /api/checkout (voucher-funded booking)',
    call: async (app) =>
      (await app.routes.checkout()).POST(
        apiRequest('/api/checkout', {
          body: bookingCheckoutBody({ bookingDate: '2026-11-02', startTime: '10:00', voucherCode: SEED_VOUCHER_CODE }),
        })
      ),
  },
  {
    name: 'PATCH /api/vouchers (admin redemption)',
    call: async (app) =>
      (await app.routes.vouchers()).PATCH(
        apiRequest('/api/vouchers', {
          method: 'PATCH',
          body: { code: SEED_VOUCHER_CODE, amount: 50 },
          headers: adminHeaders(),
        })
      ),
  },
  {
    name: 'PATCH /api/bookings (admin status)',
    call: async (app) =>
      (await app.routes.bookings()).PATCH(
        apiRequest('/api/bookings', {
          method: 'PATCH',
          body: { id: 'book-101', status: 'cancelled' },
          headers: adminHeaders(),
        })
      ),
  },
];

/** A JSON 503 the client can act on: never a 500, a 409, a stack trace or driver internals. */
async function expectServiceUnavailable(response: Response) {
  const text = await response.text();
  expect({ status: response.status, contentType: response.headers.get('content-type') }).toEqual({
    status: 503,
    contentType: expect.stringContaining('application/json'),
  });
  const body = JSON.parse(text) as Record<string, unknown>;
  expect(body).toEqual({ error: expect.any(String) });
  expect(text).not.toMatch(STACK_TRACE);
  expect(text).not.toMatch(INTERNALS);
}

describe('database outage in production', () => {
  // Control: the same calls under the same production rules, minus the unreachable
  // database, must not 503. This proves each 503 below comes from the outage and
  // not from an unrelated guard (payments, admin or member configuration).
  it.each(RESILIENT_ROUTES)('answers $name without a 5xx when the database is not involved (control)', async ({ call }) => {
    const app = await loadApp({ stripe: 'mocked', env: PRODUCTION_PAYMENTS_ENV, members: MEMBERS });

    const response = await call(app);

    expect(response.status).toBeLessThan(500);
  });

  it.each(RESILIENT_ROUTES)('answers $name with a JSON 503', async ({ call }) => {
    const app = await loadOutageApp();

    const response = await withRetryClock(() => call(app));

    await expectServiceUnavailable(response);
  });
});
