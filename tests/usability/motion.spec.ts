import type { Page } from '@playwright/test';
import { expect } from '../support/e2e';
import { showPaidBoardingPass } from './support/boarding-pass';
import { test } from './support/fixtures';
import { afterNextPaint, gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

async function mockLiveGoogleReviews(page: Page) {
  await page.route('**/api/reviews', (route) =>
    route.fulfill({
      json: {
        overallRating: 4.8,
        totalReviewsCount: 3,
        directReviewsUrl: 'https://search.google.com/local/reviews?placeid=test',
        reviews: [
          { id: 'one', author: 'Ari', rating: 5, quote: 'An actual Google review.', relativeTime: 'a week ago', language: 'en' },
          { id: 'two', author: 'Maya', rating: 5, quote: 'A second actual Google review.', relativeTime: '2 weeks ago', language: 'en' },
          { id: 'three', author: 'Noam', rating: 4, quote: 'A third actual Google review.', relativeTime: 'a month ago', language: 'en' },
        ],
      },
    })
  );
}

/** Position status exposed by the live-data carousel. */
function reviewPosition(page: Page, current: number) {
  return page.getByText(`Review ${current} of 3`, { exact: true });
}

/** Infinite (looping) animations currently running on the page, described for failure messages. */
async function infiniteAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations === Infinity && animation.playState === 'running')
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const name = 'animationName' in animation ? String(animation.animationName) : 'animation';
        return `${name} on <${target?.tagName.toLowerCase()} class="${target?.getAttribute('class')?.slice(0, 50) ?? ''}">`;
      })
  );
}

test.describe('when the visitor requests reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('keeps the review carousel still', async ({ page }) => {
    await page.clock.install();
    await mockLiveGoogleReviews(page);
    await gotoSettled(page, '/');
    await expect(reviewPosition(page, 1)).toBeVisible();

    await page.clock.runFor(20_000);

    await expect(reviewPosition(page, 1)).toBeVisible();
  });

  test('stops looping decorative animations', async ({ page }) => {
    await gotoSettled(page, '/');

    expect(await infiniteAnimations(page)).toEqual([]);
  });

  test('does not fire celebration confetti on a confirmed boarding pass', async ({ page }) => {
    await showPaidBoardingPass(page);
    await afterNextPaint(page);

    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 2_000 });
  });
});

// Positive controls: prove the checks above can observe motion when it is allowed.
test.describe('when motion is allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('auto-rotates the review carousel', async ({ page }) => {
    await page.clock.install();
    await mockLiveGoogleReviews(page);
    await gotoSettled(page, '/');
    await expect(reviewPosition(page, 1)).toBeVisible();

    await page.clock.runFor(8_000);

    await expect(reviewPosition(page, 2)).toBeVisible();
  });

  test('celebrates a confirmed boarding pass with confetti', async ({ page }) => {
    await showPaidBoardingPass(page);

    await expect(page.locator('canvas')).toHaveCount(1);
  });
});
