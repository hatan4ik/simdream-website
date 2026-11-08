import type { Page } from '@playwright/test';
import { maxBookableDate } from '../../lib/scheduler/booking-horizon';
import { expect, test } from './fixtures';
import { addDays, israelDate } from './pages/format';

// Flights can be booked up to one year ahead, and "Today" always brings the visitor back.
// Both booking interfaces share the pagers, so the same journey runs against each.

const day = (page: Page, isoDate: string) => page.locator(`[data-calendar-date="${isoDate}"]`);
const selectedDay = (page: Page, isoDate: string) =>
  page.locator(`[data-calendar-date="${isoDate}"][aria-pressed="true"]`);

for (const view of ['storefront', 'wizard'] as const) {
  test.describe(`one-year booking horizon (${view})`, () => {
    test.beforeEach(async ({ page, booking }) => {
      const width = page.viewportSize()?.width ?? 0;
      test.skip(view === 'storefront' && width < 640, 'Express Shop is a desktop view');
      await booking.goto();
      if (view === 'wizard' && width >= 640) await booking.openWizard();
    });

    test('the month calendar stops one year ahead and Today jumps back', async ({ page }) => {
      const today = israelDate();
      const last = maxBookableDate(today);
      const next = page.locator('[data-calendar-next-month]');
      const previous = page.locator('[data-calendar-previous-month]');
      await page.getByRole('button', { name: 'Month', exact: true }).click();

      // The default selection is tomorrow, so Today is on offer straight away.
      await page.locator('[data-calendar-today]').click();
      await expect(selectedDay(page, today)).toBeVisible();
      await expect(page.locator('[data-calendar-today]')).toHaveCount(0);
      await expect(previous).toBeDisabled();

      let months = 0;
      while ((await next.isEnabled()) && months < 14) {
        await next.click();
        months += 1;
      }
      expect(months, 'the calendar pages exactly twelve months ahead').toBe(12);
      await expect(page.locator('[data-calendar-horizon-note]')).toBeVisible();
      await expect(day(page, last)).toBeEnabled();
      await expect(day(page, addDays(last, 1))).toBeDisabled();

      await day(page, last).click();
      await expect(selectedDay(page, last)).toBeVisible();

      // Far from today, one tap returns to today's date and its month.
      await page.locator('[data-calendar-today]').click();
      await expect(selectedDay(page, today)).toBeVisible();
      await expect(previous).toBeDisabled();
      await expect(next).toBeEnabled();
    });

    test('the week calendar stops at the horizon and Today jumps back', async ({ page }) => {
      const today = israelDate();
      const last = maxBookableDate(today);
      await page.getByRole('button', { name: 'Month', exact: true }).click();
      const next = page.locator('[data-calendar-next-month]');
      while (await next.isEnabled()) await next.click();
      await day(page, last).click();
      await expect(selectedDay(page, last)).toBeVisible();

      await page.getByRole('button', { name: 'Week', exact: true }).click();
      await expect(page.locator('[data-calendar-next-week]')).toBeDisabled();
      await expect(page.locator('[data-calendar-horizon-note]')).toBeVisible();
      const afterLast = day(page, addDays(last, 1));
      if (await afterLast.count()) await expect(afterLast).toBeDisabled();

      await page.locator('[data-calendar-today]').click();
      await expect(selectedDay(page, today)).toBeVisible();
      await expect(page.locator('[data-calendar-today]')).toHaveCount(0);
      await expect(page.locator('[data-calendar-next-week]')).toBeEnabled();
    });
  });
}
