import { expect, test } from './fixtures';

test('home page renders the brand promise and a booking entry point', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Sim ?Dream/i);
  // Desktop and mobile render different booking links; at least one must be visible.
  await expect(page.locator('a[href^="/book"]').filter({ visible: true }).first()).toBeVisible();
});
