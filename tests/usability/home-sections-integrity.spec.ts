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
  transform: string;
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
      transform: getComputedStyle(card).transform,
      badge: box(card.querySelector('[data-package-badge] > *')),
      eyebrow: box(card.querySelector('[data-package-eyebrow]')),
      title: box(card.querySelector('h3')),
      // Source text, not painted text: a translated "Min." that CSS prints in capitals is not a stamp.
      stamps: [...card.querySelectorAll('span')]
        .map((span) => (span.textContent ?? '').trim())
        .filter((text) => text === 'FLAGSHIP' || /^\d+\s+MIN$/.test(text)),
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
  for (const language of ['he', 'en'] as const) {
    test(`${language}: same top, same height, same width, none scaled`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      const cards = await readPackageCards(page);
      expect(cards).toHaveLength(3);
      for (const card of cards) {
        expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'], 'no card is scaled out of the grid').toContain(card.transform);
        expect(near(card.top, cards[0].top), 'tops level').toBe(true);
        expect(near(card.bottom, cards[0].bottom), 'bottoms level').toBe(true);
        expect(near(card.right - card.left, cards[0].right - cards[0].left), 'equal widths').toBe(true);
      }
    });
  }
});

test.describe('home why us: five cards of one kind', () => {
  for (const language of ['he', 'en'] as const) {
    test(`${language}: no voucher artwork stands in for a photo and no card has a hole`, async ({ page, baseURL }) => {
      await openHome(page, baseURL, language);
      await page.locator(WHY_US).scrollIntoViewIfNeeded();
      // Gift-voucher designs belong to the voucher flow (lib/catalog/gift-card-designs.ts).
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
