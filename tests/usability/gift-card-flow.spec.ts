import type { Locator, Page } from '@playwright/test';
import { translations } from '../../lib/i18n/translations';
import { expect, preferLanguage, type Language } from '../support/e2e';
import { test } from './support/fixtures';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from './support/page';

// /vouchers has two formats. A flight certificate picks a named package value (step 1) and then
// personalises the voucher (step 2). A flexible Gift Card has no package value to pick: it goes
// straight to a quick-select credit balance (step 1) and the "Personalized Gift Card Details" (step 2).
// The checkout action is the site's primary pill (components/ui/Button.tsx), never a bespoke button.
test.use({ reducedMotion: 'reduce', video: 'off' });

const LANGUAGES: readonly Language[] = ['en', 'he'];
const PHONE_WIDTHS = [320, 360, 390, 430] as const;

const copy = (language: Language) => translations[language].vouchers;

async function openVouchers(page: Page, baseURL: string | undefined, language: Language) {
  await isolateFromThirdParties(page, baseURL);
  await preferLanguage(page, language);
  await gotoSettled(page, '/vouchers');
  await expectLanguageRendered(page, language);
}

function formatButton(page: Page, language: Language, format: 'certificate' | 'card'): Locator {
  const title = format === 'card' ? copy(language).cardOptionTitle : copy(language).certOptionTitle;
  return page.getByRole('button', { name: title });
}

const section = (page: Page, name: 'value' | 'balance' | 'details') => page.locator(`[data-voucher-section="${name}"]`);
const checkout = (page: Page) => page.locator('form button[type="submit"]');
const heading = (page: Page, name: string) => page.getByRole('heading', { level: 2, name, exact: true });

/** The submit pill must be the shared primary Button: attributes, geometry and no bespoke chrome. */
async function expectPrimaryButton(page: Page) {
  const button = checkout(page);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('data-ui-control', 'button');
  await expect(button).toHaveAttribute('data-button-variant', 'primary');
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const form = element.closest('form')?.getBoundingClientRect();
    return {
      height: box.height,
      width: box.width,
      formWidth: form?.width ?? 0,
      boxShadow: computed.boxShadow,
      backgroundImage: computed.backgroundImage,
      fontWeight: computed.fontWeight,
      borderRadius: computed.borderTopLeftRadius,
    };
  });
  expect(style.height, 'checkout pill is at least 44px tall').toBeGreaterThanOrEqual(44);
  expect(style.width, 'checkout pill spans the form column').toBeGreaterThanOrEqual(style.formWidth - 1);
  expect(style.boxShadow, 'no shadow, like the Book button').toBe('none');
  expect(style.backgroundImage, 'a flat fill, not a gradient').toBe('none');
  expect(style.fontWeight, 'regular weight, like the Book button').toBe('400');
  expect(Number.parseFloat(style.borderRadius), 'a 980px pill').toBeGreaterThanOrEqual(100);
}

for (const language of LANGUAGES) {
  test.describe(`gift card flow on a 390px phone (${language})`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('replaces the value picker with a quick-select balance and card-specific details', async ({ page, baseURL }) => {
      const v = copy(language);
      await openVouchers(page, baseURL, language);

      await formatButton(page, language, 'card').click();

      // The package value picker is gone from the DOM, not just hidden.
      await expect(section(page, 'value')).toHaveCount(0);
      await expect(page.getByText(v.selectTierTitle, { exact: true })).toHaveCount(0);
      for (const label of [v.tier1Label, v.tier2Label, v.tier3Label, v.tier4Label]) {
        await expect(page.getByRole('button', { name: label })).toHaveCount(0);
      }

      // Step 1 is the balance: its presets are visible; there is no custom amount to type.
      await expect(section(page, 'balance')).toBeVisible();
      await expect(heading(page, v.cardPresetsLabel)).toBeVisible();
      const presets = page.locator('[data-gift-card-presets]');
      for (const amount of ['50', '100', '200', '300', '500', '700', '1,000']) {
        await expect(presets.getByRole('button', { name: new RegExp(`(?<![\\d,])${amount}(?!\\d)`) })).toBeVisible();
      }
      await expect(page.locator('#voucher-custom-amount')).toHaveCount(0);

      // Step 2 carries the card title, not the certificate one, and the badges number 1 then 2.
      const details = heading(page, v.cardDetailsTitle);
      await expect(details).toBeVisible();
      await expect(heading(page, v.customizeDesignTitle)).toHaveCount(0);
      if (language === 'en') await expect(details).toHaveText('Personalized Gift Card Details');
      await expect(page.locator('[data-voucher-step-badge]')).toHaveText(['1', '2']);

      await expectPrimaryButton(page);
    });

    test('keeps the certificate value picker and its original step titles', async ({ page, baseURL }) => {
      const v = copy(language);
      await openVouchers(page, baseURL, language);

      await expect(formatButton(page, language, 'certificate')).toHaveAttribute('aria-pressed', 'true');
      await expect(section(page, 'value')).toBeVisible();
      await expect(heading(page, v.selectTierTitle)).toBeVisible();
      await expect(heading(page, v.customizeDesignTitle)).toBeVisible();
      await expect(section(page, 'balance')).toHaveCount(0);
      await expect(heading(page, v.cardDetailsTitle)).toHaveCount(0);
      await expect(page.locator('[data-voucher-step-badge]')).toHaveText(['1', '2']);

      await expectPrimaryButton(page);
    });

    test('brings the value picker back when the buyer returns to the certificate', async ({ page, baseURL }) => {
      const v = copy(language);
      await openVouchers(page, baseURL, language);

      await formatButton(page, language, 'card').click();
      await expect(section(page, 'value')).toHaveCount(0);
      await formatButton(page, language, 'certificate').click();
      await expect(section(page, 'value')).toBeVisible();
      await expect(heading(page, v.selectTierTitle)).toBeVisible();
      await expect(section(page, 'balance')).toHaveCount(0);
    });
  });
}

for (const language of LANGUAGES) {
  for (const width of PHONE_WIDTHS) {
    test(`fits the gift card flow on a ${width}px phone without sideways scroll (${language})`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width, height: 844 });
      await openVouchers(page, baseURL, language);
      await formatButton(page, language, 'card').click();
      await expect(section(page, 'balance')).toBeVisible();

      const layout = await page.evaluate(() => {
        const viewport = window.innerWidth;
        const controls = [...document.querySelectorAll<HTMLElement>('form button, form input, form textarea')].filter((element) =>
          element.checkVisibility()
        );
        const label = (element: HTMLElement) =>
          (element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.textContent || element.id || element.tagName)
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40);
        const doc = document.documentElement;
        const presets = [...document.querySelectorAll<HTMLElement>('[data-gift-card-presets] button')];
        const first = presets[0]?.getBoundingClientRect();
        const second = presets[1]?.getBoundingClientRect();
        return {
          overflow: doc.scrollWidth - doc.clientWidth,
          tooShort: controls.filter((element) => element.getBoundingClientRect().height < 43.5).map(label),
          outside: controls
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return box.left < -0.5 || box.right > viewport + 0.5;
            })
            .map(label),
          presetCount: presets.length,
          presetDirections: presets.map((element) => getComputedStyle(element).direction),
          // Chips wrap into tidy rows of two on a phone, never a ragged strip.
          presetRows: new Set(presets.map((element) => Math.round(element.getBoundingClientRect().top))).size,
          firstBeforeSecond: first && second ? (document.documentElement.dir === 'rtl' ? first.left > second.left : first.left < second.left) : false,
          emailDirections: [...document.querySelectorAll<HTMLInputElement>('form input[type="email"]')].map((element) => getComputedStyle(element).direction),
          direction: getComputedStyle(doc).direction,
        };
      });

      expect(layout.overflow, 'page does not scroll sideways').toBe(0);
      expect(layout.outside, 'every control stays on screen').toEqual([]);
      expect(layout.tooShort, 'every control is at least 44px tall').toEqual([]);
      expect(layout.presetCount).toBe(7);
      expect(layout.presetRows, 'seven presets wrap into rows of two, the odd last one spans its row').toBe(4);
      expect(layout.firstBeforeSecond, 'presets follow the reading direction').toBe(true);
      expect(layout.direction).toBe(language === 'he' ? 'rtl' : 'ltr');
      // Amounts and e-mail addresses read left to right on every page direction.
      expect(layout.presetDirections.every((direction) => direction === 'ltr')).toBe(true);
      expect(layout.emailDirections).toEqual(['ltr', 'ltr']);

      await expectPrimaryButton(page);
    });
  }
}
