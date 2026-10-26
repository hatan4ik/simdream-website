import type { Locator, Page } from '@playwright/test';
import { expect } from '../support/e2e';
import {
  checkoutButton,
  fillStorefrontManifest,
  findBookableDate,
  openStorefrontOn,
  openWizardStep,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  storefrontVoucher,
} from './support/booking';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

interface FormUnderTest {
  form: string;
  open: (page: Page) => Promise<void>;
  /** Known defect when some visible label is not programmatically associated with its control. */
  unassociatedLabels?: string;
  /** Known defect when some control has no accessible name at all. */
  unnamedControls?: string;
}

const FORMS: readonly FormUnderTest[] = [
  { form: 'storefront captain manifest (/book)', open: (page) => gotoSettled(page, '/book') },
  { form: 'contact form (/contact)', open: (page) => gotoSettled(page, '/contact') },
  {
    form: 'gift voucher purchase (/vouchers)',
    open: (page) => gotoSettled(page, '/vouchers'),
  },
  {
    form: 'corporate workshop inquiry (/workshops)',
    open: (page) => gotoSettled(page, '/workshops'),
  },
  {
    form: 'member login (/login)',
    open: (page) => gotoSettled(page, '/login'),
  },
  {
    form: 'guided wizard add-on selection (/book step 2)',
    open: (page) => openWizardStep(page, 2),
  },
  {
    form: 'guided wizard pilot details (/book step 3)',
    open: (page) => openWizardStep(page, 3),
  },
];

function visibleControls(page: Page): Locator {
  return page.locator('input:not([type="hidden"]):visible, select:visible, textarea:visible');
}

test.describe('form control labelling', () => {
  for (const { form, open, unassociatedLabels, unnamedControls } of FORMS) {
    test(`${form}: every control has a programmatic label`, async ({ page }) => {
      test.fail(Boolean(unassociatedLabels), unassociatedLabels);
      await open(page);
      await expect(visibleControls(page).first()).toBeVisible();

      const unlabelled = await visibleControls(page).evaluateAll((controls) =>
        controls
          .filter((control) => {
            const field = control as HTMLInputElement;
            const labelled = Array.from(field.labels ?? []).some((label) => (label.textContent ?? '').trim() !== '');
            return !labelled && !field.getAttribute('aria-label')?.trim() && !field.getAttribute('aria-labelledby');
          })
          .map((control) => {
            const field = control as HTMLInputElement;
            return `<${field.tagName.toLowerCase()} type=${field.type}> placeholder="${field.placeholder ?? ''}"`;
          })
      );
      expect(unlabelled).toEqual([]);
    });

    test(`${form}: every control has a non-empty accessible name`, async ({ page }) => {
      test.fail(Boolean(unnamedControls), unnamedControls);
      await open(page);
      await expect(visibleControls(page).first()).toBeVisible();

      // Soft assertions report every unnamed control, not just the first. The DOM is settled, so no retry window is needed.
      for (const control of await visibleControls(page).all()) {
        const tag = await control.evaluate((element) => `<${element.tagName.toLowerCase()} type=${(element as HTMLInputElement).type}>`);
        await expect.soft(control, `${tag} needs an accessible name`).toHaveAccessibleName(/\S/, { timeout: 500 });
      }
    });
  }
});

/** True when the element sits inside a region that assistive technology announces on change. */
function isAnnounced(target: Locator): Promise<boolean> {
  return target.evaluate(
    (element) => element.closest('[role="alert"], [role="status"], [aria-live="polite"], [aria-live="assertive"]') !== null
  );
}

test.describe('validation and error feedback', () => {
  test('blocks checkout and focuses the first empty required manifest field', async ({ page }) => {
    await gotoSettled(page, '/book');
    let checkoutCalls = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/checkout') checkoutCalls += 1;
    });

    await checkoutButton(page).click();

    const nameField = page.getByLabel('Pilot Full Name *');
    await expect(nameField).toBeFocused();
    expect(await nameField.evaluate((field) => (field as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(checkoutCalls).toBe(0);
  });

  test('announces an invalid voucher code to screen readers', async ({ page }) => {
    await gotoSettled(page, '/book');
    const voucher = storefrontVoucher(page);
    await voucher.input.fill('SD-VOUCH-NOTAREALCODE0000');
    await voucher.apply.click();
    const message = page.getByText('Invalid voucher code.');
    await expect(message).toBeVisible();

    expect(await isAnnounced(message)).toBe(true);
  });

  test('ties the invalid voucher message to the voucher field', async ({ page }) => {
    await gotoSettled(page, '/book');
    const voucher = storefrontVoucher(page);
    await voucher.input.fill('SD-VOUCH-NOTAREALCODE0000');
    await voucher.apply.click();
    await expect(page.getByText('Invalid voucher code.')).toBeVisible();

    await expect(voucher.input).toHaveAttribute('aria-invalid', 'true', { timeout: 2_000 });
    await expect(voucher.input).toHaveAccessibleDescription(/Invalid voucher code/);
  });

  test('announces a failed checkout in an alert with a user-friendly message', async ({ page, request }) => {
    const { date } = await findBookableDate(request);
    await openStorefrontOn(page, date);
    await fillStorefrontManifest(page);
    const response = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/checkout');

    await checkoutButton(page).click();

    expect((await response).status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE }).first()).toBeVisible();
    await expect(checkoutButton(page)).toBeEnabled();
  });

  test('announces a failed checkout only once', async ({ page, request }) => {
    const { date } = await findBookableDate(request);
    await openStorefrontOn(page, date);
    await fillStorefrontManifest(page);
    await checkoutButton(page).click();
    const alerts = page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE });
    await expect(alerts.first()).toBeVisible();

    await expect(alerts).toHaveCount(1, { timeout: 2_000 });
  });

  test('announces a failed gift voucher purchase in an alert', async ({ page }) => {
    await gotoSettled(page, '/vouchers');
    await page.getByPlaceholder('aviad@example.com').fill('gift.recipient@example.com');
    await page.getByPlaceholder('danielle@example.com').fill('gift.sender@example.com');
    const response = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/checkout');

    await page.getByRole('button', { name: /^Proceed to Secure Checkout/ }).click();

    expect((await response).status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE })).toBeVisible();
  });

  test('accepts a gift voucher order that leaves the optional recipient email empty', async ({ page }) => {
    await gotoSettled(page, '/vouchers');
    await expect(page.getByText('Leave empty if you wish to print and present the voucher yourself.')).toBeVisible();
    await page.getByPlaceholder('danielle@example.com').fill('gift.sender@example.com');
    const response = page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/checkout');

    await page.getByRole('button', { name: /^Proceed to Secure Checkout/ }).click();

    // With payments disabled the only acceptable outcome is the payments-unavailable notice, never a validation error.
    expect((await response).status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE_MESSAGE })).toBeVisible();
  });

  test('announces a failed workshop inquiry to screen readers', async ({ page }) => {
    // The server path is covered by the integration suite; here only the client's error UI matters.
    await page.route(
      (url) => url.pathname === '/api/workshops',
      (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({ status: 503, json: { error: 'Unable to submit your inquiry right now.' } })
          : route.fallback()
    );
    await gotoSettled(page, '/workshops');
    await page.getByPlaceholder('e.g. Acme Cyber Technologies').fill('QA Flight Ops');
    await page.getByPlaceholder('e.g. Sarah Levi, VP HR').fill('Noa Tester');
    await page.getByPlaceholder('sharon@company.com').fill('noa.tester@example.com');
    await page.getByPlaceholder('+972-54-000-0000').fill('054-555-0103');
    await page.getByRole('button', { name: 'Submit Workshop Inquiry' }).click();
    // The banner shows the server's explanation rather than a generic failure (UX-9).
    const message = page.getByText('Unable to submit your inquiry right now.');
    await expect(message).toBeVisible();

    expect(await isAnnounced(message)).toBe(true);
  });
});
