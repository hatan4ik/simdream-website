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
    await expect(vouchersLink).toBeVisible();
    await expect(chrome.navbar.getByRole('link', { name: 'Pilot Logbook & Bookings' })).toBeVisible();
    // Phones keep the theme and language controls in the drawer only, so the header fits 320px (UX-1).
    await expect(chrome.navbar.getByRole('button', { name: /Switch UI Interface/ }).filter({ visible: true })).toHaveCount(1);
    await expect(chrome.languageButton()).toBeVisible();

    await follow(vouchersLink, '/vouchers', 'tap');
    await expect(page).toHaveURL('/vouchers');
    await expect(page.getByRole('heading', { level: 1, name: 'Give the Ultimate Flight Experience' })).toBeVisible();
    await expect(vouchersLink).toBeHidden();
  });

  test('gives the menu toggle an accessible name (E2E-9)', async ({ page, chrome }) => {
    await page.goto('/');

    await expect(chrome.navbar.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('defaults to a month calendar and selects a date by touch', async ({ page, booking }) => {
    const farDay = israelDate(12);
    await booking.goto();
    const wizard = await booking.openWizard();
    const dayButton = booking.dateButton(farDay);
    await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Twelve days ahead can fall in next month's grid near a month end.
    await booking.revealDate(farDay);
    await expect(dayButton).toBeVisible();

    await dayButton.tap();

    await expect(wizard.departureHeading(farDay)).toBeVisible();
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
    await wizard.addonCard('4K Cockpit Multi-Cam Video Recording').tap();
    await expect(page.getByText('✓ Added to Flight')).toBeVisible();
    await wizard.continueToPilot().tap();

    await wizard.pilotName().tap();
    await wizard.pilotName().fill('Touch Pilot');
    await wizard.pilotEmail().tap();
    await wizard.pilotEmail().fill('touch.pilot@example.com');
    await wizard.pilotPhone().tap();
    await wizard.pilotPhone().fill('+972-52-000-0000');
    await wizard.submit().tap();

    await expect(booking.alert(PAYMENTS_UNAVAILABLE)).toBeVisible();
    await expect(wizard.pilotName()).toHaveValue('Touch Pilot');
    await expect(page.getByText('+ 4K Cockpit Multi-Cam Video Recording')).toBeVisible();
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
