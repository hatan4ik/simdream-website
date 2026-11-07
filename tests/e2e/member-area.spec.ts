import { expect, test } from './fixtures';
import { follow, waitUntilInteractive } from './pages/hydration';

test.describe('member area for an anonymous visitor', () => {
  test('dashboard asks the visitor to sign in instead of showing member data', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to your Flight Deck' })).toBeVisible();
    await expect(page.getByText('Sign in to view your missions')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toHaveCount(0);
    await expect(page.getByText(/SD-737-/)).toHaveCount(0);

    await follow(page.getByRole('link', { name: 'Sign in or create a member profile' }), '/login');
    await expect(page).toHaveURL('/login');
  });

  test('login page offers the single Wix Member sign-in and guest checkout', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1, name: 'Member Flight Deck Login' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to Flight Deck' })).toBeVisible();
    // Wix owns registration, email recovery and enabled social providers in its
    // hosted member flow. Do not duplicate partial identity forms here.
    for (const provider of ['Google', 'Facebook', 'Apple']) {
      await expect(page.getByRole('button', { name: `Continue with ${provider}` })).toHaveCount(0);
    }
    // Demo shortcuts must never ship in a production bundle.
    await expect(page.getByText('Local demo access')).toHaveCount(0);

    await follow(page.getByRole('link', { name: 'Continue as a guest' }), '/book');
    await expect(page).toHaveURL('/book');
  });

  test('explains that Wix member sign-in is unavailable instead of failing silently', async ({ page }) => {
    await page.goto('/login');
    await waitUntilInteractive(page.getByRole('button', { name: 'Sign in to Flight Deck' }));

    await page.getByRole('button', { name: 'Sign in to Flight Deck' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'We could not complete that request. Please try again.' })).toBeVisible();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Sign in to Flight Deck' })).toBeEnabled();
  });

  test('does not expose disconnected social-provider buttons beside Wix Member sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue with Facebook' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue with Apple' })).toHaveCount(0);
  });
});
