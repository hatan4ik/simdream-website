import type { Page } from '@playwright/test';
import { translations } from '../../lib/i18n/translations';
import { expect, test } from './fixtures';
import { israelDate } from './pages/format';

// `/book` used to serve a placeholder and build the whole booking frame in the browser, so nothing
// useful painted until every script had loaded. The server now renders the first step from Israel's
// date; live departures are still fetched by the browser and never rendered or cached by the server.

const STEP_HEADING = translations.he.booking.step2Title;
const PLACEHOLDER = translations.he.booking.initializing;
const EMPTY_DAY = 'אין שעות פנויות למשך טיסה זה בתאריך שנבחר.';

const selectedDay = (page: Page, isoDate: string) =>
  page.locator(`[data-calendar-date="${isoDate}"][aria-pressed="true"]`).filter({ visible: true });

/** React reports a server/browser mismatch as a console error or as an uncaught "Minified React error". */
function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  const record = (text: string) => {
    if (/hydrat|Minified React error|did not match/i.test(text)) errors.push(text);
  };
  page.on('console', (message) => {
    if (message.type() === 'error') record(message.text());
  });
  page.on('pageerror', (error) => record(error.message));
  return errors;
}

async function slotsSettled(page: Page): Promise<void> {
  await expect(page.locator('[data-slots-state]').filter({ visible: true }).first()).toHaveAttribute(
    'data-slots-state',
    'ready',
    { timeout: 30_000 }
  );
}

test('the served page carries the booking frame, dated per request and never cached', async ({ request }) => {
  const tomorrowBefore = israelDate(1);
  const response = await request.get('/book');
  const tomorrowAfter = israelDate(1);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');

  const html = await response.text();
  expect(html).toMatch(new RegExp(`<h1[^>]*>${STEP_HEADING}</h1>`));
  // The default selection is tomorrow in Israel (two candidates only if midnight passed mid-request).
  expect(html).toMatch(new RegExp(`data-calendar-date="(${tomorrowBefore}|${tomorrowAfter})" aria-pressed="true"`));
  expect(html).toContain('data-booking-duration="60"');
  expect(html).not.toContain(PLACEHOLDER);
  // Availability is unknown to the server: it must not be reported as an empty day.
  expect(html).not.toContain(EMPTY_DAY);
});

test.describe('before any script runs', () => {
  test.use({ javaScriptEnabled: false });

  test('the visitor sees the step heading, the calendar and a loading grid', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByRole('heading', { level: 1, name: STEP_HEADING })).toBeVisible();
    await expect(selectedDay(page, israelDate(1)).first()).toBeVisible();
    await expect(page.locator('[data-booking-duration="60"]').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(PLACEHOLDER)).toHaveCount(0);
    await expect(page.getByText(EMPTY_DAY)).toHaveCount(0);
  });
});

for (const timezoneId of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
  test.describe(`a browser in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test('hydrates the server-rendered calendar without a mismatch and keeps Israel\'s date', async ({ page }) => {
      const hydrationErrors = collectHydrationErrors(page);
      await page.goto('/book');
      await slotsSettled(page);
      await expect(selectedDay(page, israelDate(1)).first()).toBeVisible();
      expect(hydrationErrors).toEqual([]);
    });
  });
}

test('the browser clock decides once the page has hydrated (served just before midnight)', async ({ page }) => {
  // The server renders today's date; this browser is already on Israel's next day, as when the page
  // was served at 23:59 and hydrated after midnight. Timers keep running, only the date is pinned.
  const browserToday = israelDate(1);
  const browserTomorrow = israelDate(2);
  await page.clock.setFixedTime(new Date(`${browserToday}T10:00:00Z`));
  const hydrationErrors = collectHydrationErrors(page);
  const slotsForBrowserTomorrow = page.waitForRequest((request) =>
    request.url().includes(`/api/slots?date=${browserTomorrow}&`)
  );

  await page.goto('/book');
  await slotsForBrowserTomorrow;
  await slotsSettled(page);
  await expect(selectedDay(page, browserTomorrow).first()).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
