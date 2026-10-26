import type { Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, expect, nextIsraelWeekday, PUBLIC_ROUTES } from '../support/e2e';
import { HYDRATION_MISMATCH_ERROR, test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

test.use({ video: 'off' });
test.describe.configure({ timeout: 90_000 });

/**
 * Proves React finished hydrating the shared layout: the navbar language menu only opens
 * once its click handler is attached. Hydration errors are thrown before that point.
 */
async function waitForHydratedLayout(page: Page): Promise<void> {
  // aria-expanded flips only once React has attached the click handler.
  const languageButton = page.locator('nav button[aria-haspopup="true"]').filter({ visible: true }).first();
  await expect(async () => {
    await languageButton.click();
    await expect(languageButton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
  }).toPass();
}

function collectHydrationErrors(page: Page, sink: string[]): void {
  page.on('pageerror', (error) => {
    if (HYDRATION_MISMATCH_ERROR.test(error.message)) sink.push(`${page.url()}: ${error.message.slice(0, 80)}`);
  });
}

test('hydrates /contact without React errors', async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  const errors: string[] = [];
  collectHydrationErrors(page, errors);

  await page.goto('/contact');
  await waitForHydratedLayout(page);

  expect(errors).toEqual([]);
});

test('hydrates the footer status without React errors whether the facility is open or closed', async ({
  browser,
  baseURL,
}) => {
  // One of these always differs from the open/closed state captured at build time.
  const moments = {
    open: `${nextIsraelWeekday(3)}T12:00:00+02:00`, // Wednesday noon
    closed: `${nextIsraelWeekday(6)}T10:00:00+02:00`, // Saturday morning, before prime time
  };
  const errors: string[] = [];
  for (const [state, moment] of Object.entries(moments)) {
    const context = await browser.newContext({ baseURL, timezoneId: 'Asia/Jerusalem' });
    const page = await context.newPage();
    await isolateFromThirdParties(page, baseURL);
    await page.clock.setFixedTime(new Date(moment));
    collectHydrationErrors(page, errors);

    await page.goto('/privacy-policy');
    await waitForHydratedLayout(page);
    await expect(page.locator('footer')).toContainText(state === 'open' ? 'OPEN NOW' : 'CLOSED');
    await context.close();
  }

  expect(errors).toEqual([]);
});

test.describe('hydration on a later day than the build (E2E-12)', () => {
  // Pages are prerendered at build time. A visit 400 days later differs in day, month and
  // year, so any clock read during render (a date default, a ribbon, a copyright year)
  // surfaces as a hydration mismatch here instead of in production the day after a deploy.
  const LATER_VISIT = `${nextIsraelWeekday(3, new Date(Date.now() + 400 * 86_400_000))}T12:00:00+02:00`;

  async function expectCleanHydration(page: Page, baseURL: string | undefined, route: string): Promise<void> {
    await isolateFromThirdParties(page, baseURL);
    await page.clock.setFixedTime(new Date(LATER_VISIT));
    const errors: string[] = [];
    collectHydrationErrors(page, errors);

    await page.goto(route);
    await waitForHydratedLayout(page);

    expect(errors).toEqual([]);
  }

  for (const route of [...PUBLIC_ROUTES, '/dashboard']) {
    test(`hydrates ${route}`, async ({ page, baseURL }) => {
      await expectCleanHydration(page, baseURL, route);
    });
  }

  test.describe('admin', () => {
    test.use({ httpCredentials: ADMIN_CREDENTIALS });

    for (const route of ['/admin', '/admin/bookings', '/admin/workshops', '/admin/vouchers']) {
      test(`hydrates ${route}`, async ({ page, baseURL }) => {
        await expectCleanHydration(page, baseURL, route);
      });
    }
  });
});
