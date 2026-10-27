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
  { link: 'About Us', path: '/about', heading: /Where Aviation Dreams Take Flight/ },
  { link: 'Facility Rules & Terms', path: '/rules', heading: /^Facility Rules, Terms & Conditions/ },
  { link: 'Privacy & Cookie Policy', path: '/privacy-policy', heading: /^Privacy & Cookie Policy/ },
] as const;

const LEGACY_ALIASES = ['/simulator', '/training'] as const;

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

  // Each footer package link once led to the generic catalog page; it must open the booking
  // engine with that package preselected, as the home page's package cards do.
  const FOOTER_PACKAGES = [
    { link: 'Basic Flight Session — Single Airport Takeoff & Landing', slug: 'discovery-30' },
    { link: "Captain's Command Flight (60m)", slug: 'captains-command-60' },
    { link: "Captains' Challenge & Multi-Trio Odyssey (90m)", slug: 'ultimate-aviator-90' },
    { link: 'Airline Interview Prep 120 PRO', slug: 'airline-assessment-prep' },
    { link: 'Fear of Flying Overcoming Course', slug: 'fear-of-flying-course' },
  ];
  for (const { link, slug } of FOOTER_PACKAGES) {
    test(`opens the booking engine on "${link}" from the footer`, async ({ page, chrome }) => {
      await page.goto('/');
      await follow(chrome.footerLink(link), `/book?package=${slug}`);

      await expect(page).toHaveURL(`/book?package=${slug}`);
      // The storefront heading is the selected package without its duration suffix.
      const title = link.replace(/\s*\(\d+m\)$/, '');
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    });
  }

  test('offers the official social channels in the footer and hides the admin board from visitors', async ({
    page,
    chrome,
  }) => {
    await page.goto('/');
    for (const channel of ['Instagram', 'Facebook', 'YouTube']) {
      const social = chrome.footer.getByRole('link', { name: channel, exact: true });
      await expect(social).toHaveAttribute('href', /^https:\/\/(www\.)?(instagram|facebook|youtube)\.com\//);
      await expect(social).toHaveAttribute('target', '_blank');
    }
    // Customers got a 401/503 from this link; it is for signed-in admins only.
    await expect(chrome.footer.getByRole('link', { name: 'Admin Dispatch Board' })).toHaveCount(0);
  });

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

test('opens the customer story from the About & How It Works call to action', async ({ page }) => {
  await page.goto('/');
  await follow(page.getByRole('link', { name: 'About & How It Works' }), '/about');

  await expect(page).toHaveURL('/about');
  await expect(page.getByRole('heading', { level: 1, name: /Where Aviation Dreams Take Flight/ })).toBeVisible();
});

test('publishes the official social profiles on the customer story page', async ({ page }) => {
  await page.goto('/about');

  // Scoped to the page content: the footer carries the same channels on every page.
  const story = page.getByRole('main');
  await expect(story.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://www.instagram.com/simdream_israel/'
  );
  await expect(story.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
    'href',
    'https://www.facebook.com/Sim-Dream-Israel-104268755679413'
  );
  await expect(story.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/@SimDreamIsrael'
  );
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
