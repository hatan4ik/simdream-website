import type { Page } from '@playwright/test';
import { blockThirdPartyRequests, expect, preferLanguage, test } from '../support/e2e';
import {
  PAYMENTS_DISABLED_MESSAGE,
  RAW_NETWORK_ERROR,
  checkoutButton,
  expectDepartureSelected,
  fillPilotDetails,
  gate,
  isCheckoutApi,
  openBookingPage,
} from './helpers';

// The browser-test server runs production rules without live Stripe keys, so
// every checkout answers 503 with PAYMENTS_DISABLED_MESSAGE. These tests assert
// the customer-facing handling of that and of network failures.
// Known-defect tests call test.slow(): they wait out an assertion timeout and must fail, not time out.

// Screencast recording and its finalisation in context teardown made passing tests
// exceed the 45 s budget on a contended host; failure screenshots are kept.
test.use({ video: 'off' });

const OFFLINE_HINT = /offline|internet connection|check your connection/i;

function checkoutRequestCounter(page: Page) {
  let count = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && isCheckoutApi(new URL(request.url()))) count += 1;
  });
  return () => count;
}

async function openReadyBookingForm(page: Page, baseURL: string | undefined) {
  await openBookingPage(page, baseURL);
  await expectDepartureSelected(page);
  await fillPilotDetails(page);
}

async function openVoucherForm(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error('baseURL is required');
  await blockThirdPartyRequests(page, baseURL);
  await preferLanguage(page, 'en');
  await page.goto('/vouchers');
  // The voucher form has no programmatic labels yet; placeholders are its only accessible hooks.
  await page.getByPlaceholder('aviad@example.com').fill('recipient.resilience@example.test');
  await page.getByPlaceholder('danielle@example.com').fill('sender.resilience@example.test');
}

const voucherPurchaseButton = (page: Page) => page.getByRole('button', { name: /Proceed to Secure Checkout/ });

test.describe('/book checkout', () => {
  test('explains that online payment is unavailable and re-enables checkout', async ({ page, baseURL }) => {
    await openReadyBookingForm(page, baseURL);

    await checkoutButton(page).click();

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_DISABLED_MESSAGE }).first()).toBeVisible();
    await expect(checkoutButton(page)).toBeEnabled();
    await expect(page.getByLabel(/Pilot Email/)).toHaveValue('resilience.pilot@example.test');
  });

  test('sends a single checkout request when the customer double-clicks', async ({ page, baseURL }) => {
    const checkoutRequests = checkoutRequestCounter(page);
    const release = gate();
    await page.route(isCheckoutApi, async (route) => {
      await release.promise;
      await route.continue();
    });
    await openReadyBookingForm(page, baseURL);

    await checkoutButton(page).dblclick();
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    release.open();

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_DISABLED_MESSAGE }).first()).toBeVisible();
    expect(checkoutRequests()).toBe(1);
  });

  test('sends a single checkout request when the customer presses Enter twice', async ({ page, baseURL }) => {
    const checkoutRequests = checkoutRequestCounter(page);
    const release = gate();
    await page.route(isCheckoutApi, async (route) => {
      await release.promise;
      await route.continue();
    });
    await openReadyBookingForm(page, baseURL);

    await page.getByLabel(/Phone Number/).press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    release.open();

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_DISABLED_MESSAGE }).first()).toBeVisible();
    expect(checkoutRequests()).toBe(1);
  });

  test('keeps the form filled and checkout available when the connection drops', async ({ page, baseURL }) => {
    await openReadyBookingForm(page, baseURL);
    const errorAlert = page.getByRole('alert').filter({ hasText: /\S/ });
    // Any error message after the click must be new, not a pre-existing alert.
    await expect(errorAlert).toHaveCount(0);
    await page.context().setOffline(true);

    await checkoutButton(page).click();

    await expect(errorAlert.first()).toBeVisible();
    await expect(checkoutButton(page)).toBeEnabled();
    await expect(page.getByLabel(/Pilot Full Name/)).toHaveValue('Resilience Pilot');
  });

  test('explains a dropped connection in plain language (REL-13)', async ({ page, baseURL }) => {
    test.slow();
    await openReadyBookingForm(page, baseURL);
    await page.context().setOffline(true);

    await checkoutButton(page).click();

    const alert = page.getByRole('alert').filter({ hasText: /\S/ }).first();
    await expect(alert).toHaveText(OFFLINE_HINT);
    await expect(alert).not.toHaveText(RAW_NETWORK_ERROR);
  });
});

test.describe('/vouchers purchase', () => {
  test('explains that online payment is unavailable and re-enables the purchase button', async ({ page, baseURL }) => {
    await openVoucherForm(page, baseURL);

    await voucherPurchaseButton(page).click();

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_DISABLED_MESSAGE })).toBeVisible();
    await expect(voucherPurchaseButton(page)).toBeEnabled();
    await expect(page.getByPlaceholder('danielle@example.com')).toHaveValue('sender.resilience@example.test');
  });

  test('sends a single checkout request when the customer double-clicks', async ({ page, baseURL }) => {
    const checkoutRequests = checkoutRequestCounter(page);
    const release = gate();
    await page.route(isCheckoutApi, async (route) => {
      await release.promise;
      await route.continue();
    });
    await openVoucherForm(page, baseURL);

    await voucherPurchaseButton(page).dblclick();
    await expect(page.getByRole('button', { name: 'Generating Voucher...' })).toBeDisabled();
    release.open();

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_DISABLED_MESSAGE })).toBeVisible();
    expect(checkoutRequests()).toBe(1);
  });

  test('keeps the form filled and purchase available when the connection drops', async ({ page, baseURL }) => {
    await openVoucherForm(page, baseURL);
    const errorAlert = page.getByRole('alert').filter({ hasText: /\S/ });
    await expect(errorAlert).toHaveCount(0);
    await page.context().setOffline(true);

    await voucherPurchaseButton(page).click();

    await expect(errorAlert).toBeVisible();
    await expect(voucherPurchaseButton(page)).toBeEnabled();
    await expect(page.getByPlaceholder('aviad@example.com')).toHaveValue('recipient.resilience@example.test');
  });

  test('explains a dropped connection in plain language (REL-13)', async ({ page, baseURL }) => {
    test.slow();
    await openVoucherForm(page, baseURL);
    await page.context().setOffline(true);

    await voucherPurchaseButton(page).click();

    const alert = page.getByRole('alert').filter({ hasText: /\S/ });
    await expect(alert).toHaveText(OFFLINE_HINT);
    await expect(alert).not.toHaveText(RAW_NETWORK_ERROR);
  });
});
