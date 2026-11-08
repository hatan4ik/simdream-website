import AxeBuilder from '@axe-core/playwright';
import { expect, preferLanguage, preferTheme } from '../support/e2e';
import { test } from '../usability/support/fixtures';
import { freezeCssMotion, gotoSettled, isolateFromThirdParties } from '../usability/support/page';
import { WCAG_A_AA_TAGS } from './support/axe-baseline';
import { SCAN_THEMES } from './support/scan-keys';

// The public-route scans run without Google review data, so they never see the rating row or its
// dropdown. This scan mocks the review feed and holds that part of the utility bar to zero violations.
test.use({ reducedMotion: 'reduce', video: 'off' });

const FEED = {
  overallRating: 5,
  totalReviewsCount: 422,
  directReviewsUrl: 'https://search.google.com/local/reviews?placeid=test',
  reviews: [1, 2, 3].map((number) => ({
    id: `review-${number}`,
    author: `Reviewer ${number}`,
    rating: number === 3 ? 4 : 5,
    quote: `Google review number ${number}.`,
    relativeTime: 'a week ago',
    language: 'en',
  })),
};

for (const theme of SCAN_THEMES) {
  for (const language of ['en', 'he'] as const) {
    test(`Google rating row and dropdown have no WCAG A/AA violations (${theme}, ${language})`, async ({ page, baseURL }) => {
      await isolateFromThirdParties(page, baseURL);
      await page.route('**/api/reviews', (route) => route.fulfill({ json: FEED }));
      await preferTheme(page, theme);
      await preferLanguage(page, language);
      await gotoSettled(page, '/');

      const trigger = page.locator('[data-google-reviews-trigger]');
      await expect(trigger).toBeVisible();
      await freezeCssMotion(page);

      for (const open of [false, true]) {
        if (open) {
          await trigger.click();
          await expect(page.locator('[data-google-reviews-panel]')).toBeVisible();
        }
        const results = await new AxeBuilder({ page }).include('[data-site-utility-bar]').withTags(WCAG_A_AA_TAGS).analyze();
        expect(
          results.violations.map((violation) => ({ rule: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) })),
          `axe violations with the dropdown ${open ? 'open' : 'closed'}`
        ).toEqual([]);
      }
    });
  }
}
