import { devices } from '@playwright/test';
import { expect, PUBLIC_ROUTES } from '../support/e2e';
import { test } from './support/fixtures';
import { findUndersizedTargets, measureHorizontalOverflow } from './support/geometry';
import { freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

// Measurements of static layout: video adds encoding cost without adding signal.
test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

/** The mobile navbar cluster (theme, language, Book, menu) needs about 454px, so narrower phones clip it. */
const WIDTHS = [320, 375, 768, 1280] as const;

for (const width of WIDTHS) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} fits the viewport without horizontal overflow`, async ({ page }) => {
        await gotoSettled(page, route);
        await freezeCssMotion(page);

        const report = await measureHorizontalOverflow(page);
        expect(report).toEqual({ documentWidth: width, viewportWidth: width, offenders: [] });
      });
    }
  });
}

test.describe('touch targets on a phone (Pixel 7)', () => {
  const { defaultBrowserType: _browserType, ...pixel7 } = devices['Pixel 7'];
  test.use(pixel7);

  /** Routes with undersized targets today: review carousel dots on /, nested blueprint links on /book. */
  for (const route of PUBLIC_ROUTES) {
    test(`${route} keeps every visible target at least 24x24 CSS px or adequately spaced`, async ({ page }) => {
      await gotoSettled(page, route);
      await freezeCssMotion(page);

      expect(await findUndersizedTargets(page)).toEqual([]);
    });
  }
});
