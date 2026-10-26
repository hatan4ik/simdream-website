import { expect, test } from './fixtures';
import { follow } from './pages/hydration';

const PRIMARY_NAV = [
  { link: 'Flight Experiences', path: '/experiences', heading: 'Popular Simulator Packages' },
  { link: 'Professional Training', path: '/pro', heading: /^Professional Training — Airline Assessment/ },
  { link: 'Corporate CRM (B2B)', path: '/workshops', heading: 'Crew Resource Management in the Cockpit' },
  { link: 'Gift Vouchers', path: '/vouchers', heading: 'Give the Ultimate Flight Experience' },
  { link: 'Location & Contact', path: '/contact', heading: 'Visit Us in Tel Aviv' },
] as const;

const FOOTER_NAV = [
  { link: 'Facility Rules & Terms', path: '/rules', heading: /^Facility Rules, Terms & Conditions/ },
  { link: 'Privacy & Cookie Policy', path: '/privacy-policy', heading: /^Privacy & Cookie Policy/ },
] as const;

const LEGACY_ALIASES = ['/about', '/simulator', '/training'] as const;

test.describe('primary navigation', () => {
  for (const target of PRIMARY_NAV) {
    test(`reaches ${target.path} from the "${target.link}" header link`, async ({ page, chrome }) => {
      await page.goto('/');
      await follow(await chrome.primaryLink(target.link), target.path);

      await expect(page).toHaveURL(target.path);
      await expect(page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible();
    });
  }

  test('reaches the booking engine from the header Book call to action', async ({ page, chrome }) => {
    await page.goto('/experiences');
    await follow(chrome.bookCta(), '/book');

    await expect(page).toHaveURL('/book');
    await expect(page.getByRole('heading', { level: 1, name: "Captain's Command Flight" })).toBeVisible();
  });

  test('returns to the home page from the brand logo', async ({ page, chrome }) => {
    await page.goto('/workshops');
    await follow(chrome.homeLink(), '/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1, name: /Command the\s+Boeing 737 MAX/ })).toBeVisible();
  });

  for (const target of FOOTER_NAV) {
    test(`reaches ${target.path} from the footer`, async ({ page, chrome }) => {
      await page.goto('/');
      await follow(chrome.footerLink(target.link), target.path);

      await expect(page).toHaveURL(target.path);
      await expect(page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible();
    });
  }

  test('reaches member sign-in from the guest checkout banner', async ({ page, booking }) => {
    await booking.goto();
    await follow(page.getByRole('link', { name: 'Sign in to save bookings' }), '/login');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Member Flight Deck Login' })).toBeVisible();
  });

  test('keeps primary navigation reachable at tablet width (E2E-11)', async ({ page, chrome, isMobile }) => {
    test.skip(isMobile, 'Viewport override targets desktop engines.');
    // iPad Air portrait: wider than the drawer breakpoint, narrower than the inline links.
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/');

    const contactLink = chrome.navbar.getByRole('link', { name: 'Location & Contact' });
    const menuButton = chrome.navbar.getByRole('button', { name: /menu/i });
    await expect(contactLink.or(menuButton)).toBeVisible();
  });
});

test.describe('legacy routes', () => {
  for (const alias of LEGACY_ALIASES) {
    test(`permanently redirects ${alias} to /pro`, async ({ page, request }) => {
      const response = await request.get(alias, { maxRedirects: 0 });

      expect([301, 308], 'permanent redirect status').toContain(response.status());
      expect(new URL(response.headers()['location'] ?? '', 'http://app.invalid').pathname).toBe('/pro');

      await page.goto(alias);
      await expect(page).toHaveURL('/pro');
      await expect(page.getByRole('heading', { level: 1, name: /^Professional Training — Airline Assessment/ })).toBeVisible();
    });
  }
});

test.describe('unknown routes', () => {
  test('render a 404 page that explains the problem and keeps the site navigation', async ({ page, chrome }) => {
    const response = await page.goto('/flight-plan-that-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'This page could not be found.' })).toBeVisible();
    await expect(chrome.bookCta()).toBeVisible();

    await follow(chrome.homeLink(), '/');
    await expect(page).toHaveURL('/');
  });
});
