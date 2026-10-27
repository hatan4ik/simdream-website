import { existsSync } from 'node:fs';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { expect, preferLanguage, preferTheme, type Language, type UiTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { fixedSlotsResponse } from './support/slot-fixture';

/** Wednesday noon in Tel Aviv: inside opening hours, so the footer and calendars render a stable "open" day. */
const FROZEN_NOW = new Date('2026-11-04T12:00:00+02:00');

const PAGES = [
  { route: '/', name: 'home' },
  { route: '/about', name: 'about' },
  { route: '/pro', name: 'pro' },
  { route: '/book', name: 'book' },
  { route: '/vouchers', name: 'vouchers' },
] as const;
const THEMES: readonly UiTheme[] = ['cockpit', 'brand'];
const LANGUAGES: readonly Language[] = ['en', 'he'];
/** Two identical full-page captures of 5000px pages with blur filters can take a while on a busy CI box. */
const SCREENSHOT_TIMEOUT = 60_000;
/**
 * Captures are pixel-identical between runs once the page is deterministic, so allow only
 * anti-aliasing noise. The project-wide 1% ratio is tens of thousands of pixels on these
 * full-page captures: enough to hide a vanished navbar CTA (~5,200 pixels) or a recoloured h1 (~3,200).
 */
const MAX_DIFF_PIXELS = 100;

// Reduced motion stops the review carousel; masks below still hide it.
test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 120_000 });

async function prepareDeterministicPage(page: Page, baseURL: string | undefined, theme: UiTheme, language: Language) {
  await isolateFromThirdParties(page, baseURL);
  await page.clock.setFixedTime(FROZEN_NOW);
  await preferTheme(page, theme);
  await preferLanguage(page, language);
  await page.route(
    (url) => url.pathname === '/api/slots',
    (route) => {
      const url = new URL(route.request().url());
      return route.fulfill({
        json: fixedSlotsResponse(url.searchParams.get('date') ?? '', Number(url.searchParams.get('duration') ?? 60)),
      });
    }
  );
}

/** Regions whose content is live or clock-driven. */
function dynamicRegions(page: Page): Locator[] {
  return [
    // Live METAR / status bar rendered directly above the navbar.
    page.locator('nav').locator('xpath=preceding-sibling::div[1]'),
    // Google reviews rotator: the innermost section holding its "n / total" page buttons
    // (on / it is nested inside the "Why fly with us" section, which must stay visible).
    page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /\d+ \/ \d+$/ }) })
      .last(),
    // Calendar day buttons are clock-driven and masked in visual snapshots.
    page.getByRole('button', { name: /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} [A-Z][a-z]{2}$/ }),
    // Footer live opening status.
    page.locator('footer').getByText(/OPEN NOW|CURRENTLY CLOSED|פתוח כעת|סגור כעת/),
  ];
}

async function openForScreenshot(page: Page, route: string, theme: UiTheme, language: Language) {
  await gotoSettled(page, route);
  await expect(page.locator('html')).toHaveAttribute('data-ui', theme);
  await expectLanguageRendered(page, language);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Chromium re-shapes Hebrew text (different line breaks, ~60-140px taller pages) until the
  // first full-page capture resizes the viewport. One throwaway capture settles the layout,
  // so the comparison's consecutive screenshots match even on a slow machine.
  await page.screenshot({ fullPage: true, animations: 'disabled' });
}

/**
 * playwright.config.ts sets updateSnapshots: 'missing', which records a missing baseline and
 * passes. Here a missing baseline fails unless snapshots are being updated explicitly
 * (--update-snapshots), so a deleted or never-generated baseline cannot pass silently.
 */
function expectBaselineExists(testInfo: TestInfo, fileName: string): void {
  const recording = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed';
  const baseline = testInfo.snapshotPath(fileName, { kind: 'screenshot' });
  expect(
    recording || existsSync(baseline),
    `missing visual baseline ${baseline}; record it with --update-snapshots and review it`
  ).toBe(true);
}

async function expectMatchesBaseline(page: Page, testInfo: TestInfo, fileName: string): Promise<void> {
  expectBaselineExists(testInfo, fileName);
  await expect(page).toHaveScreenshot(fileName, {
    fullPage: true,
    mask: dynamicRegions(page),
    maxDiffPixels: MAX_DIFF_PIXELS,
    timeout: SCREENSHOT_TIMEOUT,
  });
}

for (const theme of THEMES) {
  for (const language of LANGUAGES) {
    test.describe(`${theme} theme, ${language}, 1280x800`, () => {
      for (const { route, name } of PAGES) {
        test(`${route} matches the visual baseline`, async ({ page, baseURL }, testInfo) => {
          await prepareDeterministicPage(page, baseURL, theme, language);
          await openForScreenshot(page, route, theme, language);

          await expectMatchesBaseline(page, testInfo, `${name}-${theme}-${language}.png`);
        });
      }
    });
  }
}

test.describe('mobile 390px, cockpit theme, en', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const { route, name } of PAGES.filter((candidate) => candidate.route === '/' || candidate.route === '/book')) {
    test(`${route} matches the mobile visual baseline`, async ({ page, baseURL }, testInfo) => {
      await prepareDeterministicPage(page, baseURL, 'cockpit', 'en');
      await openForScreenshot(page, route, 'cockpit', 'en');

      await expectMatchesBaseline(page, testInfo, `${name}-mobile-390.png`);
    });
  }
});
