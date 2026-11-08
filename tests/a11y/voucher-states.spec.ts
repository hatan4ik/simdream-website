import { expect, preferTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { SCAN_THEMES, voucherScanKey } from './support/scan-keys';

// /vouchers opens on the certificate flow, which the public-route and mobile scans already cover.
// The Gift Card flow (quick-select balance, card details and the checkout button) is a different
// layout reached only through the format picker, so it gets its own scan on a phone viewport.
test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 390, height: 844 } });
test.describe.configure({ timeout: 120_000 });

for (const theme of SCAN_THEMES) {
  test.describe(`voucher states in the ${theme} theme`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
    });

    test('the Gift Card flow has no new serious or critical WCAG A/AA violations', async ({ page }, testInfo) => {
      await gotoSettled(page, '/vouchers');
      await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();
      await expect(page.getByRole('heading', { name: 'Quick-Select Gift Card Credit Balance' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Personalized Gift Card Details' })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Proceed to Secure Checkout/ })).toBeVisible();

      await expectAxeBaseline(page, testInfo, voucherScanKey('gift card flow', theme));
    });
  });
}
