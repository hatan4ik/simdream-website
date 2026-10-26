import type { Route } from '@playwright/test';
import { israelDate, nextWeekdayAfter, weekdayOf } from './pages/format';
import { expect, test } from './fixtures';

const SATURDAY = 6;

test.describe('booking reliability', () => {
  test('keeps the slots of the latest selected day when an earlier request answers last (E2E-14)', async ({
    page,
    booking,
    schedule,
  }) => {
    // A Sunday–Thursday day has morning slots; Saturday is evening-only, so the two lists differ.
    const weekday = await schedule.findOpenSlot({ duration: 60, weekdays: [0, 1, 2, 3, 4] });
    const saturday = nextWeekdayAfter(israelDate(1), SATURDAY);
    expect(weekdayOf(saturday)).toBe(SATURDAY);
    const saturdaySlots = (await schedule.day(saturday, 60)).slots;
    const saturdayTimes = new Set(saturdaySlots.map((slot) => slot.startTime));
    expect(saturdayTimes.has(weekday.slot.startTime), 'the weekday slot must not exist on Saturday').toBe(false);
    const openOnSaturday = saturdaySlots.filter((slot) => slot.available).length;

    await booking.goto();
    const wizard = await booking.openWizard();

    // Hold the weekday answer until the Saturday answer has rendered.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const isWeekdaySlots = (url: URL) => url.pathname === '/api/slots' && url.searchParams.get('date') === weekday.date;
    await page.route(isWeekdaySlots, async (route: Route) => {
      await held;
      // The page may already have aborted the superseded request.
      await route.continue().catch(() => undefined);
    });

    const staleRequest = page.waitForRequest((request) => isWeekdaySlots(new URL(request.url())));
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
    await expect(wizard.slot(weekday.slot.startTime)).toHaveCount(0);
  });
});
