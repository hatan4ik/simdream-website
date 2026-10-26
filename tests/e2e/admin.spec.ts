import { ADMIN_CREDENTIALS } from '../support/e2e';
import { ilsPattern } from './pages/format';
import { expect, test } from './fixtures';
import { follow, waitUntilInteractive } from './pages/hydration';

const SEED_VOUCHER = 'SD-VOUCH-DF7QK3MN8R2V6X9LPA';
const ADMIN_PAGES = ['/admin', '/admin/bookings', '/admin/vouchers', '/admin/workshops'] as const;

test.describe('admin area without credentials', () => {
  for (const path of ADMIN_PAGES) {
    test(`refuses ${path} with a Basic auth challenge`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(401);
      expect(response?.headers()['www-authenticate']).toMatch(/^Basic realm="Sim Dream Admin"/);
      await expect(page.getByRole('heading', { name: 'SIM DREAM DISPATCH COMMAND' })).toHaveCount(0);
    });
  }
});

test.describe('admin area with credentials', () => {
  test.use({ httpCredentials: ADMIN_CREDENTIALS });

  test('shows live KPIs and the dispatch manifest on the dispatch board', async ({ page, schedule }) => {
    const bookings = await schedule.adminBookings();
    // Arrive through the side navigation so the link is exercised too; full loads of /admin on a
    // later day than the build are covered by tests/usability/hydration.spec.ts (E2E-12).
    await page.goto('/admin/workshops');
    await follow(page.getByRole('link', { name: 'Dispatch Board', exact: true }), '/admin');

    await expect(page.getByRole('heading', { level: 1, name: 'SIM DREAM DISPATCH COMMAND' })).toBeVisible();
    const activeBookings = page.getByText('ACTIVE BOOKINGS').locator('xpath=ancestor::div[2]');
    await expect
      .poll(async () => Number((await activeBookings.textContent())?.match(/\d+/)?.[0] ?? 0))
      .toBeGreaterThan(0);

    const manifest = page.getByRole('heading', { level: 2, name: /^Flight Dispatch Manifest/ });
    await expect(manifest).toBeVisible();
    // The board defaults to tomorrow (UTC); every seeded day has flights, so references are listed.
    const firstReference = page.getByText(/^SD-737-[A-Z0-9]+$/).first();
    await expect(firstReference).toBeVisible();
    const reference = await firstReference.textContent();
    expect(bookings.map((booking) => booking.bookingReference)).toContain(reference);
  });

  test('lists bookings in the manifest and filters them by reference', async ({ page, schedule }) => {
    const [target] = (await schedule.adminBookings()).filter((booking) => booking.status === 'confirmed').slice(-1);
    expect(target, 'a confirmed booking exists').toBeDefined();
    await page.goto('/admin/bookings');

    await expect(page.getByRole('heading', { level: 1, name: 'Flight Manifest & Bookings' })).toBeVisible();
    const rows = page.getByRole('row');
    await expect.poll(() => rows.count()).toBeGreaterThan(2);

    const search = page.getByPlaceholder('Search by reference, pilot name, email...');
    await waitUntilInteractive(search);
    await search.fill(target.bookingReference);
    const matches = page.getByRole('row').filter({ hasText: target.bookingReference });
    // The header row plus the single match: every other booking is filtered out.
    await expect(rows).toHaveCount(2);
    await expect(matches).toHaveCount(1);
    await expect(matches).toContainText(target.pilotName);
    await expect(matches).toContainText(target.packageTitle);
  });

  test('verifies the seeded gift voucher at the voucher terminal without redeeming it', async ({ page, schedule }) => {
    const seeded = (await schedule.adminVouchers()).find((voucher) => voucher.code === SEED_VOUCHER);
    expect(seeded, 'the seeded voucher exists').toBeDefined();
    const patches: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PATCH') patches.push(request.url());
    });
    await page.goto('/admin/vouchers');
    await expect(page.getByRole('heading', { level: 1, name: 'Voucher Redemption Terminal' })).toBeVisible();
    await expect(page.getByRole('cell', { name: SEED_VOUCHER })).toBeVisible();

    const verify = page.getByRole('button', { name: 'Verify' });
    await waitUntilInteractive(verify);
    await page.getByPlaceholder('Scan or enter the full voucher code').fill(SEED_VOUCHER.toLowerCase());
    await verify.click();

    const card = page.getByText('REMAINING BALANCE').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await expect(card).toContainText(SEED_VOUCHER);
    // Other suites share this server, so the expected state comes from the live inventory.
    const active = seeded?.isRedeemed === false;
    await expect(card).toContainText(active ? 'Valid & Active' : 'Fully Redeemed');
    await expect(card).toContainText('David Ben-Ami');
    await expect(card).toContainText(ilsPattern(seeded?.currentBalanceIls ?? -1));
    await expect(page.getByRole('button', { name: 'Deduct & Redeem' })).toHaveCount(active ? 1 : 0);
    expect(patches).toEqual([]);
  });

  test('shows corporate leads in the CRM pipeline', async ({ page }) => {
    await page.goto('/admin/workshops');

    await expect(page.getByRole('heading', { level: 1, name: 'Corporate CRM Workshop Pipeline' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Wiz Cybersecurity' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Check Point Software' })).toBeVisible();
    await expect(page.getByText('No corporate inquiries received yet.')).toHaveCount(0);
  });

  test('moves between admin sections from the tab bar', async ({ page }) => {
    await page.goto('/admin/workshops');

    await follow(page.getByRole('link', { name: 'Voucher Terminal', exact: true }), '/admin/vouchers');
    await expect(page.getByRole('heading', { level: 1, name: 'Voucher Redemption Terminal' })).toBeVisible();
    await follow(page.getByRole('link', { name: 'Bookings Manifest', exact: true }), '/admin/bookings');
    await expect(page.getByRole('heading', { level: 1, name: 'Flight Manifest & Bookings' })).toBeVisible();
    await follow(page.getByRole('link', { name: 'Dispatch Board', exact: true }), '/admin');
    await expect(page.getByRole('heading', { level: 2, name: /^Flight Dispatch Manifest/ })).toBeVisible();
  });
});
