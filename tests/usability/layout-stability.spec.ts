import { expect, PUBLIC_ROUTES } from '../support/e2e';
import { test } from './support/fixtures';
import { afterNextPaint, gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

/** Core Web Vitals "good" threshold for cumulative layout shift. */
const CLS_BUDGET = 0.1;

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
  // Sum every layout shift not caused by user input, from the very first paint.
  await page.addInitScript(() => {
    const record = window as unknown as { __layoutShift: number };
    record.__layoutShift = 0;
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) record.__layoutShift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
});

for (const route of PUBLIC_ROUTES) {
  test(`${route} keeps cumulative layout shift under ${CLS_BUDGET} while loading`, async ({ page }) => {
    await gotoSettled(page, route);
    await page.waitForLoadState('networkidle');
    await afterNextPaint(page);

    const shift = await page.evaluate(() => (window as unknown as { __layoutShift: number }).__layoutShift);
    expect(shift).toBeLessThan(CLS_BUDGET);
  });
}
