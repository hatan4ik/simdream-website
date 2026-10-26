import type { Request, Route } from '@playwright/test';
import { expect, test } from '../support/e2e';
import {
  SOLD_OUT_HEADING,
  addDays,
  checkoutButton,
  expectDepartureSelected,
  fulfillOpenSlots,
  gate,
  isSlotsApi,
  israelStripDays,
  openBookingPage,
  openStartTimes,
  requestedDate,
  settleFrames,
  slotButton,
  slotsPayload,
} from './helpers';

// Known-defect tests call test.slow(): they wait out an assertion timeout and must fail, not time out.

// Screencast recording and its finalisation in context teardown made passing tests
// exceed the 45 s budget on a contended host; failure screenshots are kept.
test.use({ video: 'off' });

const failWith500 = (route: Route) => route.fulfill({ status: 500, json: { error: 'Failed to generate slots' } });

const FAILURE_MODES = [
  { name: 'HTTP 500', fail: failWith500 },
  { name: 'network failure', fail: (route: Route) => route.abort('failed') },
];

const fullyBooked = (route: Route) =>
  route.fulfill({
    json: slotsPayload(route.request().url(), (slots) =>
      slots.map((slot) => ({ ...slot, available: false, disabledReason: 'booked' as const }))
    ),
  });

/** A strip date at least two days out, so it is never the initially selected (tomorrow) date. */
const laterStripDay = (predicate: (weekday: number) => boolean = () => true) => {
  const day = israelStripDays()
    .slice(2)
    .find((candidate) => predicate(candidate.weekday));
  if (!day) throw new Error('No matching day in the 14-day strip');
  return day;
};

// The storefront renders its empty "sold-out" panel before the first slots response
// arrives, so every test below waits until the page has actually received its
// first (failed or fulfilled) response before asserting or changing behaviour.

test.describe('/book when the slots API fails', () => {
  for (const mode of FAILURE_MODES) {
    test(`keeps the page usable and offers another date (${mode.name})`, async ({ page, baseURL }) => {
      let failuresServed = 0;
      await openBookingPage(page, baseURL, async (route) => {
        await mode.fail(route);
        failuresServed += 1;
      });
      await expect.poll(() => failuresServed).toBeGreaterThan(0);
      await settleFrames(page);

      await expect(page.getByRole('button', { name: 'Check Next Day →' })).toBeEnabled();
      await expect(page.getByRole('button', { name: laterStripDay().name })).toBeEnabled();
      await expect(checkoutButton(page)).toBeEnabled();
    });

    test(`says departures could not be loaded instead of reporting a sold-out day (${mode.name}) (REL-10)`, async ({
      page,
      baseURL,
    }) => {
      test.slow();
      await openBookingPage(page, baseURL, mode.fail);

      await expect(page.getByText(/could(n['’]t| not) load|unable to load|temporarily unavailable/i)).toBeVisible();
      await expect(page.getByRole('heading', { name: SOLD_OUT_HEADING })).toBeHidden();
    });
  }

  test('recovers when the customer picks another date once the API is healthy again', async ({ page, baseURL }) => {
    let healthy = false;
    let failuresServed = 0;
    await openBookingPage(page, baseURL, async (route) => {
      if (healthy) return fulfillOpenSlots(route);
      await failWith500(route);
      failuresServed += 1;
    });
    await expect.poll(() => failuresServed).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Check Next Day →' })).toBeVisible();
    healthy = true;
    const target = laterStripDay();
    const recovered = page.waitForResponse((response) => isSlotsApi(new URL(response.url())) && requestedDate(response.request()) === target.date);

    await page.getByRole('button', { name: target.name }).click();

    const [firstOpen] = openStartTimes((await recovered).url());
    await expect(slotButton(page, firstOpen)).toBeEnabled();
    await expectDepartureSelected(page);
  });

  test('offers a retry that reloads departures for the same date (REL-10)', async ({ page, baseURL }) => {
    test.slow();
    let healthy = false;
    const requested: string[] = [];
    await openBookingPage(page, baseURL, (route) => {
      requested.push(requestedDate(route.request()));
      return healthy ? fulfillOpenSlots(route) : failWith500(route);
    });
    await expect.poll(() => requested.length).toBe(1);
    healthy = true;

    const retry = page.getByRole('button', { name: /retry|try again/i });
    await expect(retry).toBeVisible();
    await retry.click();

    await expect.poll(() => requested).toEqual([requested[0], requested[0]]);
    await expectDepartureSelected(page);
  });
});

test.describe('/book "Check Next Day" on a sold-out day', () => {
  test('moves the calendar to the following day', async ({ page, baseURL }) => {
    const requested: string[] = [];
    await openBookingPage(page, baseURL, (route) => {
      requested.push(requestedDate(route.request()));
      return fullyBooked(route);
    });
    // The first request is sent from a post-hydration effect, so the button is now interactive.
    await expect.poll(() => requested.length).toBe(1);

    await page.getByRole('button', { name: 'Check Next Day →' }).click();

    await expect.poll(() => requested).toEqual([requested[0], addDays(requested[0], 1)]);
  });

  test.describe('for a visitor whose device is west of UTC', () => {
    test.use({ timezoneId: 'America/New_York' });

    test('moves the calendar to the following day (REL-15)', async ({ page, baseURL }) => {
      test.slow();
      const requested: string[] = [];
      await openBookingPage(page, baseURL, (route) => {
        requested.push(requestedDate(route.request()));
        return fullyBooked(route);
      });
      await expect.poll(() => requested.length).toBe(1);

      await page.getByRole('button', { name: 'Check Next Day →' }).click();

      await expect.poll(() => requested).toEqual([requested[0], addDays(requested[0], 1)]);
    });
  });
});

test.describe('/book when the slots API is slow', () => {
  test('shows loading placeholders, not a sold-out message, until departures arrive', async ({ page, baseURL }) => {
    const release = gate();
    await openBookingPage(page, baseURL, async (route) => {
      await release.promise;
      await fulfillOpenSlots(route);
    });
    const departures = page.locator('section').filter({ has: page.getByRole('heading', { name: /Select Departure Date/ }) });

    await expect(departures.locator('.animate-pulse').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: SOLD_OUT_HEADING })).toBeHidden();
    release.open();

    await expectDepartureSelected(page);
    await expect(departures.locator('.animate-pulse')).toHaveCount(0);
  });

  test('exposes the loading state to assistive technology (REL-12)', async ({ page, baseURL }) => {
    test.slow();
    const release = gate();
    await openBookingPage(page, baseURL, async (route) => {
      await release.promise;
      await fulfillOpenSlots(route);
    });

    // Either signal satisfies assistive technology; the page may expose both at once.
    await expect(page.getByRole('status').filter({ hasText: /loading/i }).or(page.locator('[aria-busy="true"]')).first()).toBeVisible();
  });

  test('ignores a late response for a previously selected date (REL-11)', async ({ page, baseURL }) => {
    test.slow();
    const saturday = laterStripDay((weekday) => weekday === 6);
    const weekday = laterStripDay((candidate) => candidate <= 4);
    const holdSaturday = gate();
    const urlByDate = new Map<string, string>();
    await openBookingPage(page, baseURL, async (route) => {
      const date = requestedDate(route.request());
      urlByDate.set(date, route.request().url());
      if (date === saturday.date) await holdSaturday.promise;
      // The page may already have aborted the superseded Saturday request.
      await fulfillOpenSlots(route).catch(() => undefined);
    });
    await expectDepartureSelected(page);

    // The superseded Saturday request settles either way: aborted by the page the moment the
    // weekday is chosen (requestfailed), or answered late and discarded (requestfinished).
    // Listen before clicking, so an immediate abort is not missed.
    const isSaturdaySlots = (request: Request) => isSlotsApi(new URL(request.url())) && requestedDate(request) === saturday.date;
    const late = Promise.race([
      page.waitForEvent('requestfinished', isSaturdaySlots),
      page.waitForEvent('requestfailed', isSaturdaySlots),
    ]);
    await page.getByRole('button', { name: saturday.name }).click();
    await page.getByRole('button', { name: weekday.name }).click();
    const weekdayTimes = openStartTimes(urlByDate.get(weekday.date) ?? '');
    await expect(slotButton(page, weekdayTimes[0])).toBeVisible();
    const saturdayOnly = openStartTimes(urlByDate.get(saturday.date) ?? '').filter((time) => !weekdayTimes.includes(time));
    expect(saturdayOnly.length).toBeGreaterThan(0);
    holdSaturday.open();
    await late;
    await settleFrames(page);

    await expect(slotButton(page, saturdayOnly[0])).toHaveCount(0);
    await expect(slotButton(page, weekdayTimes[0])).toBeVisible();
  });
});

test.describe('/book date strip', () => {
  test('lists 14 distinct consecutive days starting today (control)', async ({ page, baseURL }) => {
    const midNovember = new Date('2026-11-10T12:00:00+02:00');
    await page.clock.setFixedTime(midNovember);
    await openBookingPage(page, baseURL);

    for (const day of israelStripDays(midNovember)) {
      await expect(page.getByRole('button', { name: day.name })).toHaveCount(1);
    }
  });

  test('lists 14 distinct consecutive days across the October DST change (REL-14)', async ({ page, baseURL }) => {
    test.slow();
    const beforeFallBack = new Date('2026-10-20T12:00:00+03:00');
    await page.clock.setFixedTime(beforeFallBack);
    await openBookingPage(page, baseURL);

    for (const day of israelStripDays(beforeFallBack)) {
      await expect(page.getByRole('button', { name: day.name })).toHaveCount(1);
    }
  });
});
