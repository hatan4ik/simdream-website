import { completeBookingExtras } from '../support/booking-extras';
import { PAYMENTS_UNAVAILABLE } from './pages/booking-page';
import { addMinutes, israelDate } from './pages/format';
import { expect, test } from './fixtures';
import { follow } from './pages/hydration';

test.describe('mobile affordances', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only affordances; desktop engines render the inline header and grid ribbon.');
  });

  test('opens the menu drawer by touch and closes it after navigating', async ({ page, chrome }) => {
    await page.goto('/');
    const vouchersLink = chrome.navbar.getByRole('link', { name: 'Gift Vouchers', exact: true });
    await expect(vouchersLink).toBeHidden();

    await chrome.openMenu('tap');
    const drawer = chrome.navbar.locator('[data-mobile-navigation]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toBeInViewport();
    await expect(drawer).toHaveCSS('overflow-y', 'auto');
    await expect(vouchersLink).toBeVisible();
    // An anonymous visitor is offered the member handoff. The logbook label is
    // deliberately shown only after a successful sign-in.
    await expect(chrome.navbar.getByRole('link', { name: 'Pilot Login' }).last()).toBeVisible();
    // Phones keep the theme and language controls in the drawer only, so the header fits 320px (UX-1).
    await expect(chrome.navbar.getByRole('button', { name: /Switch UI Interface/ }).filter({ visible: true })).toHaveCount(1);
    await expect(chrome.languageButton()).toBeVisible();

    await follow(vouchersLink, '/vouchers', 'tap');
    await expect(page).toHaveURL('/vouchers');
    await expect(page.getByRole('heading', { level: 1, name: 'Give the Ultimate Flight Experience' })).toBeVisible();
    await expect(vouchersLink).toBeHidden();
  });

  test('keeps the navigation sheet reachable and dismissible on a narrow phone', async ({ page, chrome }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    const toggle = chrome.menuToggle();
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeInViewport();
    await toggle.tap();

    const drawer = chrome.navbar.locator('[data-mobile-navigation]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS('position', 'absolute');
    await expect(drawer.getByRole('link', { name: 'Gift Vouchers', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toBeHidden();
  });

  test('gives the menu toggle an accessible name (E2E-9)', async ({ page, chrome }) => {
    await page.goto('/');

    await expect(chrome.navbar.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('keeps Ground School reachable through the touch menu', async ({ page, chrome }) => {
    await page.goto('/');
    await chrome.openMenu('tap');

    await follow(chrome.navbar.getByRole('link', { name: 'Ground School', exact: true }), '/ground-school', 'tap');
    await expect(page).toHaveURL('/ground-school');
    await expect(page.getByRole('heading', { level: 1, name: 'Ground School for FAA & EASA Theory and Oral Preparation' })).toBeVisible();
  });

  test('defaults to a week calendar and selects a date by touch', async ({ page, booking }) => {
    const farDay = israelDate(12);
    await booking.goto();
    const wizard = await booking.openWizard();
    const dayButton = booking.dateButton(farDay);
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Twelve days ahead can fall in a later week near a month end.
    await booking.revealDate(farDay);
    await expect(dayButton).toBeVisible();

    await dayButton.tap();

    await expect(wizard.departureHeading(farDay)).toBeVisible();
  });

  test('keeps Express Shop out of the phone booking flow', async ({ page, booking }) => {
    await booking.goto();
    await expect(page.getByRole('button', { name: 'Guided Wizard (3-Step)' })).toBeVisible();
    await expect(booking.wizard.progressStep('DATE & SLOT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Express Shop View (1-Page)' })).toBeHidden();
    await expect(page.locator('#storefront-buy-box')).toHaveCount(0);
  });

  test('keeps the social, language and WhatsApp controls reachable while the page scrolls', async ({ page, chrome }) => {
    await page.goto('/');
    const utility = chrome.utilityBar;
    const before = await utility.boundingBox();
    expect(before?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);

    await expect(utility.getByRole('link', { name: 'Instagram', exact: true })).toBeVisible();
    await expect(utility.getByRole('link', { name: 'Facebook', exact: true })).toBeVisible();
    await expect(utility.getByRole('link', { name: 'YouTube', exact: true })).toBeVisible();
    // On phones WhatsApp sits beside Book in the navbar (between the logo and the menu), which keeps
    // the top bar free for the reviews, the social icons and the language selector.
    const whatsapp = chrome.navbar.getByRole('link', { name: 'Contact Sim Dream on WhatsApp: +972 55 507 1307' });
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute('href', 'https://wa.me/972555071307');
    await expect(whatsapp.locator('[data-whatsapp-native-icon]')).toBeVisible();
    await expect(whatsapp).toHaveAttribute('data-whatsapp-placement', 'navbar');
    await expect(utility.getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
    await expect(chrome.languageButton()).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = await utility.boundingBox();
    expect(after?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
  });

  test('moves mobile footer navigation into the About Us menu and keeps Russian booking controls within the viewport', async ({
    page,
    chrome,
    booking,
  }) => {
    await page.goto('/');
    await chrome.switchLanguage('ru');
    await chrome.openMenu('tap');

    const about = chrome.navbar.locator('details').filter({ hasText: 'О центре' });
    await expect(about).toBeVisible();
    await about.locator('summary').tap();
    await expect(about.getByRole('link', { name: 'Правила центра и условия' })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Политика конфиденциальности и Cookie' })).toBeVisible();
    await expect(chrome.footer).toBeHidden();

    await booking.goto();
    await expect(page.getByRole('button', { name: 'Пошаговый мастер (3 шага)' })).toBeVisible();
    const width = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  });

  test('pins the wizard confirmation bar to the bottom of the screen', async ({ page, booking }) => {
    await booking.goto();
    const wizard = await booking.openWizard();
    const bar = wizard.actionBar();

    await expect(bar).toHaveCSS('position', 'sticky');
    await expect(wizard.continueToAddons()).toBeInViewport();
    const geometry = await bar.evaluate((element) => ({
      barBottom: element.getBoundingClientRect().bottom,
      flowBottom: (element.parentElement as HTMLElement).getBoundingClientRect().bottom,
      screenBottom: window.innerHeight,
    }));
    // Its place in the page flow is below the fold, yet it rests just above the screen edge.
    expect(geometry.flowBottom).toBeGreaterThan(geometry.screenBottom);
    expect(geometry.screenBottom - geometry.barBottom).toBeGreaterThanOrEqual(0);
    expect(geometry.screenBottom - geometry.barBottom).toBeLessThanOrEqual(24);

    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(wizard.continueToAddons()).toBeInViewport();
  });

  test('completes the guided booking journey by touch alone', async ({ page, booking, schedule }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60 });
    await booking.goto();
    const wizard = await booking.openWizard();

    await booking.selectDate(date, 'tap');
    await wizard.slot(slot.startTime).tap();
    await expect(wizard.actionBar()).toContainText(`${slot.startTime}–${addMinutes(slot.startTime, 60)}`);
    await wizard.continueToAddons().tap();
    await wizard.addonCard('Extra Cockpit Jumpseat Passenger').tap();
    await expect(page.getByText('✓ Added to Flight')).toBeVisible();
    await wizard.continueToPilot().tap();

    await wizard.pilotName().tap();
    await wizard.pilotName().fill('Touch Pilot');
    await wizard.pilotEmail().tap();
    await wizard.pilotEmail().fill('touch.pilot@example.com');
    await wizard.pilotPhone().tap();
    await wizard.pilotPhone().fill('+972-52-000-0000');
    await completeBookingExtras(page);
    await wizard.submit().tap();

    await expect(booking.alert(PAYMENTS_UNAVAILABLE)).toBeVisible();
    await expect(wizard.pilotName()).toHaveValue('Touch Pilot');
    await expect(page.getByText('+ Extra Cockpit Jumpseat Passenger')).toBeVisible();
  });
});

test.describe('real phone layout', () => {
  // Measures the unpatched layout that pages/layout-quarantine.ts neutralises for the journeys.
  test.use({ quarantineMobileLayoutDefects: false });

  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Phone widths only.');
  });

  test('fits the header within the screen so the menu button is visible (E2E-15)', async ({
    page,
    chrome,
  }) => {
    await page.goto('/');
    await expect(chrome.homeLink()).toBeVisible();

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    await expect(chrome.menuToggle()).toBeInViewport();
  });

  test('fits the home and booking pages within a 320px screen with 44px controls (UX-31)', async ({
    page,
    chrome,
  }) => {
    // iPhone SE width. The /book buy box once overflowed it by 3px (a fieldset's min-content floor).
    await page.setViewportSize({ width: 320, height: 568 });
    for (const route of ['/', '/book']) {
      // The home page fetches /api/reviews after mount. A hard navigation while that request is
      // still pending makes WebKit report the cancelled fetch as a page error ("due to access
      // control checks"), which the page-error guard would count as a crash; let it settle first.
      const reviewsSettled = route === '/' ? page.waitForResponse((response) => response.url().includes('/api/reviews')) : null;
      await page.goto(route);
      await expect(chrome.homeLink()).toBeVisible();
      if (reviewsSettled) await reviewsSettled;
      const pageWidth = await page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
      );
      expect(pageWidth, `${route} overflows a 320px screen`).toBeLessThanOrEqual(320);
    }

    // Touch screens get a 44px floor on every control, including the compact header "Book" button.
    for (const control of [chrome.bookCta(), chrome.menuToggle(), chrome.homeLink()]) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0, 'control height').toBeGreaterThanOrEqual(44);
    }
  });

  test('fits the guided wizard within the screen with its Continue button visible (E2E-16)', async ({
    page,
    booking,
  }) => {
    await booking.goto();
    // Keyboard activation: pointer hit-testing is unreliable while the page overflows.
    await page.getByRole('button', { name: 'Guided Wizard (3-Step)' }).press('Enter');
    const bar = booking.wizard.actionBar();
    await expect(bar).toBeVisible();

    const barWidth = await bar.evaluate((element) => element.getBoundingClientRect().width);
    expect(barWidth).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    await expect(booking.wizard.continueToAddons()).toBeInViewport();
  });
});
