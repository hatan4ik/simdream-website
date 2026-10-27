import { FACILITY_INFO } from '@/lib/config/facility-info';
import { expect, LANGUAGES, preferLanguage, PUBLIC_ROUTES, RTL_LANGUAGES, type Language } from '../support/e2e';
import { findBookableDate, openStorefrontOn, wizardToggle } from './support/booking';
import { showPaidBoardingPass } from './support/boarding-pass';
import { test } from './support/fixtures';
import { ARABIC_LETTERS, BROKEN_TEXT_PATTERNS, HEBREW_LETTERS, inspectTelemetryDirection } from './support/i18n';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties } from './support/page';

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

const NATIVE_NAMES: Record<Language, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
  fr: 'Français',
  ar: 'العربية',
};

/**
 * Hebrew legal marks that legitimately appear in every language: the registered company
 * name and the "ח.פ." registration designation printed next to its localized label.
 */
const HEBREW_LEGAL_MARKS = [FACILITY_INFO.legalNameHe, 'ח.פ.'];

function directionOf(language: Language): 'rtl' | 'ltr' {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

test.describe('document language and direction', () => {
  for (const language of LANGUAGES) {
    test(`marks the document as lang="${language}" dir="${directionOf(language)}" when ${language} is active`, async ({
      page,
    }) => {
      await preferLanguage(page, language);
      await gotoSettled(page, '/book');

      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('html')).toHaveAttribute('dir', directionOf(language));
    });
  }

  test('updates lang and dir when the visitor switches language from the navbar', async ({ page }) => {
    await gotoSettled(page, '/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.locator('nav button[aria-haspopup="true"]').filter({ visible: true }).first().click();
    await page.getByRole('button', { name: NATIVE_NAMES.ar }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(ARABIC_LETTERS);
  });
});

for (const language of LANGUAGES) {
  test.describe(`${language} visible text`, () => {
    test.beforeEach(async ({ page }) => {
      await preferLanguage(page, language);
    });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} shows no raw keys, undefined, NaN, [object Object] or template braces`, async ({ page }) => {
        await gotoSettled(page, route);
        await expectLanguageRendered(page, language);
        const text = await page.locator('body').innerText();

        const artifacts = BROKEN_TEXT_PATTERNS.flatMap(({ problem, pattern }) =>
          [...text.matchAll(pattern)].map((match) => `${problem}: "${match[0]}"`)
        );
        expect(text.length).toBeGreaterThan(200);
        expect(artifacts).toEqual([]);
      });
    }
  });
}

test.describe('no cross-script contamination', () => {
  const CASES = [
    { language: 'he', foreign: 'Arabic', letters: ARABIC_LETTERS, allowed: [] as string[] },
    { language: 'ar', foreign: 'Hebrew', letters: HEBREW_LETTERS, allowed: HEBREW_LEGAL_MARKS },
  ] as const;

  for (const { language, foreign, letters, allowed } of CASES) {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} in ${language} contains no ${foreign} letters outside legal marks`, async ({ page }) => {
        await preferLanguage(page, language);
        await gotoSettled(page, route);
        await expectLanguageRendered(page, language);
        let text = await page.locator('body').innerText();
        for (const mark of allowed) text = text.split(mark).join(' ');

        const contaminated = text.split('\n').filter((line) => letters.test(line));
        expect(contaminated).toEqual([]);
      });
    }
  }
});

test.describe('LTR isolation of aviation telemetry on RTL pages', () => {
  for (const language of RTL_LANGUAGES) {
    test.describe(`${language}`, () => {
      test.beforeEach(async ({ page }) => {
        await preferLanguage(page, language);
      });

      test('keeps the live METAR string left-to-right', async ({ page }) => {
        await gotoSettled(page, '/');
        await expectLanguageRendered(page, language);
        const report = await inspectTelemetryDirection(page);

        expect(report.found.some((text) => /KT\b/.test(text))).toBe(true);
        expect(report.notIsolated).toEqual([]);
      });

      test('keeps slot time ranges left-to-right in the one-page storefront', async ({ page, request }) => {
        const { date } = await findBookableDate(request);
        await openStorefrontOn(page, date);
        await expectLanguageRendered(page, language);
        const report = await inspectTelemetryDirection(page);

        expect(report.found.filter((text) => text.includes(' IST')).length).toBeGreaterThan(0);
        expect(report.notIsolated).toEqual([]);
      });

      test('keeps slot time ranges left-to-right in the guided wizard', async ({ page, request }) => {
        // The shared ISO selector keeps the chosen date stable across localized storefront and wizard calendars.
        const { date } = await findBookableDate(request);
        await openStorefrontOn(page, date);
        await expectLanguageRendered(page, language);
        await wizardToggle(page).click();
        const wizardSlotRange = page.getByText(/^\d{2}:\d{2} – \d{2}:\d{2} \(60m\)$/).first();
        await expect(wizardSlotRange).toBeVisible();
        const report = await inspectTelemetryDirection(page);

        expect(report.found.filter((text) => /\(60m\)$/.test(text)).length).toBeGreaterThan(0);
        expect(report.notIsolated).toEqual([]);
      });

      test('keeps the booking reference and flight window left-to-right on the boarding pass', async ({ page }) => {
        await showPaidBoardingPass(page);
        await expectLanguageRendered(page, language);
        const report = await inspectTelemetryDirection(page);

        expect(report.found).toEqual(expect.arrayContaining([expect.stringMatching(/^SD-737-/), expect.stringMatching(/^11:15–12:15/)]));
        expect(report.notIsolated).toEqual([]);
      });
    });
  }
});
