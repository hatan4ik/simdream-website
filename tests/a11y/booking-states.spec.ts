import { expect, preferTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import {
  checkoutButton,
  fillStorefrontManifest,
  findBookableDate,
  openStorefrontOn,
  openWizardStep,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  showZeroSlotState,
  storefrontVoucher,
} from '../usability/support/booking';
import { isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { bookingScanKey, SCAN_THEMES } from './support/scan-keys';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

for (const theme of SCAN_THEMES) {
  test.describe(`booking states in the ${theme} theme`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
    });

    test('the add-on step has no new serious or critical WCAG A/AA violations', async ({ page }, testInfo) => {
      await openWizardStep(page, 2);
      await expect(page.getByRole('checkbox').first()).toBeVisible();

      await expectAxeBaseline(page, testInfo, bookingScanKey('add-on step', theme));
    });

    test('the manifest with validation errors shown has no new serious or critical WCAG A/AA violations', async ({
      page,
      request,
    }, testInfo) => {
      const { date } = await findBookableDate(request);
      await openStorefrontOn(page, date);
      await fillStorefrontManifest(page);
      const voucher = storefrontVoucher(page);
      await voucher.input.fill('SD-VOUCH-NOTAREALCODE0000');
      await voucher.apply.click();
      await expect(page.getByText('Invalid voucher code.')).toBeVisible();
      await checkoutButton(page).click();
      await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE }).first()).toBeVisible();

      await expectAxeBaseline(page, testInfo, bookingScanKey('manifest with errors', theme));
    });

    test('the zero-slot recovery state has no new serious or critical WCAG A/AA violations', async ({ page }, testInfo) => {
      await showZeroSlotState(page);
      await expect(page.getByRole('button', { name: 'Check Next Day →' })).toBeVisible();

      await expectAxeBaseline(page, testInfo, bookingScanKey('zero-slot state', theme));
    });

    test('the guided wizard pilot manifest (step 3) has no new serious or critical WCAG A/AA violations', async ({
      page,
    }, testInfo) => {
      await openWizardStep(page, 3);
      await expect(page.getByPlaceholder('e.g. Capt. Nathanel S.')).toBeVisible();
      await expect(checkoutButton(page)).toBeVisible();

      await expectAxeBaseline(page, testInfo, bookingScanKey('wizard manifest step', theme));
    });
  });
}
