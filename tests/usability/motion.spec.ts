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

  test('celebrates a confirmed boarding pass with confetti', async ({ page }) => {
    await showPaidBoardingPass(page);

    await expect(page.locator('canvas')).toHaveCount(1);
  });
});
