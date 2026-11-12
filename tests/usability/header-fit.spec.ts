import { expect, LANGUAGES, preferLanguage } from '../support/e2e';
import { test } from './support/fixtures';
import { isolateFromThirdParties } from './support/page';

// The header carries the logo, four grouped desktop menu triggers, theme switch, language,
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
          expect(fit.desktopMenuTriggers).toBe(4);
          expect(fit.maxLinkLines).toBeLessThanOrEqual(1);
        } else {
          expect(fit.drawerToggle).toBe(true);
          expect(fit.desktopMenuTriggers).toBe(0);
        }
      });
    }
  });
}

// On phones and small tablets the top bar carries a short "Book" label (`nav.bookFlightShort`), the
// WhatsApp action, the language selector and the menu trigger. Russian once pushed the menu trigger
// out of view because its short label was the long word "Забронировать"; every language must now
// keep all four controls inside the screen, apart from each other and at least 44px tall.
const MIN_TAP_TARGET_PX = 44;

for (const width of [320, 360, 390, 430]) {
  test.describe(`phone header at ${width}px`, () => {
    // A touch device, so the coarse-pointer control floor applies as it does on a real phone.
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });

    for (const language of LANGUAGES) {
      test(`keeps Book, WhatsApp, language and menu visible without overflow (${language})`, async ({ page, baseURL }) => {
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, language);
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', language);
        await expect(page.locator('[data-site-utility-bar]')).toHaveAttribute('data-utility-language', language);

        const header = await page.evaluate(() => {
          const rectOf = (node: Element | null) => {
            if (!node) return null;
            const box = node.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) return null;
            return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
          };
          const visible = (selector: string) => {
            const node = [...document.querySelectorAll(selector)].find((candidate) => rectOf(candidate) !== null) ?? null;
            return { box: rectOf(node), node };
          };
          const book = visible('[data-site-navbar] a[href="/book"]');
          const whatsapp = visible('[data-whatsapp-action]');
          const navbar = document.querySelector('[data-site-navbar]')!;
          const utilityBar = document.querySelector('[data-site-utility-bar]')!;
          return {
            viewport: document.documentElement.clientWidth,
            pageOverflow: Math.max(
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
              document.body.scrollWidth - document.documentElement.clientWidth
            ),
            navbarOverflow: navbar.scrollWidth - navbar.clientWidth,
            utilityBarOverflow: utilityBar.scrollWidth - utilityBar.clientWidth,
            book: book.box,
            bookLabel: (book.node?.textContent ?? '').trim(),
            whatsapp: whatsapp.box,
            whatsappPlacement: whatsapp.node?.getAttribute('data-whatsapp-placement') ?? '',
            language: visible('[data-language-selector-trigger]').box,
            menu: visible('button[aria-controls="mobile-navigation"]').box,
          };
        });

        expect(header.navbarOverflow, 'navbar overflows horizontally').toBeLessThanOrEqual(0);
        expect(header.utilityBarOverflow, 'utility bar overflows horizontally').toBeLessThanOrEqual(0);
        expect(header.pageOverflow, 'page overflows horizontally').toBeLessThanOrEqual(0);
        const controls = { book: header.book, whatsapp: header.whatsapp, language: header.language, menu: header.menu };
        for (const [name, box] of Object.entries(controls)) {
          expect(box, `${name} is not visible`).not.toBeNull();
          expect(box!.left, `${name} starts left of the screen`).toBeGreaterThanOrEqual(0);
          expect(box!.right, `${name} ends right of the screen`).toBeLessThanOrEqual(header.viewport);
        }

        // Controls that share a row never overlap: Book, menu and (from 360px) WhatsApp in the navbar;
        // language and (below 360px) WhatsApp in the utility bar.
        const overlaps = (a: { left: number; right: number }, b: { left: number; right: number }) =>
          Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const navbarRow = [controls.book!, controls.menu!, ...(header.whatsappPlacement === 'navbar' ? [controls.whatsapp!] : [])];
        const utilityRow = [controls.language!, ...(header.whatsappPlacement === 'navbar' ? [] : [controls.whatsapp!])];
        for (const row of [navbarRow, utilityRow]) {
          for (let a = 0; a < row.length; a += 1) {
            for (let b = a + 1; b < row.length; b += 1) {
              expect(overlaps(row[a], row[b]), `header controls ${a} and ${b} overlap`).toBeLessThanOrEqual(0);
            }
          }
        }

        for (const [name, box] of Object.entries(controls)) {
          expect(box!.height, `${name} tap target height`).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
        }
        expect(controls.whatsapp!.width, 'WhatsApp tap target width').toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
        expect(controls.menu!.width, 'menu tap target width').toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
        // The compact label is the language's own short Book word.
        expect(header.bookLabel.length, 'Book label').toBeGreaterThan(0);
      });
    }
  });
}
