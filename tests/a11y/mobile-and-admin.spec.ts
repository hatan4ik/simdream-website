import { devices, type Locator, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, expect } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { ADMIN_SCAN_ROUTES, adminScanKey, MOBILE_SCAN_ROUTES, mobileScanKey } from './support/scan-keys';

// Browser type is fixed per project, so only the Pixel 7 viewport and input traits are applied.
const { defaultBrowserType: _browserType, ...pixel7 } = devices['Pixel 7'];

/** Admin pages render their data after authenticated API calls; each scan waits for its loaded state. */
const ADMIN_LOADED: Record<(typeof ADMIN_SCAN_ROUTES)[number], (page: Page) => Locator> = {
  '/admin': (page) => page.getByText('TILED CAPACITY EFFICIENCY'),
  '/admin/bookings': (page) => page.getByRole('cell', { name: /^SD-737-/ }).first(),
  '/admin/vouchers': (page) => page.getByRole('cell', { name: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA' }),
  '/admin/workshops': (page) => page.getByText('Wiz Cybersecurity'),
};

// Static scans: video adds encoding cost without adding signal; the axe JSON is attached instead.
test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

test.describe('mobile viewport (Pixel 7)', () => {
  test.use(pixel7);

  for (const route of MOBILE_SCAN_ROUTES) {
    test(`${route} has no new serious or critical WCAG A/AA violations`, async ({ page, baseURL }, testInfo) => {
      await isolateFromThirdParties(page, baseURL);
      await gotoSettled(page, route);
      await page.waitForLoadState('networkidle');
      expect(page.viewportSize()?.width).toBe(412);

      await expectAxeBaseline(page, testInfo, mobileScanKey(route));
    });
  }
});

test.describe('admin dispatch pages', () => {
  test.use({ httpCredentials: ADMIN_CREDENTIALS });

  for (const route of ADMIN_SCAN_ROUTES) {
    test(`${route} has no new serious or critical WCAG A/AA violations`, async ({ page, baseURL }, testInfo) => {
      await isolateFromThirdParties(page, baseURL);
      await gotoSettled(page, route);
      await expect(ADMIN_LOADED[route](page)).toBeVisible();

      await expectAxeBaseline(page, testInfo, adminScanKey(route));
    });
  }
});
