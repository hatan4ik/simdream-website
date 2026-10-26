import { expect, preferLanguage, preferTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { expectAxeBaseline } from './support/axe-baseline';
import { publicScanKey, PUBLIC_SCAN_LANGUAGES, SCAN_THEMES } from './support/scan-keys';

// Reduced motion stops the review carousel, so every scan sees the same reviews.
test.use({ reducedMotion: 'reduce', video: 'off' });
// Full-page axe runs are CPU-heavy; allow for a loaded CI machine.
test.describe.configure({ timeout: 120_000 });

for (const theme of SCAN_THEMES) {
  for (const { language, routes } of PUBLIC_SCAN_LANGUAGES) {
    test.describe(`public routes in the ${theme} theme (${language})`, () => {
      for (const route of routes) {
        test(`${route} has no new serious or critical WCAG A/AA violations`, async ({ page, baseURL }, testInfo) => {
          await isolateFromThirdParties(page, baseURL);
          await preferTheme(page, theme);
          await preferLanguage(page, language);
          await gotoSettled(page, route);
          await page.waitForLoadState('networkidle');

          // Guard the scan key: the scan must really run in the theme and language it is filed under.
          await expect(page.locator('html')).toHaveAttribute('data-ui', theme);
          await expectLanguageRendered(page, language);
          await expectAxeBaseline(page, testInfo, publicScanKey(route, theme, language));
        });
      }
    });
  }
}
