import { expect, recordRequests, test } from './fixtures';
import type { BookingPage } from './pages/booking-page';
import { ilsPattern } from './pages/format';
import type { ScheduleApi } from './pages/schedule-api';
import { follow } from './pages/hydration';

const ADDON_SECTIONS = [
  'Frequently Flown Together — Curated Mission Combos',
  'Customize Flight Plan — World Airport Trios & Cockpit Modules',
] as const;

async function expectNoUpsells(booking: BookingPage): Promise<void> {
  for (const heading of ADDON_SECTIONS) {
    await expect(booking.page.getByRole('heading', { name: heading })).toHaveCount(0);
  }
  await expect(booking.page.getByRole('button', { name: /^(Add to Flight|Apply Combo)/ })).toHaveCount(0);
}

/** Opens the wizard on a date with an open slot and expects the 2-step flow straight to the manifest. */
async function expectTwoStepWizard(booking: BookingPage, schedule: ScheduleApi, duration: number): Promise<void> {
  const { date, slot } = await schedule.findOpenSlot({ duration });
  const wizard = await booking.openWizard();
  await expect(wizard.progressSteps()).toHaveText(['2. DATE & SLOT', '4. PILOT & PAY']);

  await booking.selectDate(date);
  await wizard.slot(slot.startTime).click();
  await expect(wizard.continueToAddons()).toHaveCount(0);
  await wizard.continueToPilot().click();

  await expect(booking.page.getByRole('heading', { level: 1, name: 'Pilot in Command Details' })).toBeVisible();
  await expect(booking.page.getByRole('heading', { name: 'Cockpit Upgrades & Commemoratives' })).toHaveCount(0);
}

test.describe('recreational storefront upsells', () => {
  // Positive control: proves the locators used by expectNoUpsells match real upsell UI,
  // so the noise-free "toHaveCount(0)" checks below cannot pass vacuously.
  test('shows mission combos and the add-on marketplace for a recreational flight', async ({ booking }) => {
    await booking.goto('?package=captains-command-60');

    for (const heading of ADDON_SECTIONS) {
      await expect(booking.page.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(booking.page.getByRole('button', { name: /^Add to Flight/ }).first()).toBeVisible();
    await expect(booking.page.getByRole('button', { name: /^Apply Combo/ }).first()).toBeVisible();
  });

  test('keeps a loaded combo visible above the marketplace and deemphasizes alternatives', async ({ booking }) => {
    await booking.goto('?package=captains-command-60');
    // Combos that no longer fit the auto-selected departure (other tests book slots in the
    // shared store) keep their label but are disabled; apply the first one that is enabled.
    await booking.page.getByRole('button', { name: /^Apply Combo/, disabled: false }).first().click();

    await expect(booking.page.locator('[data-selected-addons]')).toBeVisible();
    // A combo that exceeds the selected departure window is rendered as
    // "Needs …", not an Apply button. Assert the behaviour of the first
    // actually applicable combo rather than assuming a fixed card order.
    await expect(booking.page.locator('[data-selected-addon]')).toHaveCount(2);
    await expect(booking.page.locator('[data-addon-card][data-addon-selected="true"]')).toHaveCount(2);
    await expect(booking.page.locator('[data-addon-card][data-addon-deemphasized="true"]')).not.toHaveCount(0);
  });
});

test.describe('professional training booking', () => {
  test('opens the 90 PRO package from /pro in a noise-free flow with ATPL preselected', async ({ page, booking }) => {
    await page.goto('/pro');
    await follow(page.getByRole('link', { name: /^Book Airline Interview Prep 90 PRO/ }), /\/book\?package=airline-prep-90-pro$/);

    await expect(page).toHaveURL(/\/book\?package=airline-prep-90-pro$/);
    // Customer navigation intentionally opens the calendar-first wizard; Express
    // Shop is a desktop-only optional view, not the default journey.
    const wizard = await booking.openWizard();
    await expect(wizard.progressSteps()).toHaveText(['2. DATE & SLOT', '4. PILOT & PAY']);
    await expect(wizard.durationPill(90)).toHaveAttribute('aria-pressed', 'true');
    await expectNoUpsells(booking);

    for (const minutes of [60, 90, 120]) {
      await expect(wizard.durationPill(minutes)).toContainText('Airline assessment preparation');
      await expect(wizard.durationPill(minutes)).not.toContainText('World Trio');
    }
    await expect(wizard.durationPill(30)).toHaveCount(0);
  });

  test('offers only the three PRO tiers, without the consumer 45m promo (E2E-13)', async ({ booking }) => {
    await booking.goto('?package=airline-prep-90-pro');
    await expect(booking.storefront.packageCard(90)).toContainText('✓ Selected');

    await expect(booking.storefront.packageCard(45)).toHaveCount(0);
  });

  test('skips the add-on step in the wizard and defaults the level to ATPL', async ({ booking, schedule }) => {
    await booking.goto('?package=airline-prep-90-pro');
    await expectTwoStepWizard(booking, schedule, 90);

    await expect(booking.wizard.experienceLevel()).toHaveValue('atpl');
  });

  test('resolves the documented deep link /book?package=airline-interview-prep-90-pro (E2E-3)', async ({
    page,
    booking,
  }) => {
    await booking.goto('?package=airline-interview-prep-90-pro');

    await expect(page.getByRole('heading', { level: 1, name: 'Airline Interview Prep 90 PRO' })).toBeVisible();
    await expect(page.getByText('🎯 NOISE-FREE AIRLINE ASSESSMENT SCHEDULING')).toBeVisible();
    await expect(booking.storefront.experience('Licensed Pilot')).toBeChecked();
  });

  test('dynamically switches checkout to Airline Interview Prep 60 PRO (₪890) when ATPL / Screening Prep is selected', async ({
    page,
    booking,
    schedule,
  }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60 });
    const checkoutRequests = recordRequests(page, '/api/checkout');

    await booking.goto('?package=captains-command-60');
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    await wizard.continueToAddons().click();
    await wizard.continueToPilot().click();

    await expect(page.getByRole('heading', { level: 3, name: "Captain's Command" })).toBeVisible();
    await expect(wizard.experienceLevel()).toHaveValue('beginner');

    await wizard.experienceLevel().selectOption('atpl');

    await expect(page.getByRole('heading', { level: 3, name: 'Airline Interview Prep 60 PRO' })).toBeVisible();
    await expect(wizard.submit()).toHaveText(ilsPattern(890));
    await expect(wizard.progressSteps()).toHaveText(['2. DATE & SLOT', '4. PILOT & PAY']);

    await wizard.fillPilot({
      name: 'Capt. Avi Screening',
      email: 'avi.screening@example.com',
      phone: '+972-54-555-0199',
    });
    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await wizard.submit().click();
    await checkoutResponse;

    expect(checkoutRequests).toHaveLength(1);
    expect(checkoutRequests[0].postDataJSON()).toMatchObject({
      kind: 'booking',
      packageId: 'pkg-pro-60',
      bookingDate: date,
      startTime: slot.startTime,
      experienceLevel: 'atpl',
      addons: [],
    });
  });
});

test.describe('45m daytime promo booking', () => {
  test('keeps the recreational 3-step flow with add-ons and no preset pilot level (E2E-13)', async ({
    page,
    booking,
  }) => {
    await booking.goto('?package=daytime-promo-45');
    await expect(page.getByRole('heading', { level: 1, name: 'Discounted Promotion Flight' })).toBeVisible();

    await expect(page.getByRole('heading', { name: ADDON_SECTIONS[1] })).toBeVisible();
    await expect(booking.storefront.experience('First-Timer')).toBeChecked();
    const wizard = await booking.openWizard();
    await expect(wizard.progressSteps()).toHaveText(['2. DATE & SLOT', '3. ADD-ONS', '4. PILOT & PAY']);
  });
});

test.describe('fear of flying booking', () => {
  test('shows the calm, add-on-free storefront with the beginner level preselected', async ({ page, booking }) => {
    await booking.goto('?package=fear-of-flying-course');

    await expect(page.getByRole('heading', { level: 1, name: 'Fear of Flying Overcoming Course' })).toBeVisible();
    await expect(page.getByText('🕊️ CALM & REASSURING FEAR OF FLYING SCHEDULING')).toBeVisible();
    await expectNoUpsells(booking);
    await expect(booking.storefront.experience('First-Timer')).toBeChecked();
  });

  test('skips the add-on step in the wizard', async ({ booking, schedule }) => {
    await booking.goto('?package=fear-of-flying-course');
    await expectTwoStepWizard(booking, schedule, 60);

    await expect(booking.wizard.experienceLevel()).toHaveValue('beginner');
  });
});
