import { expect } from '../support/e2e';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'no-preference', video: 'off' });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  await page.route('**/api/reviews', (route) =>
    route.fulfill({
      json: {
        overallRating: 4.9,
        totalReviewsCount: 127,
        directReviewsUrl: 'https://search.google.com/local/reviews?placeid=test',
        reviews: [
          { id: 'one', author: 'Ari', rating: 5, quote: 'An actual first Google review.', relativeTime: 'a week ago', language: 'en' },
          { id: 'two', author: 'Maya', rating: 5, quote: 'A current second Google review.', relativeTime: '2 weeks ago', language: 'en' },
          { id: 'three', author: 'Noam', rating: 4, quote: 'A third Google review.', relativeTime: 'a month ago', language: 'en' },
        ],
      },
    })
  );
});

test('rotates the verified Google review every two seconds and expands the supplied review list', async ({ page }) => {
  await page.clock.install();
  await gotoSettled(page, '/');

  const trigger = page.getByRole('button', { name: 'Show recent Google reviews' });
  await expect(trigger).toContainText('Google');
  await expect(trigger).toContainText('4.9');
  await expect(trigger).toContainText('(127)');
  await expect(trigger).toContainText('An actual first Google review.');

  await page.clock.runFor(2_000);
  await expect(trigger).toContainText('A current second Google review.');

  await trigger.click();
  await expect(page.locator('[data-google-reviews-trigger]')).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('[data-google-reviews-panel]');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('article')).toHaveCount(3);
  await expect(panel.getByRole('link', { name: 'Read all reviews on Google' })).toHaveAttribute('target', '_blank');

  await panel.getByRole('button', { name: 'Close Google reviews' }).click();
  await expect(panel).toBeHidden();
});
