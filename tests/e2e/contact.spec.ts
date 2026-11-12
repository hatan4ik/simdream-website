import { expect, test } from './fixtures';
import { translations } from '@/lib/i18n/translations';
import { NO_SEEDED_CONSENT } from '../support/consent';

test.describe('contact page', () => {
  test.describe('without scripts', () => {
    // The server-rendered page must already carry the facility details. This
    // also keeps the check independent of hydration.
    //
    // The suite pre-seeds the cookie-consent record into every browser context. Restoring that state
    // needs a script to run on the site origin, which a scripts-off context cannot do (Firefox then
    // waits for the root page to load until the test times out). With scripts off there is no consent
    // banner to hide anyway, so this one context starts without the seed.
    test.use({ javaScriptEnabled: false, storageState: NO_SEEDED_CONSENT });

    test('shows the address, phone, email, WhatsApp and opening hours', async ({ page }) => {
      const response = await page.goto('/contact');
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'he');
      await expect(page.getByRole('heading', { level: 1, name: 'בקרו אותנו בתל אביב' })).toBeVisible();

      const main = page.locator('body');
      await expect(main.getByText('רחוב גרשון ש"ץ 36', { exact: true })).toBeVisible();
      await expect(main.getByText('תל אביב-יפו, 6701772, ישראל', { exact: true })).toBeVisible();

      const phone = page.locator('a[href="tel:+972555071307"]').first();
      await expect(phone).toHaveAttribute('href', 'tel:+972555071307');
      const email = page.locator('a[href="mailto:desk@simdream.co.il"]').first();
      await expect(email).toHaveAttribute('href', 'mailto:desk@simdream.co.il');
      await expect(page.locator('a[href="https://wa.me/972555071307"]').first()).toBeVisible();

      const hours = page.getByRole('heading', { level: 2, name: 'שעות פעילות הסימולטור' }).locator('..');
      await expect(hours).toContainText('09:00 – 24:00');
    });
  });

  test('loads without a React hydration error (E2E-12)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-02T14:07:00+02:00'));

    await page.goto('/contact');
    // This clock reading only appears once React has rendered on the client.
    await expect(page.getByText('Tel Aviv Time: 14:07 IST (Closes in 9h 53m)')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('submits a Dispatch inquiry only after the API accepts it', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true }),
      });
    });

    await page.goto('/contact');
    await page.locator('#contact-name').fill('Dana Probe');
    await page.locator('#contact-email').fill('dana@probe.test');
    await page.locator('#contact-phone').fill('+972501112233');
    await page.locator('#contact-message').fill('Please help us plan a 90-minute flight experience.');
    const contactRequest = page.waitForRequest(
      (request) => request.url().endsWith('/api/contact') && request.method() === 'POST'
    );
    await page.locator('form:has(#contact-name) button[type="submit"]').click();

    await expect(page.locator('[role="status"]')).toBeVisible();
    expect((await contactRequest).postDataJSON()).toMatchObject({
      name: 'Dana Probe',
      email: 'dana@probe.test',
      phone: '+972501112233',
      subject: 'General Question',
      message: 'Please help us plan a 90-minute flight experience.',
    });
  });

  test('keeps the inquiry form open when Dispatch cannot accept it', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unable to deliver your message right now. Please try again later.' }),
      });
    });

    await page.goto('/contact');
    await page.locator('#contact-name').fill('Dana Probe');
    await page.locator('#contact-email').fill('dana@probe.test');
    await page.locator('#contact-message').fill('Please help us plan a 90-minute flight experience.');
    await page.locator('form:has(#contact-name) button[type="submit"]').click();

    // Match the form's own failure copy, never a bare getByRole('alert'): Next's route announcer is a
    // permanent, empty role="alert" that is 1 x 1 px (visible to Playwright). Unfiltered, the assertion
    // passes on the announcer alone when it polls before the error renders, and is a strict-mode
    // violation once the error is there.
    await expect(
      page.getByRole('alert').filter({ hasText: translations.en.contact.formDeliveryError })
    ).toBeVisible();
    await expect(page.locator('#contact-message')).toHaveValue('Please help us plan a 90-minute flight experience.');
    await expect(page.locator('[role="status"]')).toHaveCount(0);
  });
});
