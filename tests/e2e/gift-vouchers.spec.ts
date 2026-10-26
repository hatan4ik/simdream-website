import { PAYMENTS_UNAVAILABLE } from './pages/booking-page';
import { validityOf, type VoucherOrder } from './pages/forms';
import { ilsPattern } from './pages/format';
import { expect, recordRequests, test } from './fixtures';

const ORDER: VoucherOrder = {
  recipientName: 'Aviad Journey',
  recipientEmail: 'aviad.journey@example.com',
  senderName: 'Danielle Journey',
  senderEmail: 'danielle.journey@example.com',
};

test.describe('gift vouchers', () => {
  test('updates the live boarding-pass preview as the buyer personalises the voucher', async ({ page, vouchers }) => {
    await vouchers.goto();

    await vouchers.tier(/90-Min Ultimate Aviator/).click();
    await vouchers.recipientName().fill(ORDER.recipientName);
    await vouchers.senderName().fill(ORDER.senderName);

    await expect(vouchers.submit()).toHaveText(ilsPattern(1290));
    await expect(page.getByText(ORDER.recipientName, { exact: true })).toBeVisible();
    await expect(page.getByText(ORDER.senderName, { exact: true })).toBeVisible();
  });

  test('blocks checkout until the sender email is present and valid', async ({ page, vouchers }) => {
    const checkoutRequests = recordRequests(page, '/api/checkout');
    await vouchers.goto();

    await vouchers.submit().click();
    expect(await validityOf(vouchers.senderEmail())).toMatchObject({ valueMissing: true, valid: false });

    await vouchers.senderEmail().fill('danielle-at-example');
    await vouchers.submit().click();
    expect(await validityOf(vouchers.senderEmail())).toMatchObject({ typeMismatch: true, valid: false });

    await page.evaluate(() => fetch('/api/packages').then((response) => response.status));
    expect(checkoutRequests).toHaveLength(0);
  });

  test('rejects a custom amount below ₪100 with an explanation', async ({ page, vouchers }) => {
    const checkoutRequests = recordRequests(page, '/api/checkout');
    await vouchers.goto();
    await vouchers.fill(ORDER);
    await vouchers.customAmount().fill('50');
    await expect(vouchers.submit()).toHaveText(ilsPattern(50));

    const dialogs: string[] = [];
    page.once('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await vouchers.submit().click();
    await expect.poll(() => dialogs).toEqual(['Please select or enter a valid voucher amount (min ₪100).']);

    await page.evaluate(() => fetch('/api/packages').then((response) => response.status));
    expect(checkoutRequests).toHaveLength(0);
  });

  test('explains that online payment is unavailable and keeps the order details', async ({ page, vouchers }) => {
    await vouchers.goto();
    await vouchers.fill(ORDER);

    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await vouchers.submit().click();
    const response = await checkoutResponse;
    expect(response.status()).toBe(503);
    expect(response.request().postDataJSON()).toMatchObject({ kind: 'voucher', amountIls: 890, ...ORDER });

    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE })).toBeVisible();
    await expect(vouchers.submit()).toBeEnabled();
    await expect(vouchers.recipientName()).toHaveValue(ORDER.recipientName);
    await expect(vouchers.recipientEmail()).toHaveValue(ORDER.recipientEmail);
    await expect(vouchers.senderName()).toHaveValue(ORDER.senderName);
    await expect(vouchers.senderEmail()).toHaveValue(ORDER.senderEmail);
  });

  test('accepts an order without the optional recipient email (E2E-2)', async ({ page, vouchers }) => {
    await vouchers.goto();
    await vouchers.fill({ ...ORDER, recipientEmail: '' });

    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await vouchers.submit().click();

    // With the field optional, the request reaches the payment gate like any complete order.
    expect((await checkoutResponse).status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE })).toBeVisible();
    await expect(page.getByText('Invalid request.')).toHaveCount(0);
  });
});
