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
  test('starts with empty names, labels the preview as a sample, and will not submit sample names', async ({ page, vouchers }) => {
    await vouchers.goto();
    await expect(vouchers.recipientName()).toHaveValue('');
    await expect(vouchers.senderName()).toHaveValue('');
    const sample = page.locator('[data-voucher-preview-sample]').first();
    await expect(sample).toBeVisible();
    await expect(sample).toContainText(/sample/i);

    // Browser validation blocks the empty required fields before any request is made.
    const checkoutRequests = recordRequests(page, '/api/checkout');
    await page.locator('form button[type="submit"]').first().click();
    expect(await vouchers.recipientName().evaluate((element) => (element as HTMLInputElement).validity.valueMissing)).toBe(true);
    expect(checkoutRequests).toHaveLength(0);

    await vouchers.recipientName().fill(ORDER.recipientName);
    await vouchers.senderName().fill(ORDER.senderName);
    await expect(page.locator('[data-voucher-preview-sample]')).toHaveCount(0);
  });

  test('updates the live boarding-pass preview as the buyer personalises the voucher', async ({ page, vouchers }) => {
    await vouchers.goto();

    await vouchers.tier(/90-Min Ultimate Aviator/).click();
    await vouchers.recipientName().fill(ORDER.recipientName);
    await vouchers.senderName().fill(ORDER.senderName);

    await expect(vouchers.submit()).toHaveText(ilsPattern(950));
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

  test('explains that online payment is unavailable and keeps the order details', async ({ page, vouchers }) => {
    await vouchers.goto();
    await vouchers.fill(ORDER);

    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await vouchers.submit().click();
    const response = await checkoutResponse;
    expect(response.status()).toBe(503);
    expect(response.request().postDataJSON()).toMatchObject({ kind: 'voucher', amountIls: 690, packageId: 'pkg-captain-60', ...ORDER });

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

  test('keeps named, priced flight certificates and defaults flexible gift cards to ₪100 (Ivory)', async ({ page, vouchers }) => {
    await vouchers.goto();

    // Certificate mode remains a package purchase: every service name is paired with its package price.
    await expect(page.getByText('OFFICIAL SIM DREAM GIFT VOUCHER')).toBeVisible();
    for (const { service, amount } of [
      { service: /30-Min Discovery Flight/, amount: 450 },
      { service: /60-Min Captain's Command/, amount: 690 },
      { service: /90-Min Ultimate Aviator/, amount: 950 },
      { service: /120-Min Pro Pilot Prep/, amount: 1590 },
    ]) {
      await expect(vouchers.tier(service)).toContainText(ilsPattern(amount));
    }

    // Certificate mode is active by default and allows hiding the price on the recipient boarding pass.
    const hidePriceToggle = page.getByRole('button', {
      name: /Hide ₪ price on recipient Boarding Pass Certificate/,
    });
    await hidePriceToggle.click();
    await expect(page.getByText('PRE-PAID CAPTAIN MISSION')).toBeVisible();

    // Flexible money cards have their own intentional denomination ladder, defaulting to ₪100.
    await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();
    await expect(page.getByText('SIM DREAM FLIGHT DECK GIFT CARD')).toBeVisible();
    const giftCardPresets = page.locator('[data-gift-card-presets]');
    await expect(giftCardPresets.getByRole('button', { name: ilsPattern(100) })).toHaveAttribute('aria-pressed', 'true');
    for (const amount of [50, 100, 200, 300, 500, 700, 1000]) {
      await expect(giftCardPresets.getByRole('button', { name: ilsPattern(amount) })).toBeVisible();
    }
    await expect(giftCardPresets.getByRole('button', { name: ilsPattern(250) })).toHaveCount(0);
    await expect(giftCardPresets.getByRole('button', { name: ilsPattern(750) })).toHaveCount(0);
    await expect(vouchers.submit()).toHaveText(ilsPattern(100));

    await giftCardPresets.getByRole('button', { name: ilsPattern(500) }).click();
    await expect(vouchers.submit()).toHaveText(ilsPattern(500));
    await expect(page.locator('[data-gift-card-design-preview="sunset"]')).toBeVisible();
  });

  test('uses the selected Apple-style card colour in the preview and secure checkout request', async ({ page, vouchers }) => {
    await vouchers.goto();
    await vouchers.fill(ORDER);
    await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();

    const colour = page.getByRole('radio', { name: 'Choose card colour: Aurora' });
    await colour.click();
    await expect(colour).toHaveAttribute('aria-checked', 'true');
    const preview = page.locator('[data-gift-card-design-preview="aurora"]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', /aurora\.webp/);

    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await vouchers.submit().click();
    const response = await checkoutResponse;
    expect(response.request().postDataJSON()).toMatchObject({
      kind: 'voucher',
      giftCardDesignId: 'aurora',
      amountIls: 300,
      ...ORDER,
    });
  });

  test('links every card colour to one balance: the colour, the credit and the quick-select chip move together', async ({ page, vouchers }) => {
    await vouchers.goto();
    await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();
    const presets = page.locator('[data-gift-card-presets]');
    const credit = page.locator('[data-gift-card-credit]');

    // Clicking a colour sets the credit, the checkout total and the highlighted chip.
    for (const [colour, amount] of [
      ['Skyline Blue', 50],
      ['Ivory', 100],
      ['Moonlight', 200],
      ['Aurora', 300],
      ['Sunset Copper', 500],
      ['Dusk Gold', 700],
      ['Pearl', 1000],
    ] as const) {
      const swatch = page.getByRole('radio', { name: `Choose card colour: ${colour}` });
      await swatch.click();
      await expect(swatch).toHaveAttribute('aria-checked', 'true');
      await expect(credit).toHaveText(ilsPattern(amount));
      await expect(vouchers.submit()).toHaveText(ilsPattern(amount));
      const chosen = presets.getByRole('button', { pressed: true });
      await expect(chosen).toHaveCount(1);
      await expect(chosen).toHaveText(ilsPattern(amount));
    }

    // Choosing a chip shows its colour; choosing a colour shows its chip.
    await presets.getByRole('button', { name: ilsPattern(300) }).click();
    await expect(page.getByRole('radio', { name: 'Choose card colour: Aurora' })).toHaveAttribute('aria-checked', 'true');
    await expect(credit).toHaveText(ilsPattern(300));
    await page.getByRole('radio', { name: 'Choose card colour: Moonlight' }).click();
    await expect(credit).toHaveText(ilsPattern(200));

    // ₪200 is the one chip marked Popular.
    await expect(page.locator('[data-gift-card-popular]')).toHaveCount(1);
    await expect(presets.getByRole('button', { name: ilsPattern(200) }).locator('[data-gift-card-popular]')).toHaveText('Popular');
  });

  test('swaps the package value picker for a quick-select balance step in Gift Card mode', async ({ page, vouchers }) => {
    await vouchers.goto();
    const valueTitle = page.getByRole('heading', { level: 2, name: '1. Select Gift Voucher Value' });
    const certificateDetails = page.getByRole('heading', { level: 2, name: '2. Personalize Voucher Details' });
    await expect(valueTitle).toBeVisible();
    await expect(certificateDetails).toBeVisible();

    await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();
    await expect(valueTitle).toHaveCount(0);
    await expect(certificateDetails).toHaveCount(0);
    await expect(vouchers.tier(/90-Min Ultimate Aviator/)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Quick-Select Gift Card Credit Balance' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Personalized Gift Card Details' })).toBeVisible();

    // Back to the certificate: the package picker and its titles return untouched.
    await page.getByRole('button', { name: /Flight Experience Gift Certificate/ }).click();
    await expect(valueTitle).toBeVisible();
    await expect(certificateDetails).toBeVisible();
    await expect(vouchers.tier(/90-Min Ultimate Aviator/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Personalized Gift Card Details' })).toHaveCount(0);
  });

  test('offers no custom amount: the chosen preset balance is what the server receives', async ({ page, vouchers }) => {
    await vouchers.goto();
    await vouchers.fill(ORDER);
    await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();

    // No typed-amount control exists in either format.
    await expect(page.locator('#voucher-custom-amount')).toHaveCount(0);
    await expect(page.locator('input[type="number"]')).toHaveCount(0);

    const presets = page.locator('[data-gift-card-presets]');
    await presets.getByRole('button', { name: ilsPattern(300) }).click();
    await expect(vouchers.submit()).toHaveText(ilsPattern(300));
    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await vouchers.submit().click();
    const body = (await checkoutResponse).request().postDataJSON();
    expect(body).toMatchObject({ kind: 'voucher', amountIls: 300, giftCardDesignId: 'aurora', ...ORDER });
    expect(body).not.toHaveProperty('packageId');
  });
});
