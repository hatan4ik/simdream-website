import { expect, preferTheme } from '../support/e2e';
import { waitUntilInteractive } from '../e2e/pages/hydration';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';
import { openStorefrontView } from './support/booking';

test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await preferTheme(page, 'studio');
});

test('opens the desktop flyout with the keyboard and restores focus on Escape', async ({ page }) => {
  await gotoSettled(page, '/');
  const trigger = page.locator('[data-navbar-menu-trigger]').first();
  await waitUntilInteractive(trigger);
  await trigger.focus();
  await page.keyboard.press('ArrowDown');

  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem') });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('treats the language selector as a keyboard-accessible choice list', async ({ page }) => {
  await gotoSettled(page, '/');
  const trigger = page.locator('[data-language-selector-trigger]').first();
  await waitUntilInteractive(trigger);
  await trigger.focus();
  await page.keyboard.press('ArrowDown');

  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option', { name: 'English' })).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(listbox.getByRole('option', { name: 'עברית' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('uses Apple-like actions without turning booking cards into pills', async ({ page }) => {
  await gotoSettled(page, '/book');
  await openStorefrontView(page);
  const primary = page.locator('a[href="/book"][data-ui-control="button"]').first();
  const packageCard = page.locator('[data-booking-package-card]').first();
  const detailAction = page.locator('[data-package-details-trigger]').first();

  await expect(primary).toBeVisible();
  await expect(packageCard).toBeVisible();
  const geometry = await page.evaluate(() => {
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    return {
      primaryRadius: style('a[href="/book"][data-ui-control="button"]').borderTopLeftRadius,
      cardRadius: style('[data-booking-package-card]').borderTopLeftRadius,
      detailsRadius: style('[data-package-details-trigger]').borderTopLeftRadius,
      studioHeaderHeight: getComputedStyle(document.querySelector('[data-site-navbar-row]')!).height,
    };
  });

  expect(geometry).toEqual({
    primaryRadius: '980px',
    cardRadius: '18px',
    detailsRadius: '12px',
    studioHeaderHeight: '48px',
  });
  await expect(detailAction).toBeVisible();
});
