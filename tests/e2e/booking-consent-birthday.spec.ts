import type { Locator, Page } from '@playwright/test';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { BIRTHDAY_CHECKOUT_COPY } from '@/lib/discounts/birthday';
import { CONSENT_COPY } from '@/lib/legal';
import { completeBookingExtras, noDiscountBirthDate, sameMonthBirthDate } from '../support/booking-extras';
import { expect, recordRequests, test } from './fixtures';
import type { BookingPage } from './pages/booking-page';
import { ilsPattern } from './pages/format';
import type { ScheduleApi } from './pages/schedule-api';

/**
 * The mandatory checkout extras in BOTH views: the guided steps (every viewport) and the desktop Express Shop.
 * The consent, refund-rule and birthday copy come from the modules that own them, never retyped here.
 */
const CONSENT = CONSENT_COPY.en;
const BIRTHDAY = BIRTHDAY_CHECKOUT_COPY.en;
const PILOT = { name: 'Noa Consent-Tester', email: 'noa.consent@example.com', phone: '+972-54-555-0102' };
const PRO_90_PRICE_ILS = SIMULATOR_PACKAGES.find((pkg) => pkg.id === 'pkg-pro-90')!.priceIls;
const halfUp15 = (subtotal: number) => Math.floor((subtotal * 15 + 50) / 100);

interface PilotStep {
  date: string;
  slot: { startTime: string; dynamicPriceIls: number };
  view: 'wizard' | 'storefront';
}

async function openPilotStep(
  booking: BookingPage,
  schedule: ScheduleApi,
  view: PilotStep['view'],
  options: { query?: string; duration?: number; noiseFree?: boolean; weekdays?: readonly number[] } = {}
): Promise<PilotStep> {
  const { query = '?package=captains-command-60', duration = 60, noiseFree = false, weekdays } = options;
  const { date, slot } = await schedule.findOpenSlot({ duration, weekdays });
  await booking.goto(query);
  if (view === 'wizard') {
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    if (!noiseFree) await wizard.continueToAddons().click();
    await wizard.continueToPilot().click();
    await expect(booking.page.getByRole('heading', { level: 1, name: 'Pilot in Command Details' })).toBeVisible();
  } else {
    await booking.selectDate(date);
    await booking.storefront.slot(slot.startTime).click();
    await expect(booking.page.locator('#storefront-buy-box')).toBeVisible();
  }
  return { date, slot, view };
}

const views = (booking: BookingPage, view: PilotStep['view']) => (view === 'wizard' ? booking.wizard : booking.storefront);
const birthDate = (page: Page) => page.locator('[data-birthday-field] input[type="date"]').filter({ visible: true });
const agreement = (page: Page, kind: 'rules' | 'media') => page.locator(`[data-consent-agreement="${kind}"] input[type="checkbox"]`).filter({ visible: true });
/** The control's distance from the top of its form: unaffected by scrolling, changed by anything that grows above it. */
const offsetInForm = (locator: Locator) =>
  locator.evaluate((element) => element.getBoundingClientRect().top - (element.closest('form') as HTMLElement).getBoundingClientRect().top);
const tap = (locator: Locator, mobile: boolean) => (mobile ? locator.tap() : locator.click());

for (const view of ['wizard', 'storefront'] as const) {
  test.describe(`mandatory consent and birthday, ${view} view`, () => {
    test.beforeEach(({ isMobile }) => {
      test.skip(view === 'storefront' && isMobile, 'Phones never expose the Express Shop.');
    });

    test('keeps both confirmations unchecked and blocks payment until each is ticked, announcing and focusing the first missing one', async ({
      page,
      booking,
      schedule,
      isMobile,
    }) => {
      await openPilotStep(booking, schedule, view);
      const checkoutRequests = recordRequests(page, '/api/checkout');
      const ui = views(booking, view);
      await ui.fillPilot(PILOT, { consent: false });
      await expect(agreement(page, 'rules')).not.toBeChecked();
      await expect(agreement(page, 'media')).not.toBeChecked();

      await tap(ui.submit(), isMobile);

      // The first failure is announced once in the page's alert; both confirmations show their own
      // inline error; focus lands on the first missing one.
      await expect(page.getByRole('alert').filter({ hasText: CONSENT.rules.error })).toHaveCount(1);
      await expect(page.locator('[data-consent-agreement="rules"] [data-consent-error]')).toHaveText(CONSENT.rules.error);
      await expect(page.locator('[data-consent-agreement="media"] [data-consent-error]')).toHaveText(CONSENT.media.error);
      await expect(agreement(page, 'rules')).toBeFocused();
      await expect(agreement(page, 'rules')).toHaveAttribute('aria-invalid', 'true');
      await expect(agreement(page, 'rules')).toHaveAccessibleName(CONSENT.rules.ariaLabel);
      await expect(agreement(page, 'rules')).toHaveAccessibleDescription(new RegExp(CONSENT.rules.error.slice(0, 20)));
      expect(checkoutRequests).toHaveLength(0);

      // One box is not enough: the media release is a separate, mandatory confirmation.
      await agreement(page, 'rules').check();
      await tap(ui.submit(), isMobile);
      await expect(agreement(page, 'media')).toBeFocused();
      await expect(agreement(page, 'media')).toHaveAccessibleName(CONSENT.media.ariaLabel);
      await expect(page.getByRole('alert').filter({ hasText: CONSENT.media.error })).toHaveCount(1);
      await expect(page.getByText(CONSENT.rules.error)).toHaveCount(0);
      expect(checkoutRequests).toHaveLength(0);

      // With both ticked the booking reaches the server, with the confirmations and no version or time.
      await agreement(page, 'media').check();
      const response = page.waitForResponse((candidate) => candidate.url().endsWith('/api/checkout'));
      await tap(ui.submit(), isMobile);
      await response;
      expect(checkoutRequests).toHaveLength(1);
      const body = checkoutRequests[0].postDataJSON() as Record<string, unknown>;
      expect(body.consent).toEqual({ rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, language: 'en' });
      expect(JSON.stringify(body)).not.toMatch(/acceptedAt|consentVersion|legalDocumentVersion/);
    });

    test('requires the pilot date of birth, focusing and announcing the field', async ({ page, booking, schedule, isMobile }) => {
      await openPilotStep(booking, schedule, view);
      const checkoutRequests = recordRequests(page, '/api/checkout');
      const ui = views(booking, view);
      await ui.fillPilot(PILOT, false);
      await agreement(page, 'rules').check();
      await agreement(page, 'media').check();

      await tap(ui.submit(), isMobile);

      await expect(birthDate(page)).toBeFocused();
      await expect(page.getByRole('alert').filter({ hasText: BIRTHDAY.required })).toHaveCount(1);
      await expect(page.locator('[data-birthday-error-region]')).toHaveText(BIRTHDAY.required);
      await expect(birthDate(page)).toHaveAttribute('aria-invalid', 'true');
      await expect(birthDate(page)).toHaveAttribute('aria-required', 'true');
      await expect(birthDate(page)).toHaveAttribute('autocomplete', 'bday');
      await expect(birthDate(page)).toHaveAttribute('dir', 'ltr');
      await expect(birthDate(page)).toHaveAttribute('min', /^\d{4}-\d{2}-\d{2}$/);
      await expect(birthDate(page)).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/);
      expect(checkoutRequests).toHaveLength(0);
    });

    test('shows the congratulations and takes 15 percent off the total, in the summary and on the button, for a birthday in the flight month', async ({
      page,
      booking,
      schedule,
    }) => {
      const { date, slot } = await openPilotStep(booking, schedule, view);
      const price = slot.dynamicPriceIls;
      const ui = views(booking, view);
      await expect(ui.submit()).toHaveText(ilsPattern(price));
      await expect(page.locator('[data-birthday-banner]')).toHaveCount(0);
      const offsetBefore = await offsetInForm(birthDate(page));

      await birthDate(page).fill(sameMonthBirthDate(date));

      await expect(page.locator('[data-birthday-banner]')).toBeVisible();
      await expect(page.locator('[data-birthday-banner]')).toContainText(BIRTHDAY.bannerTitle);
      await expect(page.locator('[data-birthday-discount-line]')).toHaveText(new RegExp(`Birthday discount \\(15%\\)\\D*-\\D*${halfUp15(price)}\\D*`));
      await expect(ui.submit()).toHaveText(ilsPattern(price - halfUp15(price)));
      // The field the visitor is typing in never moves when the banner appears below it.
      expect(await offsetInForm(birthDate(page))).toBeCloseTo(offsetBefore, 0);
      await expect(page.locator('[data-birthday-status-region]')).toHaveAttribute('aria-live', 'polite');

      // A date that does not qualify takes it away again.
      await birthDate(page).fill(noDiscountBirthDate());
      await expect(page.locator('[data-birthday-banner]')).toHaveCount(0);
      await expect(page.locator('[data-birthday-discount-line]')).toHaveCount(0);
      await expect(page.getByText(BIRTHDAY.notEligible)).toBeVisible();
      await expect(ui.submit()).toHaveText(ilsPattern(price));
    });

    test('shows no banner and no reduction on a package that cannot carry the offer (PRO training)', async ({
      page,
      booking,
      schedule,
    }) => {
      const { date } = await openPilotStep(booking, schedule, view, {
        query: '?package=airline-interview-prep-90-pro',
        duration: 90,
        noiseFree: true,
      });

      await birthDate(page).fill(sameMonthBirthDate(date));

      await expect(page.getByText('The birthday discount does not apply to this booking.')).toBeVisible();
      await expect(page.locator('[data-birthday-banner]')).toHaveCount(0);
      await expect(page.locator('[data-birthday-discount-line]')).toHaveCount(0);
      await expect(views(booking, view).submit()).toHaveText(ilsPattern(PRO_90_PRICE_ILS));
    });

    test('promises no price reduction while Wix Bookings is the checkout authority', async ({ page, booking, schedule }) => {
      await page.route(
        (url) => url.pathname === '/api/slots',
        async (route) => {
          const response = await route.fetch();
          const payload = (await response.json()) as Record<string, unknown>;
          await route.fulfill({ response, json: { ...payload, wixBookingsAuthoritative: true } });
        }
      );
      const { date } = await openPilotStep(booking, schedule, view);
      await expect(birthDate(page)).toBeVisible();
      await expect(page.locator('[data-birthday-field]')).toHaveAttribute('data-birthday-mode', 'wix');
      // The honest notice is there from the start, so nothing appears or disappears with the date.
      await expect(page.getByText(/cannot be applied automatically in this checkout/)).toBeVisible();

      await birthDate(page).fill(sameMonthBirthDate(date));

      await expect(page.locator('[data-birthday-banner]')).toHaveCount(0);
      await expect(page.locator('[data-birthday-discount-line]')).toHaveCount(0);
      await expect(page.getByText(/cannot be applied automatically in this checkout/)).toBeVisible();
    });
  });
}

test.describe('the media release and waiver in checkout', () => {
  test('is a calm, readable expandable clause with real links that open in a new tab and keep the booking draft', async ({
    page,
    booking,
    schedule,
    isMobile,
  }) => {
    await openPilotStep(booking, schedule, 'wizard');
    const ui = booking.wizard;
    await ui.fillPilot(PILOT, false);
    const media = page.locator('[data-consent-agreement="media"]');

    // The plain sentence, the 18+ declaration and the opt-out are visible without opening anything.
    await expect(media).toContainText(CONSENT.media.summary);
    await expect(media).toContainText(CONSENT.media.guardianNote);
    await expect(media).toContainText(CONSENT.media.optOutNote);
    await expect(page.locator('[data-consent-media-fulltext]')).toHaveCount(0);

    const toggle = media.getByRole('button', { name: CONSENT.media.expand });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await tap(toggle, isMobile);

    const fullText = page.locator('[data-consent-media-fulltext]');
    await expect(fullText).toBeVisible();
    await expect(fullText).toHaveAccessibleName(CONSENT.media.fullTextTitle);
    await expect(fullText.locator('li').first()).toBeVisible();
    await expect(fullText).toContainText('14.1');
    await expect(media.getByRole('button', { name: CONSENT.media.collapse })).toHaveAttribute('aria-expanded', 'true');
    await expect(fullText).toHaveAttribute('tabindex', '0');

    // The three links of the rules label open in a new tab; the draft stays where it is.
    const rules = page.locator('[data-consent-agreement="rules"]');
    for (const [key, href] of [
      ['rules', '/rules'],
      ['refunds', '/rules#refunds'],
      ['privacy', '/privacy-policy'],
    ] as const) {
      const link = rules.locator(`[data-consent-link="${key}"]`);
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    const [popup] = await Promise.all([page.waitForEvent('popup'), rules.locator('[data-consent-link="refunds"]').click()]);
    await popup.waitForLoadState('domcontentloaded');
    expect(new URL(popup.url()).pathname).toBe('/rules');
    await popup.close();
    await expect(ui.pilotName()).toHaveValue(PILOT.name);
    await expect(ui.pilotEmail()).toHaveValue(PILOT.email);
    await expect(fullText).toBeVisible();

    // Ticking either box does not tick the other.
    await agreement(page, 'media').check();
    await expect(agreement(page, 'rules')).not.toBeChecked();
  });

  test('completes a booking with both confirmations and the birth date through the helper (positive control)', async ({
    page,
    booking,
    schedule,
  }) => {
    await openPilotStep(booking, schedule, 'wizard');
    const checkoutRequests = recordRequests(page, '/api/checkout');
    await booking.wizard.fillPilot(PILOT, false);
    await completeBookingExtras(page);

    const response = page.waitForResponse((candidate) => candidate.url().endsWith('/api/checkout'));
    await booking.wizard.submit().click();
    await response;

    expect(checkoutRequests).toHaveLength(1);
    expect(checkoutRequests[0].postDataJSON()).toMatchObject({ pilotBirthDate: noDiscountBirthDate() });
  });
});
