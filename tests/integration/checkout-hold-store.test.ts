import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '@/types';
import { loadApp } from '../support/app';
import { createFakeSupabase, paidGuestBookingRow, type FakeSupabase } from '../security/fake-supabase';
import { EMPTY_DAY } from './api-helpers';

/**
 * Persistence of unpaid card holds (lib/db/checkout-hold-store.ts, migration 013) in both store
 * modes: the process memory used by development and tests, and Postgres through Supabase, here
 * an in-memory stand-in that applies PostgREST filters.
 */

const PILOT = 'hold.owner@holds.test';
const CHECKOUT = {
  sessionId: 'cs_test_hold_1',
  url: 'https://checkout.stripe.com/c/pay/cs_test_hold_1',
  expiresAt: '2026-11-01T06:30:00.000Z',
};

afterEach(() => {
  vi.doUnmock('@/lib/db/supabase-admin');
});

describe('unpaid holds in the in-memory store', () => {
  async function memoryHolds() {
    const app = await loadApp();
    const holds = await import('@/lib/db/checkout-hold-store');
    const create = (overrides: Partial<Booking> & Pick<Booking, 'startTime'>) =>
      app.store.createBooking({
        packageId: 'pkg-discovery-30',
        packageTitle: 'Discovery Flight',
        durationMinutes: 30,
        bookingDate: EMPTY_DAY.sunday,
        endTime: '00:00',
        pilotName: 'Hold Owner',
        pilotEmail: PILOT,
        pilotPhone: '+972501234567',
        experienceLevel: 'beginner',
        addons: [],
        subtotalIls: 450,
        discountIls: 0,
        totalIls: 450,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        ...overrides,
      });
    return { app, holds, create };
  }

  it('lists only the unpaid pending card bookings of one normalized email', async () => {
    const { holds, create } = await memoryHolds();
    const pending = await create({ startTime: '09:00' });
    await create({ startTime: '10:00', status: 'confirmed', paymentStatus: 'paid' });
    await create({ startTime: '11:00', status: 'cancelled' });
    await create({ startTime: '12:00', pilotEmail: 'someone.else@holds.test' });
    // Pending and unpaid, but entered at the desk: not a card checkout's hold.
    await create({ startTime: '13:00', paymentMethod: 'desk' });

    const listed = await holds.listUnpaidPendingBookings('  Hold.Owner@HOLDS.test ');

    expect(listed.map((booking) => booking.id)).toEqual([pending.id]);
  });

  it('stores the hosted checkout on a pending booking only', async () => {
    const { app, holds, create } = await memoryHolds();
    const pending = await create({ startTime: '09:00' });
    const paid = await create({ startTime: '10:00', status: 'confirmed', paymentStatus: 'paid' });

    await holds.attachHostedCheckout(pending.id, CHECKOUT);
    await holds.attachHostedCheckout(paid.id, CHECKOUT);

    expect(await app.store.getBookingById(pending.id)).toMatchObject({
      stripeCheckoutSessionId: CHECKOUT.sessionId,
      stripeCheckoutUrl: CHECKOUT.url,
      stripeCheckoutExpiresAt: CHECKOUT.expiresAt,
    });
    expect((await app.store.getBookingById(paid.id))?.stripeCheckoutSessionId).toBeUndefined();
  });
});

describe('unpaid holds in Postgres', () => {
  async function postgresHolds(rows: Record<string, unknown>[]): Promise<{ supabase: FakeSupabase; holds: typeof import('@/lib/db/checkout-hold-store') }> {
    const supabase = createFakeSupabase({ bookings: rows });
    vi.doMock('@/lib/db/supabase-admin', () => ({ getSupabaseAdmin: () => supabase, requireSupabaseAdmin: () => supabase }));
    await loadApp({ env: { NODE_ENV: 'production' } });
    return { supabase, holds: await import('@/lib/db/checkout-hold-store') };
  }

  const pendingRow = (overrides: Record<string, unknown> = {}) =>
    paidGuestBookingRow({
      id: crypto.randomUUID(),
      pilot_email: PILOT,
      status: 'pending',
      payment_status: 'pending',
      stripe_payment_intent: null,
      ...overrides,
    });

  it('writes the three hosted-checkout columns of a pending booking, and nothing on a paid one', async () => {
    const pending = pendingRow();
    const paid = pendingRow({ status: 'confirmed', payment_status: 'paid' });
    const { supabase, holds } = await postgresHolds([pending, paid]);

    await holds.attachHostedCheckout(String(pending.id), CHECKOUT);
    await holds.attachHostedCheckout(String(paid.id), CHECKOUT);

    const [storedPending, storedPaid] = supabase.tables.bookings;
    expect(storedPending).toMatchObject({
      stripe_checkout_session_id: CHECKOUT.sessionId,
      stripe_checkout_url: CHECKOUT.url,
      stripe_checkout_expires_at: CHECKOUT.expiresAt,
    });
    expect(storedPaid.stripe_checkout_session_id).toBeUndefined();
  });

  it('reads the unpaid holds of one email with their hosted checkout', async () => {
    const pending = pendingRow({
      stripe_checkout_session_id: CHECKOUT.sessionId,
      stripe_checkout_url: CHECKOUT.url,
      stripe_checkout_expires_at: '2026-11-01T06:30:00+00:00',
    });
    const { holds } = await postgresHolds([
      pending,
      pendingRow({ status: 'confirmed', payment_status: 'paid' }),
      pendingRow({ status: 'cancelled' }),
      pendingRow({ pilot_email: 'someone.else@holds.test' }),
      pendingRow({ payment_method: 'desk' }),
    ]);

    const listed = await holds.listUnpaidPendingBookings('Hold.Owner@holds.test');

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: pending.id,
      stripeCheckoutSessionId: CHECKOUT.sessionId,
      stripeCheckoutUrl: CHECKOUT.url,
      stripeCheckoutExpiresAt: '2026-11-01T06:30:00+00:00',
    });
  });

  it('reads a hold from a database that does not have the migration 013 columns yet', async () => {
    // The listing selects `*`, so Postgres returns the columns that exist and never names the missing ones.
    const unmigrated = pendingRow();
    for (const column of ['stripe_checkout_session_id', 'stripe_checkout_url', 'stripe_checkout_expires_at']) {
      expect(unmigrated).not.toHaveProperty(column);
    }
    const { holds } = await postgresHolds([unmigrated]);

    const [hold] = await holds.listUnpaidPendingBookings(PILOT);

    expect(hold).toMatchObject({ id: unmigrated.id, status: 'pending', paymentStatus: 'pending' });
    expect([hold.stripeCheckoutSessionId, hold.stripeCheckoutUrl, hold.stripeCheckoutExpiresAt]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('reports a failed write as unavailable storage and logs only the database error code', async () => {
    const failing = {
      from: () => ({
        update: () => ({
          eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: { code: '42703', message: 'column "stripe_checkout_url" does not exist' } }) }) }),
        }),
      }),
    };
    vi.doMock('@/lib/db/supabase-admin', () => ({ getSupabaseAdmin: () => failing, requireSupabaseAdmin: () => failing }));
    await loadApp({ env: { NODE_ENV: 'production' } });
    const holds = await import('@/lib/db/checkout-hold-store');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(holds.attachHostedCheckout('booking-1', CHECKOUT)).rejects.toMatchObject({ name: 'PersistenceError' });
    expect(log.mock.calls).toEqual([['Hosted checkout could not be stored', '42703']]);
  });

  it('fails closed in production without storage', async () => {
    await loadApp({ env: { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '' } });
    const holds = await import('@/lib/db/checkout-hold-store');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(holds.attachHostedCheckout('booking-1', CHECKOUT)).rejects.toMatchObject({ name: 'PersistenceError' });
  });
});
