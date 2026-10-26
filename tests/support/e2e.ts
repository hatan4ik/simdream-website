import { test as base, expect, type Page } from '@playwright/test';
import { TEST_ADMIN } from './test-env';

export type Language = 'he' | 'en' | 'ru' | 'fr' | 'ar';
export type UiTheme = 'cockpit' | 'brand';

export const LANGUAGES: readonly Language[] = ['he', 'en', 'ru', 'fr', 'ar'];
export const RTL_LANGUAGES: readonly Language[] = ['he', 'ar'];

/** Use as Playwright `httpCredentials` to pass the interim admin Basic auth. */
export const ADMIN_CREDENTIALS = { username: TEST_ADMIN.user, password: TEST_ADMIN.password };

/** Public routes every quality suite should visit. Redirecting aliases are excluded. */
export const PUBLIC_ROUTES = [
  '/',
  '/pro',
  '/experiences',
  '/book',
  '/vouchers',
  '/workshops',
  '/contact',
  '/rules',
  '/privacy-policy',
  '/login',
] as const;

/**
 * Base test with an automatic guard: any uncaught exception thrown in the page
 * fails the test, so a journey cannot pass while the UI is silently broken.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'uncaught exceptions in the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Selects the UI language before any page script runs. */
export async function preferLanguage(page: Page, language: Language): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('simdream_lang', value), language);
}

/** Selects the cockpit (night) or brand (daylight) interface before any page script runs. */
export async function preferTheme(page: Page, theme: UiTheme): Promise<void> {
  await page.addInitScript((value) => window.localStorage.setItem('simdream_ui_theme', value), theme);
}

/** Aborts requests to any host other than the app under test, for deterministic rendering. */
export async function blockThirdPartyRequests(page: Page, baseURL: string): Promise<void> {
  const appOrigin = new URL(baseURL).origin;
  await page.route(
    (url) => url.origin !== appOrigin && url.protocol.startsWith('http'),
    (route) => route.abort('blockedbyclient')
  );
}

/** Next calendar date (YYYY-MM-DD, Israel time) falling on the given weekday (0 = Sunday). */
export function nextIsraelWeekday(weekday: number, from = new Date()): string {
  const israelToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(from);
  const date = new Date(`${israelToday}T12:00:00Z`);
  const offset = (weekday - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
