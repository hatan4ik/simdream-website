import type { Locator, Page } from '@playwright/test';
import { expect } from '../support/e2e';
import { GIFT_CARD_DESIGNS } from '../../lib/catalog/gift-card-designs';
import { test } from './support/fixtures';
import { gotoSettled, isolateFromThirdParties } from './support/page';

// The seven gift-card designs are shown whole: never cropped, stretched or pushed off the screen,
// on a 320px phone and on a wide desktop alike. A card that is cropped by the preview frame (the
// old behaviour cut the logo off the left card edge) or wider than the viewport fails here.
test.use({ reducedMotion: 'reduce', video: 'off' });

async function openMonetaryCard(page: Page, baseURL: string | undefined) {
  await isolateFromThirdParties(page, baseURL);
  await gotoSettled(page, '/vouchers');
  await page.getByRole('button', { name: /Flexible Monetary Gift Card/ }).click();
}

async function choose(page: Page, id: string): Promise<Locator> {
  await page.locator(`[data-gift-card-design="${id}"]`).click();
  const preview = page.locator(`[data-gift-card-design-preview="${id}"]`);
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth), { message: `${id} art loads` }).toBeGreaterThan(0);
  return preview;
}

async function expectShownWhole(page: Page, preview: Locator, id: string) {
  const geometry = await preview.evaluate((element) => {
    const image = element as HTMLImageElement;
    const box = image.getBoundingClientRect();
    return {
      x: box.x,
      right: box.right,
      width: box.width,
      height: box.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      objectFit: getComputedStyle(image).objectFit,
      transform: getComputedStyle(image).transform,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const viewportWidth = page.viewportSize()?.width ?? 0;

  // Natural proportions: rendered shape equals the file's shape (no stretch, no crop).
  expect(geometry.width / geometry.height, `${id} keeps its proportions`).toBeCloseTo(geometry.naturalWidth / geometry.naturalHeight, 1);
  expect(geometry.objectFit, `${id} is not cropped by object-fit`).not.toBe('cover');
  expect(geometry.transform, `${id} is not zoomed`).toBe('none');
  // Entirely on screen, with no sideways scrolling.
  expect(geometry.x, `${id} starts inside the screen`).toBeGreaterThanOrEqual(0);
  expect(geometry.right, `${id} ends inside the screen`).toBeLessThanOrEqual(viewportWidth + 0.5);
  expect(geometry.pageOverflow, 'page does not scroll sideways').toBe(0);
  // Large enough to read on a phone: the card uses most of the available width.
  if (viewportWidth <= 430) expect(geometry.width / viewportWidth, `${id} fills a phone screen`).toBeGreaterThan(0.8);

  // The panel never shifts sideways. The colour swatches once formed a strip wider than a phone
  // panel, and picking the last one scrolled the panel, dragging the card left and cutting its text.
  const panel = await preview.evaluate((element) => {
    const frame = element.closest('div.rounded-3xl') as HTMLElement;
    const frameBox = frame.getBoundingClientRect();
    const swatches = [...frame.querySelectorAll('[data-gift-card-design]')].map((swatch) => {
      const box = swatch.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    });
    return { scrollLeft: frame.scrollLeft, scrollWidth: frame.scrollWidth, clientWidth: frame.clientWidth, left: frameBox.left, right: frameBox.right, swatches };
  });
  expect(panel.scrollLeft, `${id}: the panel has not scrolled sideways`).toBe(0);
  expect(panel.scrollWidth, `${id}: nothing in the panel is wider than the panel`).toBeLessThanOrEqual(panel.clientWidth);
  expect(panel.swatches, 'all seven swatches are present').toHaveLength(7);
  for (const swatch of panel.swatches) {
    expect(swatch.left, 'a swatch starts inside the panel').toBeGreaterThanOrEqual(panel.left - 0.5);
    expect(swatch.right, 'a swatch ends inside the panel').toBeLessThanOrEqual(panel.right + 0.5);
    expect(swatch.width, 'a swatch is at least 44px wide to tap').toBeGreaterThanOrEqual(43.5);
    expect(swatch.height, 'a swatch is at least 44px tall to tap').toBeGreaterThanOrEqual(43.5);
  }
}

for (const [label, viewport] of [
  ['phone 390px', { width: 390, height: 844 }],
  ['desktop 1280px', { width: 1280, height: 800 }],
] as const) {
  test.describe(`gift-card preview on a ${label}`, () => {
    test.use({ viewport });

    for (const design of GIFT_CARD_DESIGNS) {
      test(`shows ${design.id} whole`, async ({ page, baseURL }) => {
        await openMonetaryCard(page, baseURL);
        await expectShownWhole(page, await choose(page, design.id), design.id);
      });
    }
  });
}

for (const width of [320, 768, 1920]) {
  test(`shows every design whole at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await openMonetaryCard(page, baseURL);
    for (const design of GIFT_CARD_DESIGNS) {
      await expectShownWhole(page, await choose(page, design.id), design.id);
    }
  });
}

test('keeps the card tagline visible instead of covering it with a caption', async ({ page, baseURL }) => {
  await openMonetaryCard(page, baseURL);
  const preview = await choose(page, 'pearl');
  const figure = preview.locator('xpath=ancestor::figure');
  // The design name is a screen-reader caption; nothing is drawn over the card.
  await expect(figure.locator('figcaption')).toHaveClass(/sr-only/);
  const caption = await figure.locator('figcaption').boundingBox();
  expect((caption?.width ?? 0) * (caption?.height ?? 0)).toBeLessThanOrEqual(1);
});
