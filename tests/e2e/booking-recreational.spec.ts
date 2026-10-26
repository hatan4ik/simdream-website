import { validityOf } from './pages/forms';
import { PAYMENTS_UNAVAILABLE, type PilotDetails } from './pages/booking-page';
import { addMinutes, displayDatePattern, ilsPattern } from './pages/format';
import { expect, recordRequests, test } from './fixtures';

const CAPTAIN_60_PRICE = 690;
/** Seeded paid voucher (lib/db/seed-data.ts); this suite only verifies it, never redeems it. */
const SEED_VOUCHER = { code: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA', balance: 400 } as const;
const XWIND = { name: 'X-Wind / Live METAR / IFR Instrument Conditions', minutes: 15, price: 250 } as const;

/** Everything a booking checkout may send (lib/validation.ts bookingCheckoutSchema); no price fields. */
const BOOKING_REQUEST_FIELDS: readonly string[] = [
  'kind',
  'packageId',
  'bookingDate',
  'startTime',
  'pilotName',
  'pilotEmail',
  'pilotPhone',
  'experienceLevel',
  'addons',
  'voucherCode',
  'notes',
];

const PILOT: PilotDetails = {
  name: 'Noa Journey-Tester',
  email: 'noa.journey@example.com',
  phone: '+972-54-555-0101',
};

test.describe('recreational booking, guided 3-step wizard', () => {
  test('books a 60-minute flight with an add-on, validates the manifest and explains that payment is unavailable', async ({
    page,
    booking,
    schedule,
  }) => {
    // A slot whose free window also fits the +15 min add-on.
    const { date, slot } = await schedule.findOpenSlot({ duration: 60, minWindowMinutes: 60 + XWIND.minutes });
    const basePrice = slot.dynamicPriceIls || CAPTAIN_60_PRICE;
    const total = basePrice + XWIND.price;
    const endWithoutAddon = addMinutes(slot.startTime, 60);
    const endWithAddon = addMinutes(slot.startTime, 60 + XWIND.minutes);
    const checkoutRequests = recordRequests(page, '/api/checkout');

    await booking.goto('?package=discovery-30');
    const wizard = await booking.openWizard();
    await expect(wizard.progressSteps()).toHaveText(['2. DATE & SLOT', '3. ADD-ONS', '4. PILOT & PAY']);

    // Step 1: date, package and slot.
    await booking.selectDate(date);
    await expect(wizard.departureHeading(date)).toBeVisible();
    await wizard.chooseDuration(60);
    await expect(page.getByText('⭐ Takeoff/Landing + 1 World Trio (3 Airports Included)')).toBeVisible();
    await wizard.slot(slot.startTime).click();
    await expect(wizard.actionBar()).toContainText(`${slot.startTime}–${endWithoutAddon}`);
    await expect(wizard.actionBar()).toContainText(ilsPattern(basePrice));
    await wizard.continueToAddons().click();

    // Step 2: an add-on extends the end time and the price.
    await expect(page.getByRole('heading', { level: 1, name: 'Cockpit Upgrades & Commemoratives' })).toBeVisible();
    await expect(wizard.actionBar()).toContainText(`60 min • ${slot.startTime}–${endWithoutAddon}`);
    await wizard.addonCard(XWIND.name).click();
    await expect(page.getByText('✓ Added to Flight (+15 min)')).toBeVisible();
    await expect(wizard.actionBar()).toContainText(`75 min (60m + 15m) • ${slot.startTime}–${endWithAddon}`);
    await expect(wizard.actionBar()).toContainText(ilsPattern(total));
    await wizard.continueToPilot().click();

    // Step 3: the summary carries the add-on and the new total.
    await expect(page.getByRole('heading', { level: 1, name: 'Pilot in Command Details' })).toBeVisible();
    await expect(page.getByText(`+ ${XWIND.name}`)).toBeVisible();
    await expect(page.getByText(`75 min (${slot.startTime}–${endWithAddon})`)).toBeVisible();
    await expect(page.getByText(displayDatePattern(date)).first()).toBeVisible();
    await expect(wizard.submit()).toHaveText(ilsPattern(total));

    // Missing fields are blocked in the browser.
    await wizard.submit().click();
    expect(await validityOf(wizard.pilotName())).toMatchObject({ valueMissing: true, valid: false });

    // An invalid email is blocked in the browser.
    await wizard.fillPilot({ ...PILOT, email: 'noa.journey-at-example.com' });
    await wizard.submit().click();
    expect(await validityOf(wizard.pilotEmail())).toMatchObject({ typeMismatch: true, valid: false });

    // A complete manifest reaches the server, which explains that online payment is off.
    await wizard.pilotEmail().fill(PILOT.email);
    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await wizard.submit().click();
    const response = await checkoutResponse;
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: PAYMENTS_UNAVAILABLE });

    await expect(booking.alert(PAYMENTS_UNAVAILABLE)).toBeVisible();
    await expect(wizard.submit()).toBeEnabled();
    await expect(wizard.submit()).toHaveText(ilsPattern(total));

    // Nothing the customer entered is lost.
    await expect(wizard.pilotName()).toHaveValue(PILOT.name);
    await expect(wizard.pilotEmail()).toHaveValue(PILOT.email);
    await expect(wizard.pilotPhone()).toHaveValue(PILOT.phone);
    await expect(page.getByText(`+ ${XWIND.name}`)).toBeVisible();

    // Only the valid attempt was sent, with server-resolvable IDs rather than prices.
    expect(checkoutRequests).toHaveLength(1);
    const body = checkoutRequests[0].postDataJSON() as Record<string, unknown>;
    expect(Object.keys(body).filter((key) => !BOOKING_REQUEST_FIELDS.includes(key))).toEqual([]);
    expect(body).toMatchObject({
      kind: 'booking',
      packageId: 'pkg-captain-60',
      bookingDate: date,
      startTime: slot.startTime,
      addons: ['addon-xwind-ifr'],
      pilotName: PILOT.name,
      pilotEmail: PILOT.email,
      pilotPhone: PILOT.phone,
    });
  });

  test('removes an add-on and restores the base duration and price', async ({ page, booking, schedule }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60, minWindowMinutes: 60 + XWIND.minutes });
    const basePrice = slot.dynamicPriceIls || CAPTAIN_60_PRICE;

    await booking.goto();
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    await wizard.continueToAddons().click();

    await wizard.addonCard(XWIND.name).click();
    await expect(wizard.actionBar()).toContainText('75 min (60m + 15m)');
    await wizard.addonCard(XWIND.name).click();

    await expect(page.getByText('✓ Added to Flight (+15 min)')).toHaveCount(0);
    await expect(wizard.actionBar()).toContainText(`60 min • ${slot.startTime}–${addMinutes(slot.startTime, 60)}`);
    await expect(wizard.actionBar()).toContainText(ilsPattern(basePrice));
  });

  test('returns to step 1 with the chosen slot kept when going back', async ({ booking, schedule }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60 });

    await booking.goto();
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    await wizard.continueToAddons().click();
    await booking.page.getByRole('button', { name: 'Back' }).click();

    await expect(wizard.departureHeading(date)).toBeVisible();
    await expect(wizard.actionBar()).toContainText(`${slot.startTime}–${addMinutes(slot.startTime, 60)}`);
  });

  test('rejects unknown and insufficient gift vouchers at checkout without discounting the order', async ({
    page,
    booking,
    schedule,
  }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60 });
    const basePrice = slot.dynamicPriceIls || CAPTAIN_60_PRICE;
    expect(basePrice, 'the order must cost more than the seeded voucher balance').toBeGreaterThan(SEED_VOUCHER.balance);
    await booking.goto();
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    await wizard.continueToAddons().click();
    await wizard.continueToPilot().click();
    const code = page.getByPlaceholder('Enter voucher code (e.g. SD-VOUCHER-...)');
    const apply = page.getByRole('button', { name: 'Apply', exact: true });

    await code.fill('SD-VOUCH-ZZZZZZZZZZZZZZZZZZ');
    const unknown = page.waitForResponse((response) => response.url().endsWith('/api/vouchers'));
    await apply.click();
    expect((await unknown).status()).toBe(404);
    await expect(page.getByText('Invalid voucher code.', { exact: true })).toBeVisible();

    // Verification is read-only: a paid voucher smaller than the order is explained, never applied.
    await code.fill(SEED_VOUCHER.code);
    const insufficient = page.waitForResponse((response) => response.url().endsWith('/api/vouchers'));
    await apply.click();
    expect((await insufficient).status()).toBe(200);
    await expect(
      page.getByText('This voucher cannot cover the full online order. Please contact us for split payment.')
    ).toBeVisible();
    await expect(page.getByText('discount applied', { exact: false })).toHaveCount(0);
    await expect(wizard.submit()).toHaveText(ilsPattern(basePrice));
  });

  test('labels the pilot manifest fields for assistive technology (E2E-10)', async ({
    booking,
    page,
    schedule,
  }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60 });
    await booking.goto();
    const wizard = await booking.openWizard();
    await booking.selectDate(date);
    await wizard.slot(slot.startTime).click();
    await wizard.continueToAddons().click();
    await wizard.continueToPilot().click();
    await expect(wizard.pilotName()).toBeVisible();

    await expect(page.getByLabel('Pilot Full Name *')).toBeVisible();
    await expect(page.getByLabel('Pilot Email (Confirmation) *')).toBeVisible();
    await expect(page.getByLabel('Phone Number *')).toBeVisible();
    await expect(page.getByLabel('Aviation Experience Level')).toBeVisible();
  });
});

test.describe('recreational booking, one-page storefront', () => {
  test('adds an add-on in the buy box and keeps the order when payment is unavailable', async ({
    page,
    booking,
    schedule,
  }) => {
    const { date, slot } = await schedule.findOpenSlot({ duration: 60, minWindowMinutes: 60 + XWIND.minutes });
    const total = (slot.dynamicPriceIls || CAPTAIN_60_PRICE) + XWIND.price;
    const store = booking.storefront;

    await booking.goto();
    await booking.selectDate(date);
    await expect(store.departureSlotsLabel(date)).toBeVisible();
    await store.slot(slot.startTime).click();
    await store.addToFlight(XWIND.name).click();

    await expect(store.removeAddon(XWIND.name)).toBeVisible();
    await expect(page.getByText(`${slot.startTime} – ${addMinutes(slot.startTime, 75)} IST`)).toBeVisible();
    await expect(store.submit()).toHaveText(ilsPattern(total));

    await store.fillPilot(PILOT);
    await store.experience('Sim Enthusiast').check();
    const checkoutResponse = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
    await store.submit().click();
    const response = await checkoutResponse;
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: PAYMENTS_UNAVAILABLE });
    expect(response.request().postDataJSON()).toMatchObject({
      kind: 'booking',
      packageId: 'pkg-captain-60',
      bookingDate: date,
      startTime: slot.startTime,
      experienceLevel: 'enthusiast',
      addons: ['addon-xwind-ifr'],
    });

    // The buy box reports the problem next to the button the customer pressed.
    const inlineFeedback = page.locator('form').getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE });
    await expect(inlineFeedback).toBeVisible();
    await expect(store.pilotName()).toHaveValue(PILOT.name);
    await expect(store.pilotEmail()).toHaveValue(PILOT.email);
    await expect(store.pilotPhone()).toHaveValue(PILOT.phone);
    await expect(store.experience('Sim Enthusiast')).toBeChecked();
    await expect(store.removeAddon(XWIND.name)).toBeVisible();
  });

  test('blocks submission while required manifest fields are empty', async ({ page, booking }) => {
    const checkoutRequests = recordRequests(page, '/api/checkout');
    await booking.goto();
    await expect(booking.storefront.submit()).toBeEnabled();

    await booking.storefront.submit().click();

    expect(await validityOf(booking.storefront.pilotName())).toMatchObject({ valueMissing: true });
    expect(await validityOf(booking.storefront.pilotEmail())).toMatchObject({ valueMissing: true });
    expect(await validityOf(booking.storefront.pilotPhone())).toMatchObject({ valueMissing: true });
    // A later in-page round trip guarantees any request from the click was already observed.
    await page.evaluate(() => fetch('/api/packages').then((response) => response.status));
    expect(checkoutRequests).toHaveLength(0);
  });
});
