import { expect, test } from './fixtures';

test.describe('contact page', () => {
  test.describe('without scripts', () => {
    // The server-rendered page must already carry the facility details. This
    // also keeps the check independent of hydration.
    test.use({ javaScriptEnabled: false });

    test('shows the address, phone, email, WhatsApp and opening hours', async ({ page }) => {
      const response = await page.goto('/contact');
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: 'Visit Us in Tel Aviv' })).toBeVisible();

      const main = page.locator('body');
      await expect(main.getByText('Gershon Shatz St 36', { exact: true })).toBeVisible();
      await expect(main.getByText('Tel Aviv-Yafo, 6701772, Israel', { exact: true })).toBeVisible();

      const phone = page.getByRole('link', { name: '055-507-1307 (+972-55-507-1307)' }).first();
      await expect(phone).toHaveAttribute('href', 'tel:+972555071307');
      const email = page.getByRole('link', { name: 'desk@simdream.co.il' }).first();
      await expect(email).toHaveAttribute('href', 'mailto:desk@simdream.co.il');
      await expect(page.getByRole('link', { name: /Chat on WhatsApp/ })).toHaveAttribute(
        'href',
        'https://wa.me/972555071307'
      );

      const hours = page.getByRole('heading', { level: 2, name: 'Simulator Operating Hours' }).locator('..');
      await expect(hours).toContainText('10:00 – 23:00');
      await expect(hours).toContainText('09:00 – 16:00');
      await expect(hours).toContainText('19:00 – 24:00');
    });
  });

  test('loads without a React hydration error (E2E-12)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-02T14:07:00+02:00'));

    await page.goto('/contact');
    // This clock reading only appears once React has rendered on the client.
    await expect(page.getByText('Tel Aviv Time: 14:07 IST (Closes in 8h 53m)')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
