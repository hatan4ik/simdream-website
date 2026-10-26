import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import { loadApp } from '../support/app';
import { apiRequest, bearer, readJson } from '../support/http';
import { createFakeSupabase, ilikePattern, paidGuestBookingRow, type FakeSupabase } from './fake-supabase';
import { PRODUCTION_ORIGIN } from './security-helpers';

/**
 * Production stores bookings in Postgres, and members claim paid guest bookings
 * whose pilot email matches their verified email (lib/db/store.ts
 * linkGuestBookingsToMember). These tests run that production path against an
 * in-memory Supabase stand-in that evaluates filters with Postgres semantics.
 */

const VICTIM_EMAIL = 'john.smith@outlook.test';
const VICTIM: VerifiedMemberIdentity = { id: 'member-victim', email: 'John.Smith@Outlook.test', emailVerified: true };
// A different, independently verifiable mailbox: many providers allow "_" in the local part.
const LOOKALIKE: VerifiedMemberIdentity = { id: 'member-lookalike', email: 'john_smith@outlook.test', emailVerified: true };
const TOKENS = { victim: 'token-victim', lookalike: 'token-lookalike' } as const;

async function productionApp(): Promise<{ supabase: FakeSupabase; app: Awaited<ReturnType<typeof loadApp>>; bookingId: string }> {
  const booking = paidGuestBookingRow({ pilot_email: VICTIM_EMAIL, pilot_phone: '+972549990000' });
  const supabase = createFakeSupabase({ bookings: [booking], profiles: [] });
  vi.doMock('@/lib/db/supabase-admin', () => ({
    getSupabaseAdmin: () => supabase,
    requireSupabaseAdmin: () => supabase,
  }));
  const app = await loadApp({
    env: { NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: PRODUCTION_ORIGIN },
    members: { [TOKENS.victim]: VICTIM, [TOKENS.lookalike]: LOOKALIKE },
  });
  return { supabase, app, bookingId: String(booking.id) };
}

async function myBookings(app: Awaited<ReturnType<typeof loadApp>>, token: string) {
  const { GET } = await app.routes.myBookings();
  return readJson<Array<{ id: string; pilotEmail: string; pilotPhone: string }>>(
    await GET(apiRequest('/api/my-bookings', { headers: bearer(token) }))
  );
}

afterEach(() => {
  vi.doUnmock('@/lib/db/supabase-admin');
});

describe('Postgres ILIKE stand-in (self-check)', () => {
  it.each([
    ['john_smith@x.test', 'john.smith@x.test', true],
    ['john\\_smith@x.test', 'john.smith@x.test', false],
    ['john\\_smith@x.test', 'john_smith@x.test', true],
    ['%@x.test', 'anyone@x.test', true],
    ['JOHN@X.TEST', 'john@x.test', true],
    ['john@x.test', 'john@x.testing', false],
  ])('treats pattern %s against %s as match=%s', (pattern, value, matches) => {
    expect(ilikePattern(pattern).test(value)).toBe(matches);
  });
});

describe('production member linking', () => {
  it('lets a member claim their own paid guest booking regardless of email case (control)', async () => {
    const { app, supabase, bookingId } = await productionApp();

    const response = await myBookings(app, TOKENS.victim);

    expect(response.status).toBe(200);
    expect(response.body.map((booking) => booking.id)).toEqual([bookingId]);
    expect(supabase.tables.bookings[0].user_id).toBe(VICTIM.id);
  });

  it(
    "never attaches or lists another customer's paid booking for a member whose email only matches it as an ILIKE wildcard (SEC-12)",
    async () => {
      const { app, supabase } = await productionApp();

      const response = await myBookings(app, TOKENS.lookalike);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(supabase.tables.bookings[0].user_id).toBeNull();
    }
  );
});
