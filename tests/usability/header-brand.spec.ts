import { expect, LANGUAGES, preferLanguage } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

// The header shows the brand image alone: nothing is printed under or beside the logo in any
// language (AGENTS.md §1). The tagline survives elsewhere (footer, desktop flyout) on purpose.
test.use({ reducedMotion: 'reduce', video: 'off' });

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  test.describe(`header brand at ${viewport.name} width`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const language of LANGUAGES) {
      test(`shows the logo image with no tagline (${language})`, async ({ page, baseURL }) => {
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, language);
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', language);

        const brand = page.locator('[data-site-navbar] a[href="/"]').first();
        await expect(brand.getByRole('img', { name: 'SIM DREAM' })).toBeVisible();

        const shape = await brand.evaluate((link) => ({
          text: (link.textContent ?? '').trim(),
          children: [...link.children].map((child) => child.tagName),
          height: Math.round(link.getBoundingClientRect().height),
        }));
        expect(shape.text, 'no text beside or under the logo').toBe('');
        expect(shape.children, 'the logo image is the only content').toEqual(['IMG']);
        // A stacked tagline made this link ~47px tall; the lone 28px logo must stay below that.
        expect(shape.height).toBeLessThanOrEqual(32);
      });
    }
  });
}
