import { expect, LANGUAGES, preferLanguage } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

// The header carries the logo, three grouped desktop menu triggers, theme switch, language,
// login and booking action. Grouping restores quiet desktop navigation at 1280px without
// resurrecting the Russian/French overflow that made five inline links impractical.
test.use({ reducedMotion: 'reduce', video: 'off' });

const DESKTOP_MENUS_FROM_PX = 1280;

for (const width of [1024, 1280, 1536, 1920]) {
  test.describe(`header at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const language of LANGUAGES) {
      test(`fits on one row with a one-line Book button (${language})`, async ({ page, baseURL }) => {
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, language);
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', language);

        const nav = page.getByRole('navigation').first();
        const fit = await nav.evaluate((element) => {
          const shown = (node: Element | null) => !!node && node.getClientRects().length > 0;
          const textLines = (node: Element) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
          };
          const book = [...element.querySelectorAll('a[href="/book"]')].find(shown);
          const links = [...element.querySelectorAll('a')].filter(
            (link) => shown(link) && link.closest('[id="mobile-navigation"]') === null && !link.querySelector('img, button')
          );
          return {
            overflow: element.scrollWidth - element.clientWidth,
            bookLines: book ? textLines(book.querySelector('span') ?? book) : 0,
            drawerToggle: shown(element.querySelector('button[aria-controls="mobile-navigation"]')),
            maxLinkLines: links.length ? Math.max(...links.map(textLines)) : 0,
            inlineLinks: links.length,
            desktopMenuTriggers: [...element.querySelectorAll('[data-navbar-menu-trigger]')].filter(shown).length,
          };
        });

        expect(fit.overflow, 'header overflows horizontally').toBe(0);
        expect(fit.bookLines, '"Book a Flight" wraps').toBe(1);
        if (width >= DESKTOP_MENUS_FROM_PX) {
          expect(fit.drawerToggle).toBe(false);
          expect(fit.desktopMenuTriggers).toBe(3);
          expect(fit.maxLinkLines).toBeLessThanOrEqual(1);
        } else {
          expect(fit.drawerToggle).toBe(true);
          expect(fit.desktopMenuTriggers).toBe(0);
        }
      });
    }
  });
}
