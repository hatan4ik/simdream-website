import { NOT_FOUND_COPY } from '@/components/not-found/not-found-copy';
import { translations } from '@/lib/i18n/translations';
import { expect, test } from './fixtures';
import { activate, follow } from './pages/hydration';

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

const LEGACY_ALIASES = [
  { alias: '/simulator', destination: '/pro' },
  { alias: '/training', destination: '/pro' },
  { alias: '/aerophobia', destination: '/fear-of-flying' },
  { alias: '/book-online', destination: '/book' },
  { alias: '/לקנות-כמתנה', destination: '/vouchers' },
  { alias: '/cooperation', destination: '/workshops' },
  { alias: '/pricing-plans/list', destination: '/subscriptions' },
] as const;

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
    await expect(page.getByRole('heading', { level: 1, name: 'Choose Flight Date & Operational Slot' })).toBeVisible();
  });

  test('opens Ground School from the Professional Training desktop menu', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop flyout is replaced by the touch drawer on phone projects.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    await activate(page.getByRole('button', { name: 'Professional Training' }));
    const menu = page.getByRole('menu', { name: 'Professional Training' });
    const groundSchool = menu.getByRole('menuitem', { name: 'Ground School', exact: true });
    await expect(groundSchool).toBeVisible();
    await expect(groundSchool).toHaveAttribute('href', '/ground-school');

    // The menu itself proves this client navigation surface is interactive. The
    // Link is still a valid HTML anchor before Next attaches its client handler,
    // so require the visitor-visible route transition rather than React's
    // private hydration marker on the anchor.
    const arrived = page.waitForURL('/ground-school');
    await groundSchool.click();
    await arrived;

    await expect(page).toHaveURL('/ground-school');
    await expect(page.getByRole('heading', { level: 1, name: 'Ground School for FAA & EASA Theory and Oral Preparation' })).toBeVisible();
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
    { link: 'Discovery Flight — 30-Minute Boeing 737 Experience', slug: 'discovery-30', duration: 30 },
    { link: "Captain's Command Flight (60m)", slug: 'captains-command-60', duration: 60 },
    { link: "Captains' Challenge & Multi-Trio Odyssey (90m)", slug: 'ultimate-aviator-90', duration: 90 },
    { link: 'Airline Interview Prep 120 PRO', slug: 'airline-assessment-prep', duration: 120 },
    { link: 'Fear of Flying Overcoming Course', slug: 'fear-of-flying-course', duration: 60 },
  ];
  for (const { link, slug, duration } of FOOTER_PACKAGES) {
    test(`opens the booking engine on "${link}" from the footer`, async ({ page, chrome }) => {
      await page.goto('/');
      await follow(chrome.footerLink(link), `/book?package=${slug}`);

      await expect(page).toHaveURL(`/book?package=${slug}`);
      // The guided wizard is the default; it retains the package chosen by the footer link.
      await expect(page.getByRole('heading', { level: 1, name: 'Choose Flight Date & Operational Slot' })).toBeVisible();
      await expect(page.locator(`[data-booking-duration="${duration}"]`)).toHaveAttribute('aria-pressed', 'true');
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

  test('keeps the official social channels permanently available in the upper utility bar', async ({ page, chrome }) => {
    await page.goto('/');

    for (const channel of ['Instagram', 'Facebook', 'YouTube']) {
      const social = chrome.utilityBar.getByRole('link', { name: channel, exact: true });
      await expect(social).toHaveAttribute('href', /^https:\/\/(www\.)?(instagram|facebook|youtube)\.com\//);
      await expect(social).toHaveAttribute('target', '_blank');
    }
    await expect(chrome.utilityBar.getByRole('link', { name: 'Instagram', exact: true })).toHaveCSS('color', 'rgb(228, 64, 95)');
    await expect(chrome.utilityBar.getByRole('link', { name: 'Facebook', exact: true })).toHaveCSS('color', 'rgb(24, 119, 242)');
    await expect(chrome.utilityBar.getByRole('link', { name: 'YouTube', exact: true })).toHaveCSS('color', 'rgb(255, 0, 0)');
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
  for (const { alias, destination } of LEGACY_ALIASES) {
    test(`permanently redirects ${alias} to ${destination}`, async ({ page, request }) => {
      const response = await request.get(alias, { maxRedirects: 0 });

      expect([301, 308], 'permanent redirect status').toContain(response.status());
      expect(new URL(response.headers()['location'] ?? '', 'http://app.invalid').pathname).toBe(destination);

      await page.goto(alias);
      await expect(page).toHaveURL(destination);
    });
  }

  test('never serializes a fabricated booking date into the initial document', async ({ request }) => {
    const response = await request.get('/book');
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain('2099');
  });
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
    await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND_COPY.en.title })).toBeVisible();
    await expect(page.getByText(NOT_FOUND_COPY.en.intro)).toBeVisible();
    await expect(chrome.bookCta()).toBeVisible();

    await follow(chrome.homeLink(), '/');
    await expect(page).toHaveURL('/');
  });

  test('offer a way back inside the page itself: book, home and contact', async ({ page }) => {
    await page.goto('/flight-plan-that-does-not-exist');
    const notFound = page.locator('[data-not-found]');

    // This visitor prefers English, so the way back is the English URL space (Hebrew owns the root).
    await expect(notFound.getByRole('link', { name: 'Book a Flight' })).toHaveAttribute('href', '/en/book');
    await expect(notFound.getByRole('link', { name: NOT_FOUND_COPY.en.home })).toHaveAttribute('href', '/en');
    await expect(notFound.getByRole('link', { name: 'Location & Contact' })).toHaveAttribute('href', '/en/contact');

    await follow(notFound.getByRole('link', { name: 'Book a Flight' }), '/en/book');
  });

  test('answer in the language of the URL and keep its prefix on every way back', async ({ page }) => {
    const response = await page.goto('/ru/flight-plan-that-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1, name: NOT_FOUND_COPY.ru.title })).toBeVisible();
    await expect(page).toHaveTitle(`${NOT_FOUND_COPY.ru.title} | Sim Dream`);

    const notFound = page.locator('[data-not-found]');
    await expect(notFound.getByRole('link', { name: NOT_FOUND_COPY.ru.home })).toHaveAttribute('href', '/ru');
    await expect(notFound.getByRole('link', { name: translations.ru.nav.bookFlight })).toHaveAttribute('href', '/ru/book');
    await expect(notFound.getByRole('link', { name: translations.ru.nav.contact })).toHaveAttribute('href', '/ru/contact');
  });

  test('title the tab after the problem, not the home page', async ({ page }) => {
    await page.goto('/en/flight-plan-that-does-not-exist');
    await expect(page).toHaveTitle(`${NOT_FOUND_COPY.en.title} | Sim Dream`);
  });
});
