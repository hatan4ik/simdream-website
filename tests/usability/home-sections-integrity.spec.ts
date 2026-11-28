import type { Page } from '@playwright/test';
import { expect, preferLanguage, preferTheme, type Language, type UiTheme } from '../support/e2e';
import { test } from './support/fixtures';
import { expectLanguageRendered, freezeCssMotion, gotoSettled, isolateFromThirdParties } from './support/page';

// Release 1.37.0 shipped the home page with visibly broken elements (found on staging, 2026-11-28):
// on the featured package a second label sat under the badge, the badge ran into the line beside it
// and the card was scaled out of the row; "MIN 60" chips read backwards on Hebrew pages; two Why Us
// cards showed gift-voucher artwork with transparent margins as if it were a cockpit photo, which
// left large holes in the cards beside them. These tests read the painted page in SimDream Day, the
// theme a first-time visitor gets.
test.use({ reducedMotion: 'reduce', video: 'off', viewport: { width: 1440, height: 900 } });

const PACKAGES = '[data-home-packages]';
const WHY_US = '[data-home-why-us]';
const LANGUAGES_CHECKED: readonly Language[] = ['he', 'en', 'ar', 'de'];

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface PackageCard extends Box {
  /** Every transform-like property: Tailwind's scale utilities set `scale`, not `transform`. */
  transforms: string[];
  badge: Box | null;
  eyebrow: Box | null;
  title: Box | null;
  /** Texts in the card's source that are an English-only stamp: "FLAGSHIP" or a bare "60 MIN" chip. */
  stamps: string[];
}

async function openHome(page: Page, baseURL: string | undefined, language: Language, theme: UiTheme = 'brand'): Promise<void> {
  await isolateFromThirdParties(page, baseURL);
  await preferTheme(page, theme);
  await preferLanguage(page, language);
  await gotoSettled(page, '/');
  await expectLanguageRendered(page, language);
  await freezeCssMotion(page);
}

async function readPackageCards(page: Page): Promise<PackageCard[]> {
  await page.locator(PACKAGES).scrollIntoViewIfNeeded();
  return page.locator(`${PACKAGES} [data-package-card]`).evaluateAll((cards) => {
    const box = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return rect.width === 0 && rect.height === 0 ? null : { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return cards.map((card) => ({
      ...(box(card) as { left: number; right: number; top: number; bottom: number }),
      transforms: [getComputedStyle(card).transform, getComputedStyle(card).scale, getComputedStyle(card).translate, getComputedStyle(card).rotate],
      badge: box(card.querySelector('[data-package-badge] > *')),
      eyebrow: box(card.querySelector('[data-package-eyebrow]')),
      title: box(card.querySelector('h3')),
      // Source text nodes, not painted text: a translated "45 Min. Cockpitzeit" that CSS prints in
      // capitals is copy, while an element holding only "Flagship" or "60 MIN" is a stamp.
      stamps: [...card.querySelectorAll('*')]
        .filter((element) => element.children.length === 0)
        .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter((text) => /^flagship$/i.test(text) || /^\d+ ?min\.?$/i.test(text)),
    }));
  });
}

const overlaps = (a: Box, b: Box) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
const near = (a: number, b: number) => Math.abs(a - b) <= 1.5;

test.describe('home packages: labels do not collide', () => {
  for (const language of LANGUAGES_CHECKED) {
    for (const width of [1440, 390]) {
      test(`${language} at ${width}px: each card's badge clears the duration line and the title`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        await openHome(page, baseURL, language);
        const cards = await readPackageCards(page);
        expect(cards).toHaveLength(3);
        for (const [index, card] of cards.entries()) {
          expect(card.eyebrow, `card ${index + 1} shows its duration line`).not.toBeNull();
          expect(card.title, `card ${index + 1} shows its title`).not.toBeNull();
          if (!card.badge || !card.eyebrow || !card.title) continue;
          expect(overlaps(card.badge, card.eyebrow), `card ${index + 1}: badge over the duration line`).toBe(false);
          expect(overlaps(card.badge, card.title), `card ${index + 1}: badge over the title`).toBe(false);
          expect(card.badge.left, `card ${index + 1}: badge inside the card`).toBeGreaterThanOrEqual(card.left);
          expect(card.badge.right, `card ${index + 1}: badge inside the card`).toBeLessThanOrEqual(card.right);
        }
        expect(cards.filter((card) => card.badge).length, 'cards with a badge').toBeGreaterThanOrEqual(1);
      });
    }
  }

  for (const language of LANGUAGES_CHECKED) {
    test(`${language}: no English-only label is stamped on a package card`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      const cards = await readPackageCards(page);
      expect(cards).toHaveLength(3);
      for (const card of cards) expect(card.stamps).toEqual([]);
    });
  }
});

test.describe('home packages: the three cards form one row', () => {
  for (const language of ['he', 'en', 'de'] as const) {
    for (const width of [1024, 1280, 1440]) {
      test(`${language} at ${width}px: level cards, level duration lines and titles, none scaled`, async ({ page, baseURL }) => {
        await page.setViewportSize({ width, height: 900 });
        await openHome(page, baseURL, language);
        const cards = await readPackageCards(page);
        expect(cards).toHaveLength(3);
        for (const [index, card] of cards.entries()) {
          const label = `card ${index + 1}`;
          expect(card.transforms.filter((value) => value !== 'none' && value !== 'matrix(1, 0, 0, 1, 0, 0)'), `${label} is not scaled or moved`).toEqual([]);
          expect(near(card.top, cards[0].top), `${label}: tops level`).toBe(true);
          expect(near(card.bottom, cards[0].bottom), `${label}: bottoms level`).toBe(true);
          expect(near(card.right - card.left, cards[0].right - cards[0].left), `${label}: equal widths`).toBe(true);
          // A badge that wraps, or a card without one, must not push that card's text out of line.
          expect(card.eyebrow, `${label} shows its duration line`).not.toBeNull();
          expect(card.title, `${label} shows its title`).not.toBeNull();
          expect(near(card.eyebrow?.top ?? Number.NaN, cards[0].eyebrow?.top ?? Number.NaN), `${label}: duration line level with the first card`).toBe(true);
          expect(near(card.title?.top ?? Number.NaN, cards[0].title?.top ?? Number.NaN), `${label}: title level with the first card`).toBe(true);
        }
      });
    }
  }
});

test.describe('home why us: five cards of one kind', () => {
  for (const language of ['he', 'en'] as const) {
    test(`${language}: no voucher artwork stands in for a photo and no card has a hole`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      await page.locator(WHY_US).scrollIntoViewIfNeeded();
      // The five cards are text cards. A picture in one card of a row makes that card a different kind
      // and stretches its neighbours; gift-voucher designs in particular belong to the voucher flow
      // (lib/catalog/gift-card-designs.ts). Icons are inline SVG and are not counted.
      await expect(page.locator(`${WHY_US} [data-why-card] :is(img, picture, video)`)).toHaveCount(0);
      await expect(page.locator(`${WHY_US} img[src*="/gift-cards/"]`)).toHaveCount(0);
      const gaps = await page.locator(`${WHY_US} [data-why-card]`).evaluateAll((cards) =>
        cards.map((card) => {
          const list = card.querySelector('ul');
          const lastText = list?.previousElementSibling?.lastElementChild;
          return list && lastText ? list.getBoundingClientRect().top - lastText.getBoundingClientRect().bottom : null;
        })
      );
      expect(gaps).toHaveLength(5);
      for (const [index, gap] of gaps.entries()) {
        expect(gap, `card ${index + 1} has its text and its list`).not.toBeNull();
        // Cards in a row stretch to the tallest; the spare height may differ by a few lines of copy, not by a picture.
        expect(gap ?? 0, `card ${index + 1}: blank space between the text and the list`).toBeLessThanOrEqual(120);
      }
    });
  }
});
