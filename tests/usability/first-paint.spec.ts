import type { Page } from '@playwright/test';
import { expect, preferLanguage } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

test.use({ video: 'off' });
test.describe.configure({ timeout: 60_000 });

/**
 * The client bundle is blocked in every test here, so React never hydrates: what is on screen is exactly
 * what the server HTML and the inline bootstrap produce. That isolates the first-paint contract from
 * machine load. A first-time or Hebrew visitor must see the server HTML without waiting for hydration; only
 * a returning visitor whose saved language differs from the server's Hebrew has the hand-over hidden
 * (lib/i18n/language-bootstrap.ts), and a broken bundle still reveals the page after the 3 s fail-safe.
 *
 * The state is read once, synchronously, at DOMContentLoaded. Never assert it with a retrying
 * `expect(...).not.toHaveAttribute(...)`: that would simply wait out the 3 s fail-safe and pass.
 */
test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
});

const firstPaintState = (page: Page) =>
  page.evaluate(() => ({
    pending: document.documentElement.getAttribute('data-language-pending'),
    bodyVisibility: getComputedStyle(document.body).visibility,
    heading: document.querySelector('h1')?.textContent?.trim() ?? '',
  }));

test('a first-time visitor sees the server HTML without waiting for hydration', async ({ page }) => {
  // The shared fixture seeds an English choice for journey specs; a real first-time visitor has none.
  await page.addInitScript(() => window.localStorage.removeItem('simdream_lang'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const state = await firstPaintState(page);
  expect(state.pending).toBeNull();
  expect(state.bodyVisibility).toBe('visible');
  expect(state.heading.length).toBeGreaterThan(0);
});

test('a Hebrew visitor sees the server HTML without waiting for hydration', async ({ page }) => {
  await preferLanguage(page, 'he');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const state = await firstPaintState(page);
  expect(state.pending).toBeNull();
  expect(state.bodyVisibility).toBe('visible');
});

test('a returning visitor with another saved language has the hand-over hidden, and a broken bundle still reveals the page', async ({
  page,
}) => {
  await preferLanguage(page, 'en');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const hidden = await firstPaintState(page);
  expect(hidden.pending).toBe('true');
  expect(hidden.bodyVisibility).toBe('hidden');

  // The 3 s fail-safe: without a client bundle the Hebrew server HTML is shown rather than a blank page.
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-language-pending'), null, {
    timeout: 8_000,
  });
  expect((await firstPaintState(page)).bodyVisibility).toBe('visible');
});

test('a visitor on a routed locale URL gets that language from the server and is never hidden', async ({ page }) => {
  await preferLanguage(page, 'ru');
  await page.goto('/en', { waitUntil: 'domcontentloaded' });

  const state = await firstPaintState(page);
  expect(state.pending).toBeNull();
  expect(state.bodyVisibility).toBe('visible');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
