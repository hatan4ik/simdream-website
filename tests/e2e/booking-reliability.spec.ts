import type { Route } from '@playwright/test';
import { nextWeekdayAfter, weekdayOf } from './pages/format';
import { expect, test } from './fixtures';

const SATURDAY = 6;

test.describe('booking reliability', () => {
  test('keeps the slots of the latest selected day when an earlier request answers last (E2E-14)', async ({
    page,
    booking,
    schedule,
  }) => {
    // Select two dates around a response race. The full 09:00–24:00 operating window
    // now applies every day, so the stale response is made deliberately distinct below.
    const weekday = await schedule.findOpenSlot({ duration: 60, weekdays: [0, 1, 2, 3, 4] });
    // Derive the comparison date from the weekday returned by the same server
    // that provides the slots. Node and a browser may straddle an Israel
    // midnight, so deriving it from a separate local clock can point the page
    // at last week's Saturday.
    const saturday = nextWeekdayAfter(weekday.date, SATURDAY);
    expect(weekdayOf(saturday)).toBe(SATURDAY);
    const saturdaySlots = (await schedule.day(saturday, 60)).slots;
    const openOnSaturday = saturdaySlots.filter((slot) => slot.available).length;
    const saturdayFirstOpen = saturdaySlots.find((slot) => slot.available);
    expect(saturdayFirstOpen, 'Saturday needs a bookable departure').toBeDefined();

    await booking.goto();
    const wizard = await booking.openWizard();

    // Hold the weekday answer until the Saturday answer has rendered.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const isWeekdaySlots = (url: URL) => url.pathname === '/api/slots' && url.searchParams.get('date') === weekday.date;
    await page.route(isWeekdaySlots, async (route: Route) => {
      await held;
      // Return a deliberately empty stale result. If the page wrongly applies it
      // after the Saturday selection, the visible count and slot list will change.
      await route.fulfill({ contentType: 'application/json', body: '[]' }).catch(() => undefined);
    });

    const staleRequest = page.waitForRequest((request) => isWeekdaySlots(new URL(request.url())));
    await booking.revealDate(weekday.date);
    await booking.dateButton(weekday.date).click();
    await booking.selectDate(saturday);
    await expect(wizard.departureHeading(saturday)).toBeVisible();
    await expect(page.getByText(`${openOnSaturday} slots available`, { exact: true })).toBeVisible();

    release();
    // Settles either way: the page aborts the superseded request (response() is null) or
    // receives the late answer and must discard it.
    await (await staleRequest).response();
    // Let the page consume the late answer and render before judging the list.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    await expect(wizard.departureHeading(saturday)).toBeVisible();
    await expect(page.getByText(`${openOnSaturday} slots available`, { exact: true })).toBeVisible();
    await expect(wizard.slot(saturdayFirstOpen!.startTime)).toBeVisible();
  });
});
