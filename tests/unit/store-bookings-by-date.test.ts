import { afterEach, describe, expect, it, vi } from 'vitest';

// Availability is a per-day question. Reading the whole bookings table for it grows with every order and,
// past the PostgREST row cap (1,000 by default on Supabase), silently drops the oldest rows, so a day could
// show a departure as open that the database then refuses. A day's read must ask the database for that day.

type Call = { table: string; op: string; args: unknown[] };

function fakeSupabase(rows: unknown[] = []) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const chain = {
        select: (...args: unknown[]) => (calls.push({ table, op: 'select', args }), chain),
        order: (...args: unknown[]) => (calls.push({ table, op: 'order', args }), chain),
        eq: (...args: unknown[]) => (calls.push({ table, op: 'eq', args }), chain),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: rows, error: null }),
      };
      return chain;
    },
  };
  return { client, calls };
}

async function loadStore(supabase: unknown | null) {
  vi.resetModules();
  delete (globalThis as { __simDreamStoreV10?: unknown }).__simDreamStoreV10;
  vi.stubEnv('NODE_ENV', supabase ? 'production' : 'test');
  vi.doMock('@/lib/db/supabase-admin', () => ({
    getSupabaseAdmin: () => supabase,
    requireSupabaseAdmin: () => supabase,
  }));
  return (await import('@/lib/db/store')).store;
}

const dateFilters = (calls: Call[]) => calls.filter((call) => call.table === 'bookings' && call.op === 'eq').map((call) => call.args);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/db/supabase-admin');
  vi.resetModules();
  delete (globalThis as { __simDreamStoreV10?: unknown }).__simDreamStoreV10;
});

describe('bookings reads against Supabase', () => {
  const DATE = '2027-01-10';

  it.each([
    ['getAvailableSlots', (store: Awaited<ReturnType<typeof loadStore>>) => store.getAvailableSlots(DATE, 60)],
    ['getDurationAvailability', (store: Awaited<ReturnType<typeof loadStore>>) => store.getDurationAvailability(DATE)],
    ['getDailyEfficiencyReport', (store: Awaited<ReturnType<typeof loadStore>>) => store.getDailyEfficiencyReport(DATE)],
  ])('%s asks the database for that day only', async (_name, read) => {
    const { client, calls } = fakeSupabase();
    const store = await loadStore(client);

    await read(store);

    expect(dateFilters(calls)).toEqual([['booking_date', DATE]]);
  });

  it('getBookings(date) filters on booking_date, and getBookings() still reads every booking for the admin list', async () => {
    const { client, calls } = fakeSupabase();
    const store = await loadStore(client);

    await store.getBookings(DATE);
    expect(dateFilters(calls)).toEqual([['booking_date', DATE]]);

    calls.length = 0;
    await store.getBookings();
    expect(dateFilters(calls)).toEqual([]);
    expect(calls.some((call) => call.op === 'select')).toBe(true);
  });
});

describe('bookings reads in the in-memory store', () => {
  it('getBookings(date) returns only that day, the same rows the scheduler would have kept', async () => {
    const store = await loadStore(null);
    const all = await store.getBookings();
    const day = all[0]?.bookingDate;
    expect(day).toBeTruthy();

    const scoped = await store.getBookings(day);

    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped).toEqual(all.filter((booking) => booking.bookingDate === day));
    expect(await store.getBookings('1999-01-01')).toEqual([]);
  });
});

describe('POST /api/admin/schedule-optimization', () => {
  it('reads the bookings of the requested day, not the whole table', async () => {
    vi.resetModules();
    const getBookings = vi.fn().mockResolvedValue([]);
    vi.doMock('@/lib/db/store', () => ({ store: { getBookings } }));
    vi.doMock('@/lib/auth/admin-guard', () => ({ requireAdmin: async () => null }));
    const { POST } = await import('@/app/api/admin/schedule-optimization/route');

    const response = await POST(
      new Request('http://localhost/api/admin/schedule-optimization', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: '2027-01-10',
          requests: [{ id: 'a', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'] }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(getBookings).toHaveBeenCalledWith('2027-01-10');
    vi.doUnmock('@/lib/db/store');
    vi.doUnmock('@/lib/auth/admin-guard');
  });
});
