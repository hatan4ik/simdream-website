import { test as base, expect, type Page } from '@playwright/test';
import { TEST_ADMIN } from './test-env';

export type Language = 'he' | 'en' | 'ru' | 'fr' | 'ar' | 'es';
export type UiTheme = 'cockpit' | 'brand' | 'studio';

export const LANGUAGES: readonly Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
export const RTL_LANGUAGES: readonly Language[] = ['he', 'ar'];

/** Use as Playwright `httpCredentials` to pass the interim admin Basic auth. */
export const ADMIN_CREDENTIALS = { username: TEST_ADMIN.user, password: TEST_ADMIN.password };

/** Public routes every quality suite should visit. Redirecting aliases are excluded. */
export const PUBLIC_ROUTES = [
  '/',
  '/pro',
  '/ground-school',
  '/fear-of-flying',
  '/experiences',
  '/subscriptions',
  '/offers',
  '/book',
  '/vouchers',
  '/workshops',
  '/contact',
  '/rules',
  '/privacy-policy',
  '/login',
] as const;

/**
 * On the WebKit engine only, a hard `page.goto()` can cancel Next's same-origin
 * RSC prefetches from the preceding page. WebKit reports those cancelled local
 * requests as `pageerror` events even though the destination renders normally.
 * Keep this exception deliberately narrow: only the Playwright loopback host,
 * a Next `_rsc` request and WebKit's exact cancellation wording are accepted.
 */
function isCancelledLocalRscPrefetch(message: string): boolean {
  return /^\/127\.0\.0\.1:\d+\/[^\s?]+\?_rsc=[^\s]+ due to access control checks\.$/.test(message);
}

/**
 * Base test with an automatic guard: any uncaught exception thrown in the page
 * fails the test, so a journey cannot pass while the UI is silently broken.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  // Most journey specs assert English copy. Make that test choice explicit
  // without changing the Israel-first production default; language-specific
  // journeys can still switch and verify their choice survives a reload.
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        if (!window.localStorage.getItem('simdream_lang')) {
          window.localStorage.setItem('simdream_lang', 'en');
        }
      } catch {
        /* sandboxed frame */
      }
    });
    await use(page);
  },
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        if (!isCancelledLocalRscPrefetch(error.message)) errors.push(error.message);
      });
      await use(errors);
      expect(errors, 'uncaught exceptions in the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Selects the UI language before any page script runs. */
export async function preferLanguage(page: Page, language: Language): Promise<void> {
  // Init scripts also run inside third-party iframes (the /contact map), where storage access is
  // denied and would surface as an uncaught page error.
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('simdream_lang', value);
    } catch {
      /* sandboxed frame */
    }
  }, language);
}

/** Selects the cockpit (night), brand (daylight) or studio interface before any page script runs. */
export async function preferTheme(page: Page, theme: UiTheme): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('simdream_ui_theme', value);
    } catch {
      /* sandboxed frame */
    }
  }, theme);
}

/**
 * Asserts the document carries the theme. Studio is layered on the daylight palette, so it shows
 * data-ui="brand" plus data-look="studio" (lib/theme/ui-theme-context.tsx).
 */
export async function expectThemeApplied(page: Page, theme: UiTheme): Promise<void> {
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-ui', theme === 'cockpit' ? 'cockpit' : 'brand');
  if (theme === 'studio') await expect(html).toHaveAttribute('data-look', 'studio');
  else await expect(html).not.toHaveAttribute('data-look', /./);
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
