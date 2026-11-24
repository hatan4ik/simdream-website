import { readFileSync } from 'node:fs';
import { expect, test } from '../support/e2e';
import type { BlogPost } from '../../lib/data/blog-categories';
import { blogPostPath } from '../../lib/seo/site-routes';

// Playwright's ESM loader cannot import the JSON corpus through lib/data/blog-posts.ts, so read it directly.
const corpus = JSON.parse(
  readFileSync(new URL('../../lib/data/blog-posts.json', import.meta.url), 'utf8')
) as BlogPost[];
const post = [...corpus].sort((a, b) => b.datePublished.localeCompare(a.datePublished))[0]!;

// The shared test fixture saves the site language as English. Opening a Hebrew article directly then used to
// bounce the browser between the article and its English translation forever (2026-11-24): dozens of
// navigations in seconds and a back-button trap.
test.describe('blog article language sync', () => {
  test('opening a Hebrew article with English saved settles on the article and stops navigating', async ({ page }) => {
    const visited: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
    });

    await page.goto(blogPostPath(post.slug));
    await expect(page.getByRole('navigation', { name: 'נתיב ניווט' })).toBeVisible();
    // Give a loop time to show itself; a correct page is quiet after hydration.
    await page.waitForTimeout(3_000);

    // The looping page made 35 to 41 main-frame navigations in 3 s, alternating with the English translation.
    // A same-document update of the article's own URL is fine; leaving it for the translation is not.
    expect(visited.filter((path) => path !== blogPostPath(post.slug)), 'navigations away from the article').toEqual([]);
    expect(visited.length, 'main-frame navigations while the article sat open').toBeLessThanOrEqual(3);
    expect(new URL(page.url()).pathname).toBe(blogPostPath(post.slug));
    expect(await page.evaluate(() => window.history.length), 'history entries').toBeLessThanOrEqual(3);
    expect(await page.evaluate(() => window.localStorage.getItem('simdream_lang'))).toBe('he');
  });
});
