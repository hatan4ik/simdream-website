import { expect, preferLanguage, type Language } from '../support/e2e';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

/** Delay React's deferred Suspense swap (`$RV` runs in `requestAnimationFrame`) the way a slow or busy device does. */
const RAF_DELAY_MS = 800;
/** How long the page is watched after its heading is visible, so the late swap has run. */
const WATCH_AFTER_SETTLE_MS = 2_500;

interface IdWatch {
  /** The highest number of elements that carried the same id at any sampled instant, per id. */
  maxById: Record<string, number>;
  /** Highest count of the anchor the page's own test uses (`#refunds` or `#cookies`). */
  samples: number;
}

/**
 * Samples `document` from the first mutation on: a MutationObserver (every DOM change, including the
 * streamed copy and the React commit) plus a timer, so a duplicate that lives for a single frame is
 * still seen. Streaming inserts `<div hidden id="S:n">` and a `<template id="B:n">`; their ids are
 * unique, so only a repeated id (the clause cards) is reported.
 */
async function watchDuplicateIds(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(
    ({ delay }) => {
      const originalFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback: FrameRequestCallback) =>
        window.setTimeout(() => originalFrame(callback), delay);

      const watch = { maxById: {} as Record<string, number>, samples: 0 };
      (window as unknown as { __idWatch: typeof watch }).__idWatch = watch;
      const sample = () => {
        watch.samples += 1;
        const counts: Record<string, number> = {};
        for (const element of Array.from(document.querySelectorAll('[id]'))) {
          counts[element.id] = (counts[element.id] ?? 0) + 1;
        }
        for (const [id, count] of Object.entries(counts)) {
          if (count > 1) watch.maxById[id] = Math.max(watch.maxById[id] ?? 0, count);
        }
      };
      new MutationObserver(sample).observe(document, { childList: true, subtree: true });
      window.setInterval(sample, 25);
    },
    { delay: RAF_DELAY_MS }
  );
}

const CASES: ReadonlyArray<{ route: string; language: Language }> = [
  { route: '/rules', language: 'he' },
  { route: '/privacy-policy', language: 'he' },
  { route: '/rules', language: 'en' },
  { route: '/privacy-policy', language: 'en' },
];

test.describe('legal pages never hold a duplicate element id while they load', () => {
  for (const { route, language } of CASES) {
    test(`${route} in ${language} with the Suspense swap delayed ${RAF_DELAY_MS} ms`, async ({ page }) => {
      await preferLanguage(page, language);
      await watchDuplicateIds(page);
      await gotoSettled(page, route);
      await page.waitForTimeout(RAF_DELAY_MS + WATCH_AFTER_SETTLE_MS);

      const watch = await page.evaluate(() => (window as unknown as { __idWatch: IdWatch }).__idWatch);
      expect(watch.samples, 'the watcher ran').toBeGreaterThan(10);
      expect(watch.maxById, `ids held by more than one element on ${route} in ${language}`).toEqual({});
      // Once everything has settled the anchor is a single element and no streamed leftover remains.
      const anchor = page.locator(route === '/rules' ? '#refunds' : '#cookies');
      await expect(anchor).toHaveCount(1);
      await expect(anchor).toBeVisible();
      await expect(page.locator('[hidden][id^="S:"], template[id^="B:"]')).toHaveCount(0);
    });
  }
});
