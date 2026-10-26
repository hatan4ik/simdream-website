import { vi } from 'vitest';
import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import type { CreateCheckoutParams } from '@/lib/stripe';
import { IN_MEMORY_STORE_ENV, SANDBOX_ENV, STRIPE_TEST_ENV } from './test-env';

/** Sunday 1 Nov 2026, 08:00 Israel time: before opening, so every slot that day is still in the future. */
export const DEFAULT_TEST_NOW = '2026-11-01T08:00:00+02:00';

export interface LoadAppOptions {
  /** Frozen wall clock (Date only; timers stay real). `null` keeps the real clock. */
  now?: string | null;
  /** Extra or overriding environment, applied after the sandbox. `NODE_ENV: 'production'` selects production rules. */
  env?: Record<string, string>;
  /** `mocked` enables payments with test keys and records Checkout sessions instead of calling Stripe. */
  stripe?: 'disabled' | 'mocked';
  /** Bearer token → verified member identity, replacing Supabase Auth lookups. */
  members?: Record<string, VerifiedMemberIdentity>;
  /** Make Checkout Session creation fail, simulating a Stripe outage. */
  stripeFailure?: Error;
}

type StoreGlobal = typeof globalThis & { __simDreamStoreV10?: unknown };

/**
 * Loads the application's server modules with a fresh in-memory store, a frozen
 * clock and sandboxed environment. Seed bookings are generated relative to the
 * clock, so a fixed `now` makes availability deterministic.
 */
export async function loadApp(options: LoadAppOptions = {}) {
  vi.resetModules();
  vi.doUnmock('@/lib/stripe');
  vi.doUnmock('@/lib/auth/request-auth');
  delete (globalThis as StoreGlobal).__simDreamStoreV10;

  if (options.now !== null) {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(options.now ?? DEFAULT_TEST_NOW) });
  }

  const env = {
    ...SANDBOX_ENV,
    ...IN_MEMORY_STORE_ENV,
    ...(options.stripe === 'mocked' ? STRIPE_TEST_ENV : {}),
    ...options.env,
  };
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);

  const checkoutSessions: CreateCheckoutParams[] = [];
  if (options.stripe === 'mocked') {
    vi.doMock('@/lib/stripe', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/stripe')>();
      return {
        ...actual,
        createCheckoutSession: vi.fn(async (params: CreateCheckoutParams) => {
          if (options.stripeFailure) throw options.stripeFailure;
          checkoutSessions.push(params);
          const sessionId = `cs_test_mock_${checkoutSessions.length}`;
          return { url: `https://checkout.stripe.com/c/pay/${sessionId}`, sessionId };
        }),
      };
    });
  }

  const members = options.members;
  if (members) {
    vi.doMock('@/lib/auth/request-auth', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/auth/request-auth')>();
      return {
        ...actual,
        requireAuthenticatedUser: async (request: Request) => {
          const header = request.headers.get('authorization') ?? '';
          const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
          return members[token] ?? null;
        },
      };
    });
  }

  const [{ store }, seed] = await Promise.all([import('@/lib/db/store'), import('@/lib/db/seed-data')]);

  return {
    store,
    seed,
    /** Checkout Session parameters recorded by the Stripe mock, in call order. */
    checkoutSessions,
    routes: {
      adminScheduleEfficiency: () => import('@/app/api/admin/schedule-efficiency/route'),
      adminScheduleOptimization: () => import('@/app/api/admin/schedule-optimization/route'),
      bookings: () => import('@/app/api/bookings/route'),
      checkout: () => import('@/app/api/checkout/route'),
      membershipBootstrap: () => import('@/app/api/membership/bootstrap/route'),
      myBookings: () => import('@/app/api/my-bookings/route'),
      myBookingReceipt: () => import('@/app/api/my-bookings/[bookingReference]/receipt/route'),
      packages: () => import('@/app/api/packages/route'),
      reviews: () => import('@/app/api/reviews/route'),
      slots: () => import('@/app/api/slots/route'),
      stripeWebhook: () => import('@/app/api/webhooks/stripe/route'),
      vouchers: () => import('@/app/api/vouchers/route'),
      workshops: () => import('@/app/api/workshops/route'),
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof loadApp>>;

/** First open departure for a package duration on a date, discovered from the real scheduler. */
export async function findOpenSlot(app: TestApp, date: string, durationMinutes: number) {
  const slots = await app.store.getAvailableSlots(date, durationMinutes);
  const open = slots.find((slot) => slot.available);
  if (!open) throw new Error(`No open ${durationMinutes}m slot on ${date}`);
  return open;
}

/** A valid booking checkout body; override any field per test. */
export function bookingCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'booking',
    packageId: 'pkg-discovery-30',
    bookingDate: '2026-11-01',
    startTime: '10:00',
    pilotName: 'Test Pilot',
    pilotEmail: 'pilot@example.test',
    pilotPhone: '+972501234567',
    experienceLevel: 'beginner',
    addons: [],
    ...overrides,
  };
}

/** A valid gift voucher checkout body; override any field per test. */
export function voucherCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'voucher',
    amountIls: 500,
    recipientName: 'Gift Recipient',
    recipientEmail: 'recipient@example.test',
    senderName: 'Gift Sender',
    senderEmail: 'sender@example.test',
    personalMessage: 'Enjoy the flight',
    ...overrides,
  };
}
