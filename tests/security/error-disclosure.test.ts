import { describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { adminHeaders, apiRequest, bearer, routeParams } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';
import {
  BOOKING_DATE,
  MEMBER_A,
  MEMBER_TOKENS,
  MEMBERS,
  SEED_VOUCHER_CODE,
  internalDetailsIn,
  readRaw,
  seedBooking,
} from './security-helpers';

/**
 * Simulated infrastructure failures. The messages imitate what Postgres/Supabase
 * and Node really return, carrying a marker that must never reach a client.
 */
const MARKER = 'internal_marker_7f3a';
const RAW_DB_MESSAGE = `permission denied for relation ${MARKER} (service_role) at /var/task/lib/db/store.ts:42:11`;

type StoreMethod = keyof TestApp['store'];
type FailureKind = 'unexpected exception' | 'raw database error';

interface FailureCase {
  label: string;
  storeMethod: StoreMethod;
  send: (app: TestApp) => Promise<Response>;
}

async function openSlotStart(app: TestApp): Promise<string> {
  return (await findOpenSlot(app, BOOKING_DATE, 20)).startTime;
}

const CASES: Record<string, FailureCase> = {
  slots: {
    label: 'GET /api/slots',
    storeMethod: 'getAvailableSlots',
    send: async (app) => (await app.routes.slots()).GET(apiRequest(`/api/slots?date=${BOOKING_DATE}&duration=60`)),
  },
  slotsEfficiency: {
    label: 'GET /api/slots?includeEfficiency=true',
    storeMethod: 'getDailyEfficiencyReport',
    send: async (app) =>
      (await app.routes.slots()).GET(apiRequest(`/api/slots?date=${BOOKING_DATE}&duration=60&includeEfficiency=true`)),
  },
  packages: {
    label: 'GET /api/packages',
    storeMethod: 'getPackages',
    send: async (app) => (await app.routes.packages()).GET(apiRequest('/api/packages')),
  },
  bookingLookup: {
    label: 'GET /api/bookings?ref=',
    storeMethod: 'getBookingByRef',
    send: async (app) => (await app.routes.bookings()).GET(apiRequest('/api/bookings?ref=SD-737-ABCDEFGHJKLMNPQR')),
  },
  bookingList: {
    label: 'GET /api/bookings (admin)',
    storeMethod: 'getBookings',
    send: async (app) => (await app.routes.bookings()).GET(apiRequest('/api/bookings', { headers: adminHeaders() })),
  },
  bookingPatch: {
    label: 'PATCH /api/bookings (admin)',
    storeMethod: 'updateBookingStatus',
    send: async (app) =>
      (await app.routes.bookings()).PATCH(
        apiRequest('/api/bookings', { method: 'PATCH', headers: adminHeaders(), body: { id: app.seed.DEMO_BOOKINGS[0].id, status: 'completed' } })
      ),
  },
  checkoutSlotCheck: {
    label: 'POST /api/checkout (slot validation)',
    storeMethod: 'getBookings',
    send: async (app) =>
      (await app.routes.checkout()).POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime: '12:30' }) })),
  },
  checkoutPersist: {
    label: 'POST /api/checkout (booking insert)',
    storeMethod: 'createBooking',
    send: async (app) => {
      const startTime = await openSlotStart(app);
      return (await app.routes.checkout()).POST(apiRequest('/api/checkout', { body: bookingCheckoutBody({ startTime }) }));
    },
  },
  voucherPurchase: {
    label: 'POST /api/checkout (gift voucher insert)',
    storeMethod: 'createPendingVoucher',
    send: async (app) => (await app.routes.checkout()).POST(apiRequest('/api/checkout', { body: voucherCheckoutBody() })),
  },
  voucherVerify: {
    label: 'POST /api/vouchers (verify)',
    storeMethod: 'getVoucherByCode',
    send: async (app) =>
      (await app.routes.vouchers()).POST(apiRequest('/api/vouchers', { body: { action: 'verify', code: SEED_VOUCHER_CODE } })),
  },
  voucherList: {
    label: 'GET /api/vouchers (admin)',
    storeMethod: 'getVouchers',
    send: async (app) => (await app.routes.vouchers()).GET(apiRequest('/api/vouchers', { headers: adminHeaders() })),
  },
  voucherRedeem: {
    label: 'PATCH /api/vouchers (admin redeem)',
    storeMethod: 'redeemVoucher',
    send: async (app) =>
      (await app.routes.vouchers()).PATCH(
        apiRequest('/api/vouchers', { method: 'PATCH', headers: adminHeaders(), body: { code: SEED_VOUCHER_CODE, amount: 10 } })
      ),
  },
  workshopList: {
    label: 'GET /api/workshops (admin)',
    storeMethod: 'getCorporateInquiries',
    send: async (app) => (await app.routes.workshops()).GET(apiRequest('/api/workshops', { headers: adminHeaders() })),
  },
  workshopCreate: {
    label: 'POST /api/workshops (inquiry)',
    storeMethod: 'createCorporateInquiry',
    send: async (app) =>
      (await app.routes.workshops()).POST(
        apiRequest('/api/workshops', {
          body: { companyName: 'Leak Corp', contactName: 'Leak', email: 'leak@corp.test', phone: '+972501234567', teamSize: 3, primaryGoal: 'leadership' },
        })
      ),
  },
  workshopPatch: {
    label: 'PATCH /api/workshops (admin)',
    storeMethod: 'updateInquiryStatus',
    send: async (app) =>
      (await app.routes.workshops()).PATCH(
        apiRequest('/api/workshops', { method: 'PATCH', headers: adminHeaders(), body: { id: 'corp-01', status: 'contacted' } })
      ),
  },
  myBookings: {
    label: 'GET /api/my-bookings',
    storeMethod: 'getBookingsForMember',
    send: async (app) => (await app.routes.myBookings()).GET(apiRequest('/api/my-bookings', { headers: bearer(MEMBER_TOKENS.a) })),
  },
  bootstrap: {
    label: 'POST /api/membership/bootstrap',
    storeMethod: 'ensureMemberProfile',
    send: async (app) =>
      (await app.routes.membershipBootstrap()).POST(
        apiRequest('/api/membership/bootstrap', { method: 'POST', headers: bearer(MEMBER_TOKENS.a) })
      ),
  },
  receipt: {
    label: 'GET /api/my-bookings/[ref]/receipt',
    storeMethod: 'getBookingByRef',
    send: async (app) => {
      const own = await seedBooking(app, { userId: MEMBER_A.id, pilotEmail: MEMBER_A.email });
      return (await app.routes.myBookingReceipt()).GET(
        apiRequest(`/api/my-bookings/${own.bookingReference}/receipt`, { headers: bearer(MEMBER_TOKENS.a) }),
        routeParams({ bookingReference: own.bookingReference })
      );
    },
  },
  webhook: {
    label: 'POST /api/webhooks/stripe',
    storeMethod: 'markBookingPaidIfPending',
    send: async (app) =>
      (await app.routes.stripeWebhook()).POST(
        signedWebhookRequest(checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId: 'book-0' } }))
      ),
  },
  scheduleOptimization: {
    label: 'POST /api/admin/schedule-optimization',
    storeMethod: 'getBookings',
    send: async (app) =>
      (await app.routes.adminScheduleOptimization()).POST(
        apiRequest('/api/admin/schedule-optimization', {
          headers: adminHeaders(),
          body: { date: '2026-11-02', requests: [{ id: 'r1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }] },
        })
      ),
  },
};

async function failingApp(storeMethod: StoreMethod, kind: FailureKind): Promise<TestApp> {
  const app = await loadApp({ stripe: 'mocked', members: MEMBERS });
  const { PersistenceError } = await import('@/lib/db/store');
  const failure =
    kind === 'raw database error' ? new PersistenceError(RAW_DB_MESSAGE) : new TypeError(`Cannot read properties of undefined (reading '${MARKER}')`);
  // Silence the server-side error log the routes are expected to write.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  // Narrowed view of the store: spying through the full class type is too complex for the compiler.
  const store = app.store as unknown as Record<StoreMethod, (...args: unknown[]) => Promise<unknown>>;
  vi.spyOn(store, storeMethod).mockRejectedValue(failure);
  return app;
}

function rows(keys: string[], kinds: FailureKind[]) {
  return keys.flatMap((key) => kinds.map((kind) => ({ ...CASES[key], kind })));
}

// SEC-5 (/api/slots stack traces) and SEC-6 (raw database messages) are fixed, so every
// case must hide both kinds of failure.
const ALL_CASES = Object.keys(CASES);

async function expectGenericFailure(storeMethod: StoreMethod, kind: FailureKind, send: FailureCase['send']): Promise<void> {
  const app = await failingApp(storeMethod, kind);

  const response = await readRaw(await send(app));

  expect(response.status, response.text).toBeGreaterThanOrEqual(400);
  expect(response.json).toMatchObject({ error: expect.any(String) });
  expect(response.text).not.toContain(MARKER);
  expect(response.text).not.toContain('service_role');
  expect(internalDetailsIn(response.text)).toEqual([]);
}

describe('internal failures never disclose internals to the client', () => {
  it.each(rows(ALL_CASES, ['unexpected exception', 'raw database error']))(
    '$label hides an $kind behind a generic JSON error',
    async ({ storeMethod, kind, send }) => {
      await expectGenericFailure(storeMethod, kind, send);
    }
  );

  it('answers a Stripe webhook processing failure with 503 so Stripe retries the delivery', async () => {
    const app = await failingApp('markBookingPaidIfPending', 'unexpected exception');

    const response = await readRaw(await CASES.webhook.send(app));

    expect(response.status).toBe(503);
    expect(response.json).toEqual({ error: 'Webhook processing failed.' });
  });
});
