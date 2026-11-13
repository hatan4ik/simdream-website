import {
  BIRTHDAY_DISCOUNT_PERCENT,
  BIRTHDAY_LOOKBACK_DAYS,
  applyBirthdayDiscount,
  getBirthdayEligiblePackages,
} from '@/lib/discounts/birthday';
import { getLocalizedPackages } from '@/lib/i18n/translations';
import { OFFERS_NAV_LABEL } from '@/lib/offers/nav-label';
import { OFFERS_COPY } from '@/lib/offers/offers-copy';
import {
  getConsumerTrackSavingPercent,
  getDaytimePromotion,
  getGiftCardRange,
  getProTrackSavingRange,
} from '@/lib/offers/offers-data';
import { LANGUAGES, RTL_LANGUAGES, preferLanguage } from '../support/e2e';
import { expect, test } from './fixtures';
import { follow, waitUntilInteractive } from './pages/hydration';

const ils = (amount: number) => `₪${amount.toLocaleString('en-US')}`;

test.describe('Offers & Benefits page', () => {
  for (const language of LANGUAGES) {
    test(`opens from the header menu and carries the page direction (${language})`, async ({ page, chrome }) => {
      await preferLanguage(page, language);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', language);

      await follow(await chrome.primaryLink(OFFERS_NAV_LABEL[language]), '/offers');

      await expect(page).toHaveURL('/offers');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(OFFERS_COPY[language].heroTitle);
      await expect(page.locator('html')).toHaveAttribute('dir', RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr');
    });
  }

  test('does not overflow a 320px phone in Hebrew (right-to-left) or English', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const language of ['he', 'en'] as const) {
      await preferLanguage(page, language);
      await page.goto('/offers');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(OFFERS_COPY[language].heroTitle);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${language} overflows horizontally`).toBeLessThanOrEqual(0);
    }
  });

  test('anchors the birthday explanation at #birthday for the checkout link', async ({ page }) => {
    await preferLanguage(page, 'en');
    await page.goto('/offers#birthday');

    const section = page.locator('#birthday');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toContainText(`${BIRTHDAY_DISCOUNT_PERCENT}%`);
    await expect(section.locator('ol li')).toHaveCount(3);
    await expect(page.locator('[data-offers-cta]').getByRole('link', { name: OFFERS_COPY.en.ctaButton })).toHaveAttribute('href', '/book');
  });

  test('states the other offers from the registries, never retyped', async ({ page }) => {
    await preferLanguage(page, 'en');
    await page.goto('/offers');

    const promo = getDaytimePromotion();
    const pro = getProTrackSavingRange();
    const gifts = getGiftCardRange();
    await expect(page.locator('[data-offer-card="daytime"]')).toContainText(ils(promo.priceIls));
    await expect(page.locator('[data-offer-card="daytime"] a')).toHaveAttribute('href', `/book?package=${promo.slug}`);
    await expect(page.locator('[data-offer-card="tracks"]')).toContainText(`${getConsumerTrackSavingPercent()}%`);
    await expect(page.locator('[data-offer-card="tracks"] a')).toHaveAttribute('href', '/subscriptions');
    await expect(page.locator('[data-offer-card="pro-tracks"]')).toContainText(`${pro.minPercent}% to ${pro.maxPercent}%`);
    await expect(page.locator('[data-offer-card="pro-tracks"] a')).toHaveAttribute('href', '/pro#pro-tracks');
    await expect(page.locator('[data-offer-card="vouchers"]')).toContainText(`${ils(gifts.minIls)} to ${ils(gifts.maxIls)}`);
    await expect(page.locator('[data-offer-card="vouchers"] a')).toHaveAttribute('href', '/vouchers');
  });

  test.describe('birthday calculator', () => {
    test.beforeEach(async ({ page }) => {
      await preferLanguage(page, 'en');
      await page.goto('/offers');
      await waitUntilInteractive(page.locator('[data-birthday-input="birth"]'));
    });

    const check = async (page: import('@playwright/test').Page, birth: string, flight: string) => {
      await page.locator('[data-birthday-input="birth"]').fill(birth);
      await page.locator('[data-birthday-input="flight"]').fill(flight);
    };

    test('defaults the flight date to today and waits for the birth date', async ({ page }) => {
      await expect(page.locator('[data-birthday-input="flight"]')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
      await expect(page.locator('[data-birthday-result]')).toContainText(OFFERS_COPY.en.calcPrompt);
    });

    test('prices every eligible flight through the engine when the birthday is in the flight month', async ({ page }) => {
      await check(page, '1990-11-15', '2026-11-20');

      const verdict = page.locator('[data-birthday-verdict="eligible"]');
      await expect(verdict).toContainText(`${BIRTHDAY_DISCOUNT_PERCENT}% applies`);
      const rows = page.locator('[data-birthday-prices] li');
      const eligible = getBirthdayEligiblePackages();
      await expect(rows).toHaveCount(eligible.length);
      const localized = getLocalizedPackages('en');
      for (const entry of eligible) {
        const price = applyBirthdayDiscount(entry.priceIls);
        const title = localized.find((pkg) => pkg.id === entry.id)!.title;
        const row = rows.filter({ hasText: title });
        await expect(row).toContainText(ils(price.subtotalIls));
        await expect(row).toContainText(ils(price.totalIls));
      }
      await expect(page.locator('[data-birthday-result]')).toContainText('1 November 2026');
    });

    test('includes exactly the last day of the backward grace and excludes the next day', async ({ page }) => {
      await check(page, '1990-10-28', '2026-11-11');
      await expect(page.locator('[data-birthday-verdict="eligible"]')).toContainText(`${BIRTHDAY_LOOKBACK_DAYS}-day grace`);

      await check(page, '1990-10-28', '2026-11-12');
      await expect(page.locator('[data-birthday-verdict="not-eligible"]')).toContainText('Not for this date');
      await expect(page.locator('[data-birthday-verdict="not-eligible"]')).toContainText('11 November 2026');
    });

    test('carries a December birthday into January across the new year', async ({ page }) => {
      await check(page, '1990-12-28', '2027-01-03');
      await expect(page.locator('[data-birthday-verdict="eligible"]')).toBeVisible();
    });

    test('explains an unusable date instead of guessing', async ({ page }) => {
      await check(page, '2024-01-01', '2026-11-20');
      await expect(page.locator('[data-birthday-verdict="invalid"]')).toContainText('at least 10 years old');
      await expect(page.locator('[data-birthday-prices]')).toHaveCount(0);
    });

    test('sends and stores nothing', async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET') requests.push(`${request.method()} ${request.url()}`);
      });
      await check(page, '1990-11-15', '2026-11-20');
      await expect(page.locator('[data-birthday-verdict="eligible"]')).toBeVisible();
      expect(requests).toEqual([]);
      const stored = await page.evaluate(() => JSON.stringify({ ...window.localStorage, ...window.sessionStorage }));
      expect(stored).not.toContain('1990');
    });
  });

  test.describe('checkout capability', () => {
    test('stays silent while the live checkout can apply the discount', async ({ page }) => {
      await preferLanguage(page, 'en');
      await page.route('**/api/offers/capabilities', (route) => route.fulfill({ json: { birthdayDiscountEnforceable: true } }));
      await page.goto('/offers');
      await expect(page.locator('#birthday')).toBeVisible();
      await expect(page.locator('[data-offers-birthday-unavailable]')).toHaveCount(0);
    });

    test('never promises a discount the live checkout cannot apply', async ({ page }) => {
      await preferLanguage(page, 'en');
      await page.route('**/api/offers/capabilities', (route) => route.fulfill({ json: { birthdayDiscountEnforceable: false } }));
      await page.goto('/offers');
      await expect(page.locator('[data-offers-birthday-unavailable]')).toContainText(OFFERS_COPY.en.birthdayUnavailable);
    });

    test('reports the local checkout path as able to apply it', async ({ request }) => {
      const response = await request.get('/api/offers/capabilities');
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ birthdayDiscountEnforceable: true, wixBirthdayPricingProviderEnabled: false });
    });
  });
});
