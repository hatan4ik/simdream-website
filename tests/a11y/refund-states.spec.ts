import type { Page } from '@playwright/test';
import { expect, expectThemeApplied, preferLanguage, preferTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { REFUND_SCAN_STATES, refundScanKey, SCAN_THEMES, type RefundScanState } from './support/scan-keys';

// The unlisted /refund page is not in PUBLIC_ROUTES (it is not a public route), so its states are
// scanned here: every step of the form, the inline errors, the confirmation and the "nothing was
// sent" ending, in all three themes, plus the first step in Hebrew (right to left).
test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

const future = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(Date.now() + 10 * 86_400_000));

async function fillOrderStep(page: Page) {
  await page.getByLabel('Booking reference, voucher code or order number').fill('WIX-77231');
  await page.getByLabel('Email used for the order').fill('dana@example.com');
  await page.getByLabel('Your full name').fill('Dana Pilot');
  await page.getByLabel('Phone number').fill('+972501234567');
  await page.getByLabel(/^Session date/).fill(future());
}

async function toReasonStep(page: Page) {
  await fillOrderStep(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'What happened?' })).toBeVisible();
  await expect(page.locator('[data-refund-verification]')).toBeVisible();
}

async function toReviewStep(page: Page) {
  await toReasonStep(page);
  await page.getByRole('radio', { name: /My plans changed/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Review and send' })).toBeVisible();
}

const OPEN_STATE: Record<RefundScanState, (page: Page) => Promise<void>> = {
  'order step': async (page) => {
    await gotoSettled(page, '/refund');
    await expect(page.getByRole('heading', { level: 2, name: 'Which order is this about?' })).toBeVisible();
  },
  'order step with errors': async (page) => {
    await gotoSettled(page, '/refund');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Please check the highlighted fields.' })).toBeVisible();
  },
  'order step (he)': async (page) => {
    await preferLanguage(page, 'he');
    await gotoSettled(page, '/refund');
    await expect(page.getByRole('heading', { level: 2, name: 'על איזו הזמנה מדובר?' })).toBeVisible();
  },
  'reason step': async (page) => {
    await gotoSettled(page, '/refund');
    await toReasonStep(page);
    await page.getByRole('radio', { name: /My plans changed/ }).check();
    await expect(page.locator('[data-refund-panel]')).toHaveAttribute('data-refund-outcome', 'full_refund_possible');
  },
  'review step with errors': async (page) => {
    await gotoSettled(page, '/refund');
    await toReviewStep(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('Please confirm to continue.').first()).toBeVisible();
  },
  'request received': async (page) => {
    await gotoSettled(page, '/refund');
    await toReviewStep(page);
    await page.getByRole('checkbox', { name: /I confirm that the information I gave is true/ }).check();
    await page.getByRole('checkbox', { name: /I understand that my request is handled under the refund rules/ }).check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Request received' })).toBeVisible();
  },
  unavailable: async (page) => {
    await page.route('**/api/refund-requests', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Nothing was sent.' }) })
        : route.fallback()
    );
    await gotoSettled(page, '/refund');
    await toReviewStep(page);
    await page.getByRole('checkbox', { name: /I confirm that the information I gave is true/ }).check();
    await page.getByRole('checkbox', { name: /I understand that my request is handled under the refund rules/ }).check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'We cannot take requests online right now' })).toBeVisible();
  },
};

for (const theme of SCAN_THEMES) {
  test.describe(`refund form states in the ${theme} theme`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
    });

    for (const state of REFUND_SCAN_STATES) {
      test(`the ${state} has no new serious or critical WCAG A/AA violations`, async ({ page }, testInfo) => {
        await OPEN_STATE[state](page);
        await expectThemeApplied(page, theme);

        await expectAxeBaseline(page, testInfo, refundScanKey(state, theme));
      });
    }
  });
}
