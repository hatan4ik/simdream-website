import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, nextIsraelWeekday } from '../../support/e2e';
import { gotoSettled, storefrontSlotButtons, zeroSlotHeading } from './page';

/** Error the production checkout returns while card payments are disabled. */
export const PAYMENTS_UNAVAILABLE_MESSAGE = 'Online payments are temporarily unavailable. Please contact us to book.';

interface SlotsResponse {
  slots: Array<{ startTime: string; available: boolean }>;
}

/** Israel-time calendar date (YYYY-MM-DD) `offsetDays` after today. */
export function israelDatePlus(offsetDays: number, from = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(from);
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function stripDayButton(page: Page, isoDate: string): Locator {
  return page.locator(`[data-calendar-date="${isoDate}"]`);
}

/** Ensures an ISO date is visible without coupling browser checks to a displayed language. */
export async function ensureStorefrontDateVisible(page: Page, isoDate: string): Promise<Locator> {
  const dateButton = stripDayButton(page, isoDate);
  for (let step = 0; step < 3; step += 1) {
    if ((await dateButton.count()) > 0) return dateButton;
    await page.locator('[data-calendar-next-month]').click();
  }
  await expect(dateButton, `calendar should render ${isoDate}`).toBeVisible();
  return dateButton;
}

/**
 * Finds a date inside the storefront's 14-day strip with at least `minimumOpenSlots`
 * open slots for the duration. The browser-test server shares one mutable store and a
 * real clock, so dates are discovered instead of hard-coded.
 */
export async function findBookableDate(
  request: APIRequestContext,
  durationMinutes = 60,
  minimumOpenSlots = 2
): Promise<{ date: string; openStartTimes: string[] }> {
  // Start the day after tomorrow: tomorrow is preselected, so choosing it would not reload slots.
  for (let offset = 2; offset <= 12; offset += 1) {
    const date = israelDatePlus(offset);
    const response = await request.get(`/api/slots?date=${date}&duration=${durationMinutes}&includeEfficiency=true`);
    expect(response.status(), `GET /api/slots for ${date}`).toBe(200);
    const body = (await response.json()) as SlotsResponse;
    const openStartTimes = body.slots.filter((slot) => slot.available).map((slot) => slot.startTime);
    if (openStartTimes.length >= minimumOpenSlots) return { date, openStartTimes };
  }
  throw new Error(`No date in the next 12 days has ${minimumOpenSlots} open ${durationMinutes}-minute slots.`);
}

/** Opens the default one-page storefront with the given date selected and its slots loaded. */
export async function openStorefrontOn(page: Page, date: string): Promise<void> {
  await gotoSettled(page, '/book');
  const dateButton = await ensureStorefrontDateVisible(page, date);
  await selectStorefrontDate(page, date, () => dateButton.click());
}

/** Runs `choose` (a click or key press on a strip day) and waits for that date's slots to render. */
export async function selectStorefrontDate(page: Page, date: string, choose: () => Promise<void>): Promise<void> {
  const slotsLoaded = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/slots' && response.url().includes(`date=${date}`)
  );
  await choose();
  expect((await slotsLoaded).status()).toBe(200);
  await expect(storefrontSlotButtons(page).first()).toBeVisible();
}

/** Shows the zero-slots recovery state: the 45-minute daytime promo is never sold on Saturdays. */
export async function showZeroSlotState(page: Page): Promise<void> {
  await gotoSettled(page, '/book');
  await page.getByRole('button', { name: /^45 MIN / }).click();
  const saturdayButton = await ensureStorefrontDateVisible(page, nextIsraelWeekday(6));
  await saturdayButton.click();
  await expect(zeroSlotHeading(page)).toBeVisible();
}

export function wizardToggle(page: Page): Locator {
  return page.getByRole('button', { name: 'Guided Wizard (3-Step)' });
}

/** Opens the guided wizard at step 1 (calendar), 2 (add-ons) or 3 (pilot manifest). */
export async function openWizardStep(page: Page, step: 1 | 2 | 3): Promise<void> {
  await gotoSettled(page, '/book');
  await wizardToggle(page).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Choose Flight Date & Operational Slot' })).toBeVisible();
  const continueToAddons = page.getByRole('button', { name: 'Continue to Add-ons' });
  await expect(continueToAddons).toBeEnabled();
  if (step === 1) return;
  await continueToAddons.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cockpit Upgrades & Commemoratives' })).toBeVisible();
  if (step === 2) return;
  await page.getByRole('button', { name: 'Continue to Pilot Details' }).click();
  await expect(page.getByRole('heading', { name: 'Pilot in Command Details' })).toBeVisible();
}

/** Voucher field and apply button of the storefront buy box. */
export function storefrontVoucher(page: Page): { input: Locator; apply: Locator } {
  return {
    input: page.getByLabel('Have a Gift Voucher or Promo Code?'),
    apply: page.getByRole('button', { name: 'Apply', exact: true }),
  };
}

/** Fills the storefront captain manifest with valid contact details. */
export async function fillStorefrontManifest(page: Page): Promise<void> {
  await page.getByLabel('Pilot Full Name *').fill('Dana Keyboard');
  await page.getByLabel('Pilot Email (Confirmation) *').fill('dana.keyboard@example.com');
  await page.getByLabel('Phone Number *').fill('054-555-0101');
}

export function checkoutButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Proceed to Secure Checkout/ });
}
