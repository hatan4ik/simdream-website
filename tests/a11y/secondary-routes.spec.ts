import type { Page } from '@playwright/test';
import { translations } from '@/lib/i18n/translations';
import { expect, preferTheme } from '../support/e2e';
import { showPaidBoardingPass } from '../usability/support/boarding-pass';
import { test } from '../usability/support/fixtures';
import { afterNextPaint, gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { SCAN_THEMES, SECONDARY_SCAN_STATES, secondaryScanKey, type SecondaryScanState } from './support/scan-keys';

/** Well-formed (SD-737- plus 16 of [A-Z2-9]) but owned by no booking, so the real API answers 404. */
const UNKNOWN_BOOKING_REF = 'SD-737-QAUXNOTFOUND2345';

/**
 * Opens each state and waits for its final rendering, so axe never scans a loading placeholder.
 * The browser-test server runs without Supabase, so the auth pages settle on their
 * "not configured" error, which is also what a visitor sees when an auth link is broken.
 */
const OPEN_STATE: Record<SecondaryScanState, (page: Page) => Promise<void>> = {
  'boarding pass (paid)': async (page) => {
    await showPaidBoardingPass(page);
    await expect(page.getByRole('button', { name: translations.en.bookingSuccess.downloadPdf })).toBeVisible();
    // Celebratory confetti draws on a temporary full-screen canvas that axe would see as overlapping
    // every text node. The effect that fires it has run by the next paint; then wait for the library
    // to remove the canvas so contrast is measured on the settled pass.
    await afterNextPaint(page);
    await expect(page.locator('body > canvas')).toHaveCount(0, { timeout: 15_000 });
  },
  'boarding pass (unknown ref)': async (page) => {
    await page.goto(`/book/success?ref=${UNKNOWN_BOOKING_REF}`);
    await expect(page.getByRole('alert').filter({ hasText: 'Booking not found' })).toBeVisible();
    await expect(page.getByRole('button', { name: translations.en.bookingSuccess.downloadPdf })).toHaveCount(0);
  },
  'member dashboard (anonymous)': async (page) => {
    await gotoSettled(page, '/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to your Flight Deck' })).toBeVisible();
  },
  'password reset': async (page) => {
    await gotoSettled(page, '/auth/reset-password');
    await expect(page.getByText('Password recovery is not configured for this environment.')).toBeVisible();
  },
  'auth callback (no code)': async (page) => {
    await gotoSettled(page, '/auth/callback');
    await expect(page.getByRole('heading', { level: 1, name: 'Member sign-in needs attention' })).toBeVisible();
  },
  'not found page': async (page) => {
    const response = await page.goto('/definitely-missing');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  },
};

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

for (const theme of SCAN_THEMES) {
  test.describe(`secondary pages in the ${theme} theme`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await preferTheme(page, theme);
    });

    for (const state of SECONDARY_SCAN_STATES) {
      test(`the ${state} has no new serious or critical WCAG A/AA violations`, async ({ page }, testInfo) => {
        await OPEN_STATE[state](page);
        await expect(page.locator('html')).toHaveAttribute('data-ui', theme);

        await expectAxeBaseline(page, testInfo, secondaryScanKey(state, theme));
      });
    }
  });
}
