import { SUBSCRIPTION_PASSES, SUBSCRIPTION_SECTION_COPY } from '@/lib/data/subscription-passes';
import { preferLanguage } from '../support/e2e';
import { expect, test } from './fixtures';

test.describe('prepaid flight passes', () => {
  test('renders all four passes and carries the selected pass safely to Dispatch', async ({ page }) => {
    await preferLanguage(page, 'en');
    await page.goto('/experiences?category=subscriptions');

    await expect(page.getByRole('heading', { level: 2, name: SUBSCRIPTION_SECTION_COPY.en.title })).toBeVisible();
    await expect(page.locator('[data-subscription-pass]')).toHaveCount(4);

    for (const pass of SUBSCRIPTION_PASSES) {
      const card = page.locator(`[data-subscription-pass="${pass.id}"]`);
      await expect(card.getByRole('heading', { level: 3, name: pass.copy.en.title })).toBeVisible();
      await expect(card).toContainText(`${pass.sessions} × ${pass.sessionMinutes}`);
      await expect(card.getByRole('link', { name: SUBSCRIPTION_SECTION_COPY.en.requestEnrollment })).toHaveAttribute(
        'href',
        `/contact?subject=subscription&plan=${pass.id}`
      );
    }

    await page.locator('[data-subscription-pass="airline-readiness-10x90"]').getByRole('link', {
      name: SUBSCRIPTION_SECTION_COPY.en.requestEnrollment,
    }).click();
    await expect(page).toHaveURL(/\/contact\?subject=subscription&plan=airline-readiness-10x90$/);
    await expect(page.locator('textarea')).toContainText('Airline Readiness Track');
  });
});
