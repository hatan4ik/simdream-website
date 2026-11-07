import { SUBSCRIPTION_PASSES, SUBSCRIPTION_SECTION_COPY } from '@/lib/data/subscription-passes';
import { SUBSCRIPTION_PAGE_COPY } from '@/lib/data/subscription-page-copy';
import { LANGUAGES, preferLanguage } from '../support/e2e';
import { expect, test } from './fixtures';

test.describe('flight subscriptions', () => {
  test('renders all four subscriptions and carries the selected subscription safely to Dispatch', async ({ page }) => {
    await preferLanguage(page, 'en');
    await page.goto('/experiences?category=subscriptions');

    await expect(page.getByRole('heading', { level: 2, name: SUBSCRIPTION_SECTION_COPY.en.title })).toBeVisible();
    await expect(page.locator('[data-subscription-pass]')).toHaveCount(4);

    for (const pass of SUBSCRIPTION_PASSES) {
      const card = page.locator(`[data-subscription-pass="${pass.id}"]`);
      await expect(card.getByRole('heading', { level: 3, name: pass.copy.en.title })).toBeVisible();
      await expect(card).toContainText(`${pass.sessions} × ${pass.sessionMinutes}`);
      await expect(card.getByRole('button', { name: SUBSCRIPTION_SECTION_COPY.en.requestEnrollment })).toBeVisible();
      await expect(card.getByRole('link', { name: SUBSCRIPTION_SECTION_COPY.en.consultDispatch })).toHaveAttribute(
        'href',
        `/contact?subject=subscription&plan=${pass.id}`
      );
    }

    await page.locator('[data-subscription-pass="airline-readiness-10x90"]').getByRole('link', {
      name: SUBSCRIPTION_SECTION_COPY.en.consultDispatch,
    }).click();
    await expect(page).toHaveURL(/\/contact\?subject=subscription&plan=airline-readiness-10x90$/);
    await expect(page.locator('textarea')).toContainText(
      SUBSCRIPTION_PASSES.find((subscription) => subscription.id === 'airline-readiness-10x90')!.copy.en.title
    );
  });
});

test.describe('dedicated flight subscription portal', () => {
  for (const language of LANGUAGES) {
    test(`renders its subscription language in ${language}`, async ({ page }) => {
      await preferLanguage(page, language);
      await page.goto('/subscriptions');

      const copy = SUBSCRIPTION_PAGE_COPY[language] ?? SUBSCRIPTION_PAGE_COPY.en;
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1, name: copy.heroTitle })).toBeVisible();
      await expect(page.getByText(copy.faqEyebrow, { exact: true })).toBeVisible();
      await expect(page.locator('[data-subscription-pass]')).toHaveCount(4);
    });
  }
});
