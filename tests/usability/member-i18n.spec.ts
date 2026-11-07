import type { Page } from '@playwright/test';
import { translations } from '@/lib/i18n/translations';
import { expect, preferLanguage, RTL_LANGUAGES, type Language } from '../support/e2e';
import { test } from './support/fixtures';
import { expectLanguageRendered, gotoSettled, isolateFromThirdParties, pageHeading } from './support/page';

/**
 * The member area (/login, /dashboard, /auth/reset-password) in every non-English language
 * (AGENTS.md section 5). Expected copy is read from lib/i18n/translations.ts, so these checks
 * prove the pages render the dictionary rather than any particular wording of it.
 */

test.use({ reducedMotion: 'reduce', video: 'off' });
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page, baseURL }) => {
  await isolateFromThirdParties(page, baseURL);
});

const LOCALIZED_LANGUAGES: readonly Language[] = ['he', 'ar', 'ru', 'fr'];
const ENGLISH = translations.en.member;

function directionOf(language: Language): 'rtl' | 'ltr' {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

type Copy = string | { [key: string]: Copy };

/** `[path, text]` for every string in a copy namespace. */
function copyLeaves(copy: Copy, path = ''): Array<[string, string]> {
  if (typeof copy === 'string') return [[path, copy]];
  return Object.entries(copy).flatMap(([key, child]) => copyLeaves(child, path ? `${path}.${key}` : key));
}

/**
 * English member strings that show up in the page content (inside <main>, so the shared
 * navbar and footer are out of scope) although `language` has its own wording for them.
 */
async function leakedEnglish(page: Page, language: Language, namespaces: Array<keyof typeof ENGLISH>): Promise<string[]> {
  const content = await page.locator('main').innerText();
  return namespaces.flatMap((namespace) => {
    const localized = new Map(copyLeaves(translations[language].member[namespace]));
    return copyLeaves(ENGLISH[namespace])
      .filter(([path, english]) => english !== localized.get(path) && content.includes(english))
      .map(([path, english]) => `member.${namespace}.${path}: "${english}"`);
  });
}

for (const language of LOCALIZED_LANGUAGES) {
  test.describe(`member area in ${language}`, () => {
    const copy = translations[language].member;

    test.beforeEach(async ({ page }) => {
      await preferLanguage(page, language);
    });

    test(`/login presents the ${language} Wix Member handoff in a dir="${directionOf(language)}" document`, async ({
      page,
    }) => {
      await gotoSettled(page, '/login');
      await expectLanguageRendered(page, language);

      await expect(page.locator('html')).toHaveAttribute('dir', directionOf(language));
      await expect(pageHeading(page)).toHaveText(copy.login.signInTitle);
      await expect(page.getByRole('button', { name: copy.login.signInSubmit, exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: copy.login.guestLink, exact: true })).toBeVisible();
      // Wix hosts email, recovery and configured social providers. The React
      // shell intentionally has no duplicate identity fields to localize.
      await expect(page.locator('input:not([type="hidden"]):visible')).toHaveCount(0);

      await expect(page.getByRole('heading', { name: ENGLISH.login.signInTitle })).toHaveCount(0);
      await expect(page.getByRole('button', { name: ENGLISH.login.signInSubmit })).toHaveCount(0);
      expect(await leakedEnglish(page, language, ['login'])).toEqual([]);
    });

    test(`anonymous /dashboard asks the visitor to sign in in ${language}`, async ({ page }) => {
      await gotoSettled(page, '/dashboard');
      await expectLanguageRendered(page, language);

      await expect(pageHeading(page)).toHaveText(copy.dashboard.signInTitle);
      await expect(page.getByRole('link', { name: copy.dashboard.signInCta })).toBeVisible();
      await expect(page.getByText(copy.dashboardNav.signInPrompt, { exact: true })).toBeVisible();

      await expect(page.getByRole('heading', { name: ENGLISH.dashboard.signInTitle })).toHaveCount(0);
      expect(await leakedEnglish(page, language, ['dashboard', 'dashboardNav'])).toEqual([]);
    });

    test(`/auth/reset-password shows the ${language} heading and not-configured notice`, async ({ page }) => {
      await gotoSettled(page, '/auth/reset-password');
      await expectLanguageRendered(page, language);

      await expect(pageHeading(page)).toHaveText(copy.resetPassword.title);
      // The browser-test server has no Supabase, so password recovery reports that it is unavailable.
      await expect(page.getByText(copy.resetPassword.errorNotConfigured, { exact: true })).toBeVisible();

      await expect(page.getByRole('heading', { name: ENGLISH.resetPassword.title })).toHaveCount(0);
      expect(await leakedEnglish(page, language, ['resetPassword'])).toEqual([]);
    });
  });
}

test.describe('member sign-in interactions', () => {
  test('shows a localized recoverable error when Wix member sign-in cannot start', async ({ page }) => {
    const he = translations.he.member.login;
    await preferLanguage(page, 'he');
    await gotoSettled(page, '/login');
    // The Hebrew copy only renders after hydration, so its controls are interactive from here on.
    await expectLanguageRendered(page, 'he');

    const submit = page.getByRole('button', { name: he.signInSubmit, exact: true });
    await submit.click();
    await expect(page.getByRole('alert').filter({ hasText: he.requestFailed })).toBeVisible();
    await expect(submit).toBeEnabled();
    expect(await leakedEnglish(page, 'he', ['login'])).toEqual([]);
  });

  test('keeps the Arabic Wix Member handoff localized when it is unavailable', async ({ page }) => {
    const ar = translations.ar.member.login;
    await preferLanguage(page, 'ar');
    await gotoSettled(page, '/login');
    await expectLanguageRendered(page, 'ar');

    const submit = page.getByRole('button', { name: ar.signInSubmit, exact: true });
    await submit.click();

    await expect(page.getByRole('alert').filter({ hasText: ar.requestFailed })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: ENGLISH.login.requestFailed })).toHaveCount(0);
    await expect(page).toHaveURL('/login');
    await expect(submit).toBeEnabled();
  });
});
