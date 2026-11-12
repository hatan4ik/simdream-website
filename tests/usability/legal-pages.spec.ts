import { RULES_SECTIONS } from '@/lib/legal/anchors';
import { PRIVACY_PAGE_COPY, RULES_PAGE_COPY } from '@/lib/legal/page-copy';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import { expect, LANGUAGES, preferLanguage, RTL_LANGUAGES, type Language } from '../support/e2e';
import { test } from './support/fixtures';
import { ARABIC_LETTERS, HEBREW_LETTERS } from './support/i18n';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

const PRIVACY_SECTION_IDS = [
  'general',
  'information-and-consent',
  'purposes',
  'third-parties',
  'your-rights',
  'security',
  'checkout-data',
  'photos-and-video',
  'cookies',
  'version',
];

/** Letters of the other RTL script must never appear in a page, apart from the registered company name. */
async function expectNoCrossScript(page: import('@playwright/test').Page, language: Language) {
  const text = await page.locator('main').innerText();
  if (language !== 'he') expect(text, `Hebrew letters in ${language}`).not.toMatch(HEBREW_LETTERS);
  if (language !== 'ar') expect(text, `Arabic letters in ${language}`).not.toMatch(ARABIC_LETTERS);
}

for (const language of LANGUAGES) {
  test.describe(`/rules in ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await preferLanguage(page, language);
    });

    test('renders every section, the table of contents, the version and the refund form link', async ({ page }) => {
      const copy = RULES_PAGE_COPY[language];
      await gotoSettled(page, '/rules');
      await expectLanguageRendered(page, language);
      await expect(page.locator('#refunds')).toBeVisible();

      for (const { id } of RULES_SECTIONS) await expect(page.locator(`#${id}`)).toHaveCount(1);
      const toc = page.getByRole('navigation', { name: copy.tocLabel });
      await expect(toc.locator('a[href^="#"]')).toHaveCount(RULES_SECTIONS.length);
      await expect(page.locator('[data-legal-version]')).toHaveText(LEGAL_DOCUMENT_VERSION);

      // Clause 13.1 links to the unlisted refund request form.
      await expect(page.locator('#clause-13-1 a[href="/refund"]')).toBeVisible();
      // The new clauses and the clauses the old page had dropped are on the page.
      for (const clause of ['clause-3-2', 'clause-4-6', 'clause-6-4', 'clause-7-8', 'clause-9-3', 'clause-14-1', 'clause-15-2']) {
        await expect(page.locator(`#${clause}`)).toHaveCount(1);
      }
      await expectNoCrossScript(page, language);
    });

    test('jumps to a section from the table of contents and from a deep link', async ({ page }) => {
      const copy = RULES_PAGE_COPY[language];
      await gotoSettled(page, '/rules');
      await expect(page.locator('#refunds')).toBeVisible();
      await page.getByRole('navigation', { name: copy.tocLabel }).locator('a[href="#media-release"]').click();
      await expect(page.locator('#media-release')).toBeInViewport();

      await page.goto('/rules#consent');
      await expect(page.locator('#consent')).toBeVisible();
      await expect(page.locator('#consent')).toBeInViewport();
    });

    test('shows the official English text for clauses 1 to 12 only where no full translation exists', async ({ page }) => {
      await gotoSettled(page, '/rules');
      await expect(page.locator('#definitions')).toBeVisible();
      const foreign = page.locator('#definitions [lang="en"][dir="ltr"]');
      if (language === 'he' || language === 'en') {
        await expect(foreign).toHaveCount(0);
        await expect(page.locator('[role="note"]')).toHaveCount(0);
      } else {
        await expect(foreign).toHaveCount(1);
        await expect(page.locator('[role="note"]')).toBeVisible();
        // The new clauses are in the page language, not the English fallback.
        await expect(page.locator('#refunds [lang="en"]')).toHaveCount(0);
      }
    });
  });

  test.describe(`/privacy-policy in ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await preferLanguage(page, language);
    });

    test('renders all ten sections, the cookies disclosure and the version in the page language', async ({ page }) => {
      const copy = PRIVACY_PAGE_COPY[language];
      await gotoSettled(page, '/privacy-policy');
      await expectLanguageRendered(page, language);
      await expect(page.locator('#cookies')).toBeVisible();

      for (const id of PRIVACY_SECTION_IDS) await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: copy.tocLabel }).locator('a[href^="#"]')).toHaveCount(PRIVACY_SECTION_IDS.length);
      await expect(page.locator('[data-legal-version]')).toHaveText(LEGAL_DOCUMENT_VERSION);
      await expect(page.locator('#third-parties')).toContainText('Wix.com');
      await expect(page.locator('#third-parties')).toContainText('Google / Meta');
      await expect(page.locator('#your-rights')).toContainText('desk@simdream.co.il');
      await expectNoCrossScript(page, language);
    });
  });
}

test.describe('legal pages on small screens', () => {
  for (const route of ['/rules', '/privacy-policy']) {
    test(`${route} does not scroll sideways at 320px in Arabic and Hebrew`, async ({ browser, baseURL }) => {
      for (const language of RTL_LANGUAGES) {
        const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 700 }, hasTouch: true });
        const page = await context.newPage();
        await isolateFromThirdParties(page, baseURL);
        await preferLanguage(page, language);
        await gotoSettled(page, route);
        await expect(page.locator(route === '/rules' ? '#refunds' : '#cookies')).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${route} ${language} horizontal overflow`).toBeLessThanOrEqual(0);
        await context.close();
      }
    });
  }
});
