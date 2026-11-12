import type { Locator, Page } from '@playwright/test';
import { CONSENT_COPY } from '../../components/consent/consent-copy';
import { CONSENT_LINK_LABEL } from '../../components/consent/link-label';
import { activate } from '../e2e/pages/hydration';
import { expect, LANGUAGES, preferLanguage, RTL_LANGUAGES } from '../support/e2e';
import { test } from './support/fixtures';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from './support/page';

/**
 * Phones have no footer, so the "Cookie settings" entry lives in the drawer's "About" group
 * (components/layout/navbar/MobileAboutGroup.tsx). It must be reachable, a 44px target that reads like its
 * sibling links, close the drawer, open the consent dialog and give focus back to the drawer's trigger
 * when the dialog closes, in every language and in both directions.
 */
test.use({ reducedMotion: 'reduce', video: 'off', hasTouch: true, isMobile: true });
test.describe.configure({ timeout: 90_000 });

const MIN_TAP_TARGET_PX = 44;

const drawer = (page: Page): Locator => page.locator('#mobile-navigation');
const drawerTrigger = (page: Page): Locator => page.locator('[data-mobile-menu-trigger]');
const cookieEntry = (page: Page): Locator => drawer(page).locator('[data-consent-settings-link]');

async function openAboutGroup(page: Page): Promise<void> {
  await activate(drawerTrigger(page), 'tap');
  await expect(drawer(page)).toBeVisible();
  const group = drawer(page).locator('details');
  if (!(await group.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await group.locator('summary').tap();
  }
  await expect(cookieEntry(page)).toBeVisible();
}

for (const width of [360, 390]) {
  test.describe(`phone menu cookie settings at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const language of LANGUAGES) {
      test(`is reachable, matches its sibling links and opens the dialog (${language})`, async ({ page, baseURL }) => {
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, language);
        await gotoSettled(page, '/');
        await expectLanguageRendered(page, language);
        await openAboutGroup(page);

        const entry = cookieEntry(page);
        await expect(entry).toHaveText(CONSENT_LINK_LABEL[language]);

        // Geometry: the last entry of the group, the same box as the privacy-policy link above it, 44px tall,
        // inside the screen, with its label on the reading-start side.
        const sibling = drawer(page).locator('details a[href="/privacy-policy"]');
        const [entryBox, siblingBox] = [await entry.boundingBox(), await sibling.boundingBox()];
        expect(entryBox && siblingBox).toBeTruthy();
        expect(entryBox?.height ?? 0).toBeGreaterThanOrEqual(MIN_TAP_TARGET_PX);
        expect(entryBox?.x).toBeCloseTo(siblingBox?.x ?? -1, 0);
        expect(entryBox?.width).toBeCloseTo(siblingBox?.width ?? -1, 0);
        expect(entryBox?.y ?? 0).toBeGreaterThan((siblingBox?.y ?? 0) + (siblingBox?.height ?? 0) - 1);
        expect((entryBox?.x ?? -1) >= 0 && (entryBox?.x ?? 0) + (entryBox?.width ?? 0) <= width).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const textStart = await page.evaluate(() => {
          // The gap between the entry's reading-start edge (left in LTR, right in RTL) and its label.
          const startGap = (node: Element) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            const label = range.getBoundingClientRect();
            const box = node.getBoundingClientRect();
            return getComputedStyle(node).direction === 'rtl' ? box.right - label.right : label.left - box.left;
          };
          const button = document.querySelector('#mobile-navigation [data-consent-settings-link]');
          const link = document.querySelector('#mobile-navigation details a[href="/privacy-policy"]');
          return button && link ? { button: startGap(button), link: startGap(link) } : null;
        });
        expect(textStart).not.toBeNull();
        // The label starts where the sibling's label starts, to the pixel.
        expect(textStart?.button).toBeCloseTo(textStart?.link ?? -1, 0);
        const direction = await entry.evaluate((element) => getComputedStyle(element).direction);
        expect(direction).toBe(RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr');

        // Activation: the drawer closes and the dialog opens, named in the page language.
        await entry.tap();
        await expect(drawer(page)).toHaveCount(0);
        await expect(drawerTrigger(page)).toHaveAttribute('aria-expanded', 'false');
        const dialog = page.getByRole('dialog', { name: CONSENT_COPY[language].dialogTitle });
        await expect(dialog).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[data-consent-dialog]'))), { message: 'focus moves into the dialog' })
          .toBe(true);

        // Closing the dialog returns focus to the drawer's trigger, where the visitor came from.
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-consent-dialog]')).toHaveCount(0);
        await expect(drawerTrigger(page)).toBeFocused();
        await expect(drawer(page)).toHaveCount(0);
      });
    }
  });
}

test.describe('phone menu cookie settings by keyboard', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Enter on the entry closes the drawer, opens the dialog and Escape returns focus to the trigger', async ({ page, baseURL }) => {
    await isolateFromThirdParties(page, baseURL);
    await gotoSettled(page, '/');
    await openAboutGroup(page);

    await cookieEntry(page).focus();
    await page.keyboard.press('Enter');
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
    // Tab stays inside the dialog (the drawer's controls are gone and the page behind is not reachable).
    for (let presses = 0; presses < 8; presses += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-consent-dialog]')))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-consent-dialog]')).toHaveCount(0);
    await expect(drawerTrigger(page)).toBeFocused();
  });

  test('Space works too, and the entry can be reopened after the dialog closed', async ({ page, baseURL }) => {
    await isolateFromThirdParties(page, baseURL);
    await gotoSettled(page, '/');
    await openAboutGroup(page);
    await cookieEntry(page).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-consent-dialog]')).toHaveCount(0);

    await openAboutGroup(page);
    await cookieEntry(page).tap();
    await expect(page.getByRole('dialog', { name: CONSENT_COPY.en.dialogTitle })).toBeVisible();
  });
});
