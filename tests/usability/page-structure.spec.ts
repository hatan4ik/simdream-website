import type { Page } from '@playwright/test';
import { expect, PUBLIC_ROUTES } from '../support/e2e';
import { openWizardStep } from './support/booking';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties, pageHeading } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

/** Groups routes by a per-page value and returns the values shared by more than one route. */
async function sharedValues(page: Page, read: (page: Page) => Promise<string>): Promise<Record<string, string[]>> {
  const routesByValue = new Map<string, string[]>();
  for (const route of PUBLIC_ROUTES) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    const value = (await read(page)).trim();
    expect(value, `${route} must define it`).not.toBe('');
    routesByValue.set(value, [...(routesByValue.get(value) ?? []), route]);
  }
  return Object.fromEntries([...routesByValue].filter(([, routes]) => routes.length > 1));
}

test.describe('page metadata', () => {
  test('gives every public route its own document title', async ({ page }) => {

    expect(await sharedValues(page, (current) => current.title())).toEqual({});
  });

  test('serves a site icon instead of a 404 for the browser tab', async ({ page, request }) => {
    await gotoSettled(page, '/');
    // Browsers fall back to /favicon.ico when the document declares no icon.
    const iconLinks = page.locator('link[rel~="icon"]');
    const declared = (await iconLinks.count()) > 0 ? await iconLinks.first().getAttribute('href') : null;

    const icon = await request.get(declared ?? '/favicon.ico');
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toMatch(/^image\//);
  });

  test('gives every public route its own meta description', async ({ page }) => {

    const description = async (current: Page) =>
      (await current.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(await sharedValues(page, description)).toEqual({});
  });
});

test.describe('heading structure', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders exactly one h1`, async ({ page }) => {
      await gotoSettled(page, route);

      await expect(pageHeading(page)).toHaveCount(1);
    });
  }

  for (const step of [1, 2, 3] as const) {
    test(`guided booking wizard step ${step} renders exactly one h1`, async ({ page }) => {
      await openWizardStep(page, step);

      await expect(pageHeading(page)).toHaveCount(1, { timeout: 2_000 });
    });
  }
});
