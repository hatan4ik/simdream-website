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

/** A visible calendar date at least two days out, so it is never the initially selected (tomorrow) date. */
const laterStripDay = (predicate: (weekday: number) => boolean = () => true) => {
  const day = israelStripDays()
    .slice(2)
    .find((candidate) => predicate(candidate.weekday));
  if (!day) throw new Error('No matching date in the current calendar range');
  return day;
};

async function visibleWeekDates(page: Parameters<typeof openBookingPage>[0]): Promise<string[]> {
  return page.locator('[data-calendar-date]:visible').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('data-calendar-date') ?? '').filter(Boolean)
  );
}

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
    const holdSaturday = gate();
    const urlByDate = new Map<string, string>();
    let heldSaturdayDate: string | null = null;
    await openBookingPage(page, baseURL, async (route) => {
      const date = requestedDate(route.request());
      urlByDate.set(date, route.request().url());
      if (date === heldSaturdayDate) await holdSaturday.promise;
      // The page may already have aborted the superseded Saturday request.
      await fulfillOpenSlots(route).catch(() => undefined);
    });
    await expectDepartureSelected(page);

    const weekDates = await visibleWeekDates(page);
    const saturdayDate = weekDates.find((date) => new Date(`${date}T12:00:00Z`).getUTCDay() === 6);
    const weekdayDate = weekDates.find((date) => new Date(`${date}T12:00:00Z`).getUTCDay() <= 4);
    if (!saturdayDate || !weekdayDate) throw new Error(`Expected a Saturday and weekday in ${weekDates.join(', ')}`);
    const saturday = { date: saturdayDate, name: new RegExp(`^Sat\\s*${Number(saturdayDate.slice(-2))}\\s*`) };
    heldSaturdayDate = saturday.date;
    const weekdayDateObject = new Date(`${weekdayDate}T12:00:00Z`);
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const weekday = {
      date: weekdayDate,
      name: new RegExp(`^${weekdayNames[weekdayDateObject.getUTCDay()]}\\s*${Number(weekdayDate.slice(-2))}\\s*`),
    };

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

test.describe('/book default week calendar', () => {
  test('defaults to a week strip with its seven upcoming dates selectable (control)', async ({ page, baseURL }) => {
    const midNovember = new Date('2026-11-10T12:00:00+02:00');
    await page.clock.setFixedTime(midNovember);
    await openBookingPage(page, baseURL);
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(visibleWeekDates.bind(null, page)).toContain('2026-11-10');

    const visibleDates = await visibleWeekDates(page);
    expect(visibleDates).toHaveLength(7);
    expect([...new Set(visibleDates)]).toHaveLength(7);
    expect(visibleDates).toContain('2026-11-10');
  });

  test('keeps upcoming dates unique across the October DST change (REL-14)', async ({ page, baseURL }) => {
    test.slow();
    const beforeFallBack = new Date('2026-10-20T12:00:00+03:00');
    await page.clock.setFixedTime(beforeFallBack);
    await openBookingPage(page, baseURL);
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(visibleWeekDates.bind(null, page)).toContain('2026-10-20');

    const visibleDates = await visibleWeekDates(page);
    expect(visibleDates).toHaveLength(7);
    expect([...new Set(visibleDates)]).toHaveLength(7);
    expect(visibleDates).toContain('2026-10-20');
  });
});

test.describe('/book week calendar navigation', () => {
  const selectedCalendarDate = async (page: Parameters<typeof openBookingPage>[0]): Promise<string> => {
    const date = await page.locator('[data-calendar-date][aria-pressed="true"]').first().getAttribute('data-calendar-date');
    if (!date) throw new Error('Expected a selected calendar date');
    return date;
  };

  const exerciseWeekPaging = async (page: Parameters<typeof openBookingPage>[0]) => {
    // The server render intentionally starts at a stable 2099 date. Wait for the browser to
    // adopt Israel's live operating day before deriving the next-week request target.
    await expect.poll(selectedCalendarDate.bind(null, page)).not.toMatch(/^2099-/);
    const selectedDate = await selectedCalendarDate(page);
    const nextDate = addDays(selectedDate, 7);
    const nextDepartureRequest = page.waitForResponse(
      (response) => isSlotsApi(new URL(response.url())) && requestedDate(response.request()) === nextDate
    );

    await page.locator('[data-calendar-next-week]').click();
    await nextDepartureRequest;
    await expect(page.locator(`[data-calendar-date="${nextDate}"][aria-pressed="true"]`)).toBeVisible();
    await expect(page.locator('[data-calendar-previous-week]')).toBeEnabled();

    const previousDepartureRequest = page.waitForResponse(
      (response) => isSlotsApi(new URL(response.url())) && requestedDate(response.request()) === selectedDate
    );
    await page.locator('[data-calendar-previous-week]').click();
    await previousDepartureRequest;
    await expect(page.locator(`[data-calendar-date="${selectedDate}"][aria-pressed="true"]`)).toBeVisible();
  };

  test('moves the storefront week forward and back', async ({ page, baseURL }) => {
    await openBookingPage(page, baseURL, fulfillOpenSlots);
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await exerciseWeekPaging(page);
  });

  test('moves the guided calendar week forward and back', async ({ page, baseURL }) => {
    await openBookingPage(page, baseURL, fulfillOpenSlots);
    await page.getByRole('button', { name: 'Guided Wizard (3-Step)', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await exerciseWeekPaging(page);
  });
});
