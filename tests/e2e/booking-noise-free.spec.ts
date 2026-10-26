import { expect, test } from './fixtures';
import type { BookingPage } from './pages/booking-page';
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
});

test.describe('professional training booking', () => {
  test('opens the 90 PRO package from /pro in a noise-free flow with ATPL preselected', async ({ page, booking }) => {
    await page.goto('/pro');
    await follow(page.getByRole('link', { name: /^Book Airline Interview Prep 90 PRO/ }), /\/book\?package=airline-prep-90-pro$/);

    await expect(page).toHaveURL(/\/book\?package=airline-prep-90-pro$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Airline Interview Prep 90 PRO' })).toBeVisible();
    await expect(page.getByText('🎯 NOISE-FREE AIRLINE ASSESSMENT SCHEDULING')).toBeVisible();
    await expectNoUpsells(booking);
    await expect(booking.storefront.experience('Licensed Pilot')).toBeChecked();

    for (const minutes of [60, 90, 120]) {
      await expect(booking.storefront.packageCard(minutes)).toContainText('Airline Interview Prep');
    }
    await expect(booking.storefront.packageCard(20)).toHaveCount(0);
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
});

test.describe('45m daytime promo booking', () => {
  test('keeps the recreational 3-step flow with add-ons and no preset pilot level (E2E-13)', async ({
    page,
    booking,
  }) => {
    await booking.goto('?package=daytime-promo-45');
    await expect(page.getByRole('heading', { level: 1, name: 'Daytime Special Flight' })).toBeVisible();

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
