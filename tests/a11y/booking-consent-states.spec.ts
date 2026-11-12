import type { Page } from '@playwright/test';
import { translations } from '@/lib/i18n/translations';
import { expect, expectThemeApplied, preferLanguage, preferTheme, type Language } from '../support/e2e';
import { sameMonthBirthDate } from '../support/booking-extras';
import { test } from '../usability/support/fixtures';
import { findBookableDate, openStorefrontOn } from '../usability/support/booking';
import { gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import {
  CHECKOUT_EXTRAS_SCAN_STATES,
  checkoutExtrasScanKey,
  SCAN_THEMES,
  type CheckoutExtrasScanState,
} from './support/scan-keys';

// The mandatory checkout extras (consent block and pilot birth date) on the pilot step of both views, in all
// three themes: the empty form with every error showing and the full media clause open, in English, Hebrew
// (right to left) and Russian, plus the congratulations state and the Express Shop buy box.
test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

async function openWizardPilotStep(page: Page, language: Language): Promise<void> {
  const copy = translations[language].booking;
  await preferLanguage(page, language);
  await gotoSettled(page, '/book');
  await page.locator('[data-booking-view="wizard"]').filter({ visible: true }).first().click();
  const toAddons = page.getByRole('button', { name: copy.continueToAddons });
  await expect(toAddons).toBeEnabled({ timeout: 20_000 });
  await toAddons.click();
  await page.getByRole('button', { name: copy.continueToPilot }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.step4Title })).toBeVisible();
}

/** Contact details only (the native required fields would otherwise stop the submit before the extras do). */
async function fillContact(page: Page): Promise<void> {
  await page.locator('form input[type="text"]').first().fill('Dana Scan');
  await page.locator('form input[type="email"]').fill('dana.scan@example.com');
  await page.locator('form input[type="tel"]').fill('054-555-0101');
}

async function submitWithErrors(page: Page): Promise<void> {
  await fillContact(page);
  await page.locator('form button[type="submit"]').filter({ visible: true }).click();
  await expect(page.locator('[data-consent-error]')).toHaveCount(2);
  await expect(page.locator('[data-birthday-error-region] p')).toBeVisible();
}

/**
 * Opens the full media clause, then rests the first confirmation in the middle of the screen. The sticky site
 * header covers the top of the viewport, and a control scrolled under it would be reported as an undersized
 * target for a reason that has nothing to do with the control.
 */
async function openMediaClause(page: Page): Promise<void> {
  await page.locator('[data-consent-media-disclosure] button').click();
  await expect(page.locator('[data-consent-media-fulltext] li').first()).toBeVisible();
  await page.locator('[data-consent-agreement="rules"] input[type="checkbox"]').evaluate((box) => box.scrollIntoView({ block: 'center' }));
}

const WIZARD_WITH_ERRORS = (language: Language) => async (page: Page) => {
  await openWizardPilotStep(page, language);
  await submitWithErrors(page);
  await openMediaClause(page);
};

const OPEN_STATE: Record<CheckoutExtrasScanState, (page: Page, date: string) => Promise<void>> = {
  'wizard pilot step with errors (en)': WIZARD_WITH_ERRORS('en'),
  'wizard pilot step with errors (he)': WIZARD_WITH_ERRORS('he'),
  'wizard pilot step with errors (ru)': WIZARD_WITH_ERRORS('ru'),
  'wizard pilot step with birthday applied (en)': async (page) => {
    await openWizardPilotStep(page, 'en');
    await page.locator('[data-birthday-field] input[type="date"]').fill(await sameMonthAsFlight(page));
    await expect(page.locator('[data-birthday-banner]')).toBeVisible();
    await page.locator('[data-consent-agreement="rules"] input[type="checkbox"]').check();
    await openMediaClause(page);
  },
  'storefront buy box with errors (en)': async (page, date) => {
    await openStorefrontOn(page, date);
    await fillContact(page);
    await page.locator('#storefront-buy-box button[type="submit"]').click();
    await expect(page.locator('[data-consent-error]')).toHaveCount(2);
    await openMediaClause(page);
  },
};

/**
 * A birth date in the month of the flight the wizard preselected. The control's `min` is the flight date minus
 * 111 years (lib/booking/client/birthday-field.ts), so its month is the flight's month.
 */
async function sameMonthAsFlight(page: Page): Promise<string> {
  const min = await page.locator('[data-birthday-field] input[type="date"]').getAttribute('min');
  if (!min) throw new Error('The birth date control has no min');
  return sameMonthBirthDate(min);
}

for (const theme of SCAN_THEMES) {
  test.describe(`checkout extras in the ${theme} theme`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
    });

    for (const state of CHECKOUT_EXTRAS_SCAN_STATES) {
      test(`the ${state} has no new serious or critical WCAG A/AA violations`, async ({ page, request }, testInfo) => {
        const { date } = await findBookableDate(request);
        await OPEN_STATE[state](page, date);
        await expectThemeApplied(page, theme);

        await expectAxeBaseline(page, testInfo, checkoutExtrasScanKey(state, theme));
      });
    }
  });
}
