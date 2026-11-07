import { LANGUAGES, RTL_LANGUAGES, expectThemeApplied, preferLanguage, preferTheme, type Language } from '../support/e2e';
import { expect, test } from './fixtures';
import { follow } from './pages/hydration';

/** Copy a visitor sees in each language: the gift-voucher page title and the home hero. */
const COPY: Record<Language, { vouchersTitle: string; hero: string }> = {
  en: { vouchersTitle: 'Give the Ultimate Flight Experience', hero: 'Command the' },
  he: { vouchersTitle: 'העניקו את חוויית הטיסה האולטימטיבית', hero: 'קחו פיקוד על' },
  ru: { vouchersTitle: 'Подарите ощущение настоящего полета', hero: 'Возьмите управление' },
  fr: { vouchersTitle: 'Offrez l’Expérience de Vol Ultime', hero: 'Prenez les commandes du' },
  ar: { vouchersTitle: 'امنح تجربة الطيران الاستثنائية', hero: 'تول قيادة طائرة' },
};

const directionOf = (language: Language) => (RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr');

test.describe('language switcher', () => {
  test('uses Hebrew for a brand-new visitor before any language has been saved', async ({ browser }) => {
    // The normal journey fixture explicitly chooses English because most specs
    // assert English copy. A fresh browser context proves the product default.
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto('/vouchers');
      await expect(page.locator('html')).toHaveAttribute('lang', 'he');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.he.vouchersTitle);
    } finally {
      await context.close();
    }
  });

  for (const language of LANGUAGES) {
    const dir = directionOf(language);
    // Start from a different language so the switch is observable.
    const startFrom: Language = language === 'en' ? 'he' : 'en';

    test(`switches to ${language} (${dir}) and keeps it across reload and navigation`, async ({ page, chrome }) => {
      await page.goto('/vouchers');
      if (startFrom !== 'en') await chrome.switchLanguage(startFrom);
      const title = page.getByRole('heading', { level: 1 });
      await expect(title).toHaveText(COPY[startFrom].vouchersTitle);

      await chrome.switchLanguage(language);

      await expect(chrome.html()).toHaveAttribute('lang', language);
      await expect(chrome.html()).toHaveAttribute('dir', dir);
      await expect(title).toHaveText(COPY[language].vouchersTitle);

      await page.reload();
      await expect(chrome.html()).toHaveAttribute('dir', dir);
      await expect(title).toHaveText(COPY[language].vouchersTitle);

      await follow(chrome.homeLink(), '/');
      await expect(page).toHaveURL('/');
      await expect(chrome.html()).toHaveAttribute('lang', language);
      await expect(chrome.html()).toHaveAttribute('dir', dir);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(COPY[language].hero);
    });
  }

  test('applies a previously chosen language on the first page load', async ({ page, chrome }) => {
    await preferLanguage(page, 'ar');
    await page.goto('/vouchers');

    await expect(chrome.html()).toHaveAttribute('lang', 'ar');
    await expect(chrome.html()).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.ar.vouchersTitle);
    await chrome.revealHeaderControls();
    await expect(chrome.languageButton()).toContainText('ar');
  });
});

test.describe('interface theme switcher', () => {
  test('uses brand daylight by default and keeps a visitor-selected studio theme across reload and navigation', async ({ page, chrome }) => {
    await page.goto('/vouchers');
    await expect(chrome.html()).toHaveAttribute('data-ui', 'brand');

    await chrome.toggleTheme();
    await expect(chrome.html()).toHaveAttribute('data-ui', 'brand');
    await expect(chrome.html()).toHaveAttribute('data-look', 'studio');

    await page.reload();
    await expect(chrome.html()).toHaveAttribute('data-ui', 'brand');
    await expect(chrome.html()).toHaveAttribute('data-look', 'studio');

    await follow(chrome.homeLink(), '/');
    await expect(page).toHaveURL('/');
    await expect(chrome.html()).toHaveAttribute('data-ui', 'brand');
  });

  test('cycles cockpit → brand → studio → cockpit when the visitor chooses cockpit', async ({ page, chrome }) => {
    await preferTheme(page, 'cockpit');
    await page.goto('/');
    await expectThemeApplied(page, 'cockpit');

    await chrome.toggleTheme();
    await expectThemeApplied(page, 'brand');

    // Clean Studio is layered on the daylight palette (AGENTS.md §1, theme 3 of 3).
    await chrome.toggleTheme();
    await expectThemeApplied(page, 'studio');

    await chrome.toggleTheme();
    await expectThemeApplied(page, 'cockpit');

    await page.reload();
    await expectThemeApplied(page, 'cockpit');
  });

  test('applies a previously chosen brand theme on the first page load', async ({ page, chrome }) => {
    await preferTheme(page, 'brand');
    await page.goto('/experiences');

    await expect(chrome.html()).toHaveAttribute('data-ui', 'brand');
  });
});
