import { ADVENTURES, WORLD_ROUTES } from '@/lib/data/experience-routes';
import { preferLanguage } from '../support/e2e';
import { expect, test } from './fixtures';
import { follow } from './pages/hydration';

/**
 * Experience Flights ("טיסות חוויה") route catalog on /experiences#world-routes (AGENTS.md §2):
 * every World Trio and adventure renders, the region filter works, and an on-request route hands
 * over to the contact form with a localized prefill.
 */
test.describe('experience flights route catalog', () => {
  test('lists every World Trio and adventure with ICAO codes kept left-to-right', async ({ page }) => {
    await page.goto('/experiences');
    const section = page.locator('#world-routes');
    await expect(section.getByRole('heading', { level: 2, name: 'Routes, Sights & Adventures Around the World' })).toBeVisible();
    await expect(page.locator('[data-world-route]')).toHaveCount(WORLD_ROUTES.length);
    await expect(page.locator('[data-adventure]')).toHaveCount(ADVENTURES.length);
    // Bookable trios show the catalog price; on-request routes never show a price.
    await expect(page.locator('[data-route-status="bookable"]')).toHaveCount(WORLD_ROUTES.filter((route) => route.addonId).length);
    await expect(page.locator('[data-route-status="on_request"]').first()).not.toContainText('₪');
    const icao = page.locator('[data-world-route="route-extreme-airports"] [dir="ltr"]', { hasText: 'VQPR' });
    await expect(icao).toBeVisible();
  });

  test('filters the trios by region', async ({ page }) => {
    await page.goto('/experiences');
    await page.locator('#world-routes').getByRole('button', { name: 'Israel', exact: true }).click();
    await expect(page.locator('[data-world-route]')).toHaveCount(1);
    await expect(page.locator('[data-world-route="route-israel-home-skies"]')).toBeVisible();
    await page.locator('#world-routes').getByRole('button', { name: 'All regions' }).click();
    await expect(page.locator('[data-world-route]')).toHaveCount(WORLD_ROUTES.length);
  });

  test('carries a bookable trio into the order instead of opening an empty base flight', async ({ page }) => {
    await page.goto('/experiences');
    const card = page.locator('[data-world-route="route-classical-eu"]');

    await follow(
      card.getByRole('link', { name: 'Book a flight with this trio' }),
      /\/book\?package=captains-command-60&addons=addon-classical-eu&route=route-classical-eu$/
    );

    await expect(page.locator('[data-route-booking-intent]')).toContainText('Classical European Hubs');
    await expect(page.locator('[data-selected-addon="addon-classical-eu"]')).toBeVisible();
    await expect(page.locator('[data-addon-card="addon-classical-eu"]')).toHaveAttribute('data-addon-selected', 'true');
    await expect(page.locator('[data-addon-card="addon-xwind-ifr"]')).toHaveAttribute('data-addon-deemphasized', 'true');
  });

  test('hands an on-request route to the contact form, prefilled in the visitor language', async ({ page }) => {
    await preferLanguage(page, 'he');
    await page.goto('/experiences');
    const card = page.locator('[data-world-route="route-israel-home-skies"]');
    await expect(card).toContainText('שמי הבית: ישראל');
    await follow(card.getByRole('link'), /\/contact\?subject=route/);

    await expect(page).toHaveURL(/\/contact\?subject=route&route=route-israel-home-skies/);
    await expect(page.locator('#contact-subject')).toHaveValue('World Route or Adventure Request');
    await expect(page.locator('textarea').first()).toHaveValue(/שמי הבית: ישראל/);
  });
});
