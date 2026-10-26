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

  test('login page offers email sign-in, social providers and guest checkout', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1, name: 'Member Flight Deck Login' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email Address' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to Flight Deck' })).toBeVisible();
    for (const provider of ['Google', 'Facebook', 'Apple']) {
      await expect(page.getByRole('button', { name: `Continue with ${provider}` })).toBeEnabled();
    }
    // Demo shortcuts must never ship in a production bundle.
    await expect(page.getByText('Local demo access')).toHaveCount(0);

    await follow(page.getByRole('link', { name: 'Continue as a guest' }), '/book');
    await expect(page).toHaveURL('/book');
  });

  test('explains that sign-in is unavailable instead of failing silently', async ({ page }) => {
    await page.goto('/login');
    await waitUntilInteractive(page.getByRole('button', { name: 'Sign in to Flight Deck' }));
    await page.getByRole('textbox', { name: 'Email Address' }).fill('captain@example.com');
    await page.getByPlaceholder('••••••••').fill('correct-horse-battery');

    await page.getByRole('button', { name: 'Sign in to Flight Deck' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Member authentication is not configured.' })).toBeVisible();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: 'Sign in to Flight Deck' })).toBeEnabled();
  });

  test('explains that social sign-in is unavailable', async ({ page }) => {
    await page.goto('/login');
    const google = page.getByRole('button', { name: 'Continue with Google' });
    await waitUntilInteractive(google);

    await google.click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'Member authentication is not configured yet.' })
    ).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
