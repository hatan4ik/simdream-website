import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { collectKeys, createVoucherFundedBooking, EMPTY_DAY, getSlots } from './api-helpers';
import {
  DURATION_KEYS,
  errorBody,
  expectContract,
  packageList,
  simulatorPackage,
  slotList,
  slotsWithEfficiency,
} from './contracts';

const RESERVED_MINUTES: Record<number, number> = { 20: 45, 30: 45, 45: 60, 60: 75, 90: 105, 120: 150 };
const SLOTS_PARAMETER_ERROR = 'Use a valid YYYY-MM-DD date and supported duration.';

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Operating windows from AGENTS.md section 4, derived independently of the scheduler. */
function operatingWindow(date: string): { open: number; close: number; weekday: number } {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 5) return { open: 9 * 60, close: 16 * 60, weekday };
  if (weekday === 6) return { open: 19 * 60, close: 24 * 60, weekday };
  return { open: 10 * 60, close: 23 * 60, weekday };
}

async function slotsResponse(app: TestApp, query: string) {
  const { GET } = await app.routes.slots();
  return readJson(await GET(apiRequest(`/api/slots${query}`)));
}

async function packagesResponse(app: TestApp, query = '') {
  const { GET } = await app.routes.packages();
  return readJson(await GET(apiRequest(`/api/packages${query}`)));
}

describe('GET /api/slots', () => {
  it('returns contract-valid slots whose times follow the requested duration and reserved buffer', async () => {
    const app = await loadApp();

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=60`);

    expect(response.status).toBe(200);
    const slots = expectContract(slotList, response.body);
    expect(slots.some((slot) => slot.available)).toBe(true);
    for (const slot of slots) {
      expect(slot).toMatchObject({ date: EMPTY_DAY.sunday, durationMinutes: 60, totalReservedMinutes: 75 });
      expect(toMinutes(slot.endTime) - toMinutes(slot.startTime)).toBe(60);
      expect(toMinutes(slot.reservedEndTime) - toMinutes(slot.startTime)).toBe(75);
    }
  });

  it('defaults to 60-minute slots when no duration is given', async () => {
    const app = await loadApp();

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}`);

    expect(response.status).toBe(200);
    const durations = new Set(expectContract(slotList, response.body).map((slot) => slot.durationMinutes));
    expect([...durations]).toEqual([60]);
  });

  it.each([
    { name: 'a missing date', query: '?duration=60' },
    { name: 'an unpadded date', query: '?date=2026-12-1&duration=60' },
    { name: 'a date with a time part', query: '?date=2026-12-13T10:00&duration=60' },
    { name: 'an unsupported duration', query: `?date=${EMPTY_DAY.sunday}&duration=25` },
    { name: 'the workshop duration', query: `?date=${EMPTY_DAY.sunday}&duration=240` },
    { name: 'a non-numeric duration', query: `?date=${EMPTY_DAY.sunday}&duration=abc` },
    { name: 'a zero duration', query: `?date=${EMPTY_DAY.sunday}&duration=0` },
  ])('rejects $name with 400', async ({ query }) => {
    const app = await loadApp();

    const response = await slotsResponse(app, query);

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe(SLOTS_PARAMETER_ERROR);
  });

  it('adds the public capacity report and duration availability when includeEfficiency=true', async () => {
    const app = await loadApp();

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=60&includeEfficiency=true`);

    expect(response.status).toBe(200);
    const body = expectContract(slotsWithEfficiency, response.body);
    expect(body.efficiency).toMatchObject({
      date: EMPTY_DAY.sunday,
      dayOfWeek: 0,
      operatingWindow: '10:00 – 23:00',
      totalFundMinutes: 780,
      bookedMinutes: 0,
      freeValidMinutes: 780,
      isZeroWasteCompliant: true,
    });
    expect(body.slots).toEqual(await getSlots(app, EMPTY_DAY.sunday, 60));
  });

  it('reflects a new booking in the public capacity report', async () => {
    const app = await loadApp();
    await createVoucherFundedBooking(app, { date: EMPTY_DAY.sunday });

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=20&includeEfficiency=true`);

    expect(response.status).toBe(200);
    const { efficiency } = expectContract(slotsWithEfficiency, response.body);
    expect(efficiency).toMatchObject({ bookedMinutes: 45, pureFlightMinutes: 20, turnaroundMinutes: 25 });
    expect(efficiency.timelineBlocks.filter((block) => block.type === 'booked')).toHaveLength(1);
  });

  it('reports duration availability that agrees with the slot list of every duration', async () => {
    const app = await loadApp();
    await createVoucherFundedBooking(app, { date: EMPTY_DAY.sunday });

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=60&includeEfficiency=true`);

    const { durationAvailability } = expectContract(slotsWithEfficiency, response.body);
    for (const key of DURATION_KEYS) {
      const open = (await getSlots(app, EMPTY_DAY.sunday, Number(key))).filter((slot) => slot.available);
      expect(durationAvailability[key], `duration ${key}`).toEqual({
        availableCount: open.length,
        minPriceIls: open.length ? Math.min(...open.map((slot) => slot.dynamicPriceIls)) : 0,
      });
    }
  });

  it('keeps customer names and contact details out of the public efficiency report (API-1)', async () => {
    const app = await loadApp();
    const customer = { pilotName: 'Zelda Contractprobe', pilotEmail: 'zelda.probe@pilots.test', pilotPhone: '+972500000777' };
    await createVoucherFundedBooking(app, { date: EMPTY_DAY.sunday, ...customer });

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=60&includeEfficiency=true`);

    expect(response.status).toBe(200);
    const body = expectContract(slotsWithEfficiency, response.body);
    expect(body.efficiency.bookedMinutes).toBeGreaterThan(0);
    const keys = collectKeys(body);
    for (const privateKey of ['pilotEmail', 'pilotPhone', 'stripePaymentIntentId', 'userId', 'voucherCode']) {
      expect(keys.has(privateKey), privateKey).toBe(false);
    }
    const text = JSON.stringify(body);
    for (const value of Object.values(customer)) expect(text).not.toContain(value);
  });

  it('marks every Saturday 45-minute promo departure unavailable as daytime-only', async () => {
    const app = await loadApp();

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.saturday}&duration=45&includeEfficiency=true`);

    const { slots, durationAvailability } = expectContract(slotsWithEfficiency, response.body);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot).toMatchObject({ available: false, disabledReason: 'daytime_only_promo', isPrimeTime: true });
    }
    expect(durationAvailability['45']).toEqual({ availableCount: 0, minPriceIls: 0 });
  });

  it('closes the Friday 15:15 departure to flights longer than 30 minutes', async () => {
    const app = await loadApp();

    const closer = (await getSlots(app, EMPTY_DAY.friday, 60)).find((slot) => slot.startTime === '15:15');

    expect(closer).toMatchObject({ available: false, disabledReason: 'friday_closer_30m_only', blockPeriod: 'friday_closer' });
  });

  it('offers the Friday 15:15 departure as the zero-waste closer for a 20-minute flight', async () => {
    const app = await loadApp();

    const closer = (await getSlots(app, EMPTY_DAY.friday, 20)).find((slot) => slot.startTime === '15:15');

    expect(closer).toMatchObject({
      available: true,
      smartRecommendation: 'friday_30m_closer',
      blockPeriod: 'friday_closer',
      reservedEndTime: '16:00',
    });
  });

  it('only offers open departures inside the operating window of their weekday (property)', async () => {
    const app = await loadApp();
    const firstEmptyDay = Date.UTC(2026, 11, 8);
    const date = fc
      .integer({ min: 0, max: 380 })
      .map((offset) => new Date(firstEmptyDay + offset * 86_400_000).toISOString().slice(0, 10));
    const duration = fc.constantFrom(20, 30, 45, 60, 90, 120);

    await fc.assert(
      fc.asyncProperty(date, duration, async (day, minutes) => {
        const slots = await getSlots(app, day, minutes);
        const { open, close, weekday } = operatingWindow(day);
        const offered = slots.filter((slot) => slot.available);
        const promoForbidden = minutes === 45 && weekday === 6;

        expect(offered.length > 0).toBe(!promoForbidden);
        for (const slot of offered) {
          expect(slot.date).toBe(day);
          expect(slot.totalReservedMinutes).toBe(RESERVED_MINUTES[minutes]);
          expect(toMinutes(slot.startTime)).toBeGreaterThanOrEqual(open);
          expect(toMinutes(slot.startTime) + slot.totalReservedMinutes).toBeLessThanOrEqual(close);
          if (minutes === 45) expect(toMinutes(slot.startTime)).toBeLessThan(18 * 60);
        }
      }),
      { numRuns: 120 }
    );
  });

  it('rejects a calendar-invalid date with 400 (API-7)', async () => {
    const app = await loadApp();

    const response = await slotsResponse(app, '?date=2026-02-30&duration=60');

    expect(response.status).toBe(400);
    expectContract(errorBody, response.body);
  });

  it('lists departures that already left today (Israel time) as unavailable (API-3)', async () => {
    const app = await loadApp({ now: '2026-12-13T16:00:00+02:00' });

    const slots = await getSlots(app, '2026-12-13', 20);

    const elapsed = slots.filter((slot) => slot.startTime < '16:00');
    expect(elapsed.length).toBeGreaterThan(0);
    expect(elapsed.filter((slot) => slot.available).map((slot) => slot.startTime)).toEqual([]);
  });

  it('answers an internal failure with a generic error and no stack trace (API-9)', async () => {
    const app = await loadApp();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(app.store, 'getAvailableSlots').mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.0.12:5432 (postgres://simdream@db.internal)')
    );

    const response = await slotsResponse(app, `?date=${EMPTY_DAY.sunday}&duration=60`);

    // Any 5xx is acceptable (the remediation suggests 503); only the body shape is pinned.
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).toBeLessThan(600);
    expectContract(errorBody, response.body);
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|db\.internal|\.ts:\d+/);
  });
});

describe('GET /api/packages', () => {
  it('lists the whole catalogue under the package contract with unique ids and slugs', async () => {
    const app = await loadApp();

    const response = await packagesResponse(app);

    expect(response.status).toBe(200);
    const packages = expectContract(packageList, response.body);
    expect(packages.map((pkg) => pkg.id)).toEqual(app.seed.SIMULATOR_PACKAGES.map((pkg) => pkg.id));
    expect(new Set(packages.map((pkg) => pkg.slug)).size).toBe(packages.length);
  });

  it.each(['recreational', 'training', 'fear_of_flying', 'corporate'] as const)(
    'filters the catalogue by category=%s',
    async (category) => {
      const app = await loadApp();

      const response = await packagesResponse(app, `?category=${category}`);

      expect(response.status).toBe(200);
      const packages = expectContract(packageList, response.body);
      const expected = app.seed.SIMULATOR_PACKAGES.filter((pkg) => pkg.category === category).map((pkg) => pkg.id);
      expect(expected.length).toBeGreaterThan(0);
      expect(packages.map((pkg) => pkg.id)).toEqual(expected);
    }
  );

  it('lists exactly the three PRO tiers under the training category', async () => {
    const app = await loadApp();

    const response = await packagesResponse(app, '?category=training');

    expect(response.status).toBe(200);
    const packages = expectContract(packageList, response.body);

    expect(packages.map((pkg) => [pkg.durationMinutes, pkg.priceIls])).toEqual([
      [60, 890],
      [90, 1250],
      [120, 1590],
    ]);
  });

  it('returns an empty list for an unknown category', async () => {
    const app = await loadApp();

    const response = await packagesResponse(app, '?category=spaceflight');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns a single package by slug', async () => {
    const app = await loadApp();

    const response = await packagesResponse(app, '?slug=captains-command-60');

    expect(response.status).toBe(200);
    expect(expectContract(simulatorPackage, response.body)).toMatchObject({ id: 'pkg-captain-60', durationMinutes: 60 });
  });

  it('returns 404 for an unknown slug', async () => {
    const app = await loadApp();

    const response = await packagesResponse(app, '?slug=concorde-supersonic');

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Package not found');
  });
});
