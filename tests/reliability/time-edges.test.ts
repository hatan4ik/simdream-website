import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlightSlot } from '@/types';
import { bookingCheckoutBody, loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { findOpenDeparture, postCheckout } from './helpers';

/**
 * The business runs on Israel time while the server may run anywhere: UTC
 * (typical hosting), behind Israel (Los Angeles) or far ahead of it (UTC+14).
 */
const SERVER_TIME_ZONES = ['UTC', 'America/Los_Angeles', 'Asia/Jerusalem', 'Pacific/Kiritimati'] as const;

const israelClock = (instant: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(instant)
  );

interface IsraelDateCase {
  label: string;
  now: string;
  yesterday: string;
  today: string;
}

const ISRAEL_DATE_CASES: IsraelDateCase[] = [
  { label: 'just after midnight while UTC is still on the previous day', now: '2026-11-02T00:30:00+02:00', yesterday: '2026-11-01', today: '2026-11-02' },
  { label: 'in the evening while UTC+14 is already on the next day', now: '2026-11-01T17:30:00+02:00', yesterday: '2026-10-31', today: '2026-11-01' },
  { label: 'just after midnight in summer time (UTC+3)', now: '2026-07-15T00:30:00+03:00', yesterday: '2026-07-14', today: '2026-07-15' },
  { label: 'in the first minutes of a new month', now: '2026-12-01T00:15:00+02:00', yesterday: '2026-11-30', today: '2026-12-01' },
  { label: 'in the first minutes of a new year', now: '2027-01-01T00:15:00+02:00', yesterday: '2026-12-31', today: '2027-01-01' },
  { label: 'on leap day', now: '2028-02-29T00:30:00+02:00', yesterday: '2028-02-28', today: '2028-02-29' },
  { label: 'before clocks spring forward on 2026-03-27', now: '2026-03-27T01:30:00+02:00', yesterday: '2026-03-26', today: '2026-03-27' },
  { label: 'after clocks spring forward on 2026-03-27', now: '2026-03-27T03:30:00+03:00', yesterday: '2026-03-26', today: '2026-03-27' },
  { label: 'in the first 01:30 before clocks fall back on 2026-10-25', now: '2026-10-25T01:30:00+03:00', yesterday: '2026-10-24', today: '2026-10-25' },
  { label: 'in the repeated 01:30 after clocks fall back on 2026-10-25', now: '2026-10-25T01:30:00+02:00', yesterday: '2026-10-24', today: '2026-10-25' },
];

const OPENING_HOURS_CASES = [
  { date: '2026-03-27', day: 'Friday, spring-forward day', firstDeparture: '09:00' },
  { date: '2026-10-25', day: 'Sunday, fall-back day', firstDeparture: '10:00' },
  { date: '2026-12-31', day: 'Thursday, year end', firstDeparture: '10:00' },
  { date: '2027-01-01', day: 'Friday, new year', firstDeparture: '09:00' },
  { date: '2027-01-02', day: 'Saturday', firstDeparture: '19:00' },
  { date: '2028-02-29', day: 'Tuesday, leap day', firstDeparture: '10:00' },
  { date: '2028-03-01', day: 'Wednesday after leap day', firstDeparture: '10:00' },
];

// Neither date is seeded relative to the default test clock, so both grids start empty.
const DST_WEEKS = [
  { transition: '2026-03-27', weekEarlier: '2026-03-20', change: 'spring-forward' },
  { transition: '2026-10-25', weekEarlier: '2026-10-18', change: 'fall-back' },
];

async function getSlots(app: TestApp, date: string, duration: number) {
  const { GET } = await app.routes.slots();
  return readJson<FlightSlot[]>(await GET(apiRequest(`/api/slots?date=${date}&duration=${duration}`)));
}

describe.each(SERVER_TIME_ZONES)('with the server clock in %s', (timeZone) => {
  // Seed data and Date arithmetic read the process zone at import, so set it before loadApp.
  beforeEach(() => {
    vi.stubEnv('TZ', timeZone);
  });

  it.each(ISRAEL_DATE_CASES)('rejects a booking for yesterday $label', async ({ now, yesterday }) => {
    const app = await loadApp({ now, stripe: 'mocked' });

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: yesterday, startTime: '10:00', pilotEmail: 'past@example.test' })
    );

    expect(response).toMatchObject({ status: 400, body: { error: 'Bookings must be for today or a future date.' } });
    expect(await app.store.getBookingsByEmail('past@example.test')).toHaveLength(0);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it.each(ISRAEL_DATE_CASES)('accepts a later departure today $label', async ({ now, today }) => {
    const app = await loadApp({ now, stripe: 'mocked' });
    const { slot, packageId } = await findOpenDeparture(app, today, { after: israelClock(now) });

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId, bookingDate: today, startTime: slot.startTime, pilotEmail: 'today@example.test' })
    );

    expect(response).toMatchObject({ status: 201, body: { kind: 'stripe' } });
    expect(await app.store.getBookingsByEmail('today@example.test')).toEqual([
      expect.objectContaining({ bookingDate: today, startTime: slot.startTime, status: 'pending' }),
    ]);
  });

  it.each(OPENING_HOURS_CASES)('opens $date ($day) at $firstDeparture', async ({ date, firstDeparture }) => {
    const app = await loadApp();

    const response = await getSlots(app, date, 60);

    expect(response.status).toBe(200);
    expect(response.body[0]?.startTime).toBe(firstDeparture);
    expect(response.body.every((slot) => slot.date === date)).toBe(true);
  });

  it.each(DST_WEEKS)('offers the same wall-clock departures on the $change day as one week earlier', async ({ transition, weekEarlier }) => {
    const app = await loadApp();
    const grid = (slots: FlightSlot[]) =>
      slots.map(({ startTime, endTime, reservedEndTime, available }) => ({ startTime, endTime, reservedEndTime, available }));

    for (const duration of [20, 45, 60, 90, 120]) {
      const [onTransition, onWeekEarlier] = await Promise.all([
        getSlots(app, transition, duration),
        getSlots(app, weekEarlier, duration),
      ]);
      expect(onTransition.body.length, `${duration}m departures`).toBeGreaterThan(0);
      expect(grid(onTransition.body), `${duration}m departures`).toEqual(grid(onWeekEarlier.body));
    }
  });

  it('gives a gift voucher bought on leap day between 365 and 366 days of validity', async () => {
    const now = '2028-02-29T12:00:00+02:00';
    const app = await loadApp({ now, stripe: 'mocked' });

    const response = await postCheckout(app, voucherCheckoutBody({ senderEmail: 'leap-day@example.test' }));

    expect(response.status).toBe(201);
    const voucher = (await app.store.getVouchers()).find((candidate) => candidate.senderEmail === 'leap-day@example.test');
    const validDays = (Date.parse(voucher?.expiryDate ?? '') - Date.parse(now)) / 86_400_000;
    expect(validDays).toBeGreaterThanOrEqual(365);
    expect(validDays).toBeLessThanOrEqual(366);
  });
});

describe('departures earlier today', () => {
  const EVENING = '2026-11-01T20:00:00+02:00';

  it('refuses checkout for a departure that already left today (Israel time) (REL-8)', async () => {
    // Discover the departure while it is still open, then move the clock past it:
    // departed slots are no longer listed, so they cannot be discovered in the evening.
    const app = await loadApp({ now: '2026-11-01T08:00:00+02:00', stripe: 'mocked' });
    const { slot, packageId } = await findOpenDeparture(app, '2026-11-01', { before: israelClock(EVENING) });
    vi.setSystemTime(new Date(EVENING));

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId, startTime: slot.startTime, pilotEmail: 'departed@example.test' })
    );

    expect([400, 409]).toContain(response.status);
    expect(app.checkoutSessions).toHaveLength(0);
  });

  it('stops offering departures once their start time has passed (REL-8)', async () => {
    const morning = await loadApp({ now: '2026-11-01T08:00:00+02:00' });
    const offeredInTheMorning = (await getSlots(morning, '2026-11-01', 20)).body.filter(
      (slot) => slot.available && slot.startTime < '20:00'
    );
    expect(offeredInTheMorning.length).toBeGreaterThan(0);

    const evening = await loadApp({ now: EVENING });
    const offeredInTheEvening = (await getSlots(evening, '2026-11-01', 20)).body.filter(
      (slot) => slot.available && slot.startTime < '20:00'
    );

    expect(offeredInTheEvening).toEqual([]);
  });
});

describe('impossible calendar dates', () => {
  // All are after the default test date, so only calendar validation can reject them.
  const IMPOSSIBLE_DATES = ['2027-02-29', '2027-02-30', '2027-04-31', '2027-13-01', '2027-00-10', '2027-11-00'];

  it.each(IMPOSSIBLE_DATES)('rejects checkout for %s as invalid input (REL-9)', async (date) => {
    const app = await loadApp({ stripe: 'mocked' });

    const response = await postCheckout(
      app,
      bookingCheckoutBody({ packageId: 'pkg-captain-60', bookingDate: date, startTime: '10:00', pilotEmail: 'calendar@example.test' })
    );

    expect(response.status).toBe(400);
    expect(response.body.fields).toHaveProperty('bookingDate');
    expect(await app.store.getBookingsByEmail('calendar@example.test')).toHaveLength(0);
  });

  it.each(IMPOSSIBLE_DATES)('rejects a departure query for %s (REL-9)', async (date) => {
    const app = await loadApp();

    const response = await getSlots(app, date, 60);

    expect(response.status).toBe(400);
  });
});
