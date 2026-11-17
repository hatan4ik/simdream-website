import type { Locator, Page } from '@playwright/test';
import { translations, type Language } from '@/lib/i18n/translations';
import { localizeInternalHref } from '@/lib/i18n/locale-routing';
import { completeBookingExtras } from '../support/booking-extras';
import { expect, recordRequests, test } from './fixtures';
import { PAYMENTS_UNAVAILABLE } from './pages/booking-page';
import type { ScheduleApi } from './pages/schedule-api';

const LANGUAGES: ReadonlyArray<{
  lang: Language;
  dir: 'ltr' | 'rtl';
  slotPosition: 'first' | 'middle' | 'last';
  addons: readonly string[];
}> = [
  { lang: 'he', dir: 'rtl', slotPosition: 'first', addons: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extra-seat'] },
  { lang: 'en', dir: 'ltr', slotPosition: 'middle', addons: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-classical-eu'] },
  { lang: 'ru', dir: 'ltr', slotPosition: 'last', addons: ['addon-cold-dark', 'addon-night-neon', 'addon-extra-seat'] },
  { lang: 'fr', dir: 'ltr', slotPosition: 'first', addons: ['addon-med-islands', 'addon-extra-seat'] },
  { lang: 'ar', dir: 'rtl', slotPosition: 'middle', addons: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extra-seat'] },
  { lang: 'es', dir: 'ltr', slotPosition: 'last', addons: ['addon-night-neon', 'addon-middle-east-legends'] },
  { lang: 'de', dir: 'ltr', slotPosition: 'first', addons: ['addon-cold-dark', 'addon-classical-eu', 'addon-extra-seat'] },
];

async function findMultiAddonDay(
  schedule: ScheduleApi,
  minWindowMinutes = 120
): Promise<{ date: string; startTimes: string[] }> {
  const { date } = await schedule.findOpenSlot({ duration: 60, minWindowMinutes });
  const day = await schedule.day(date, 60);
  const startTimes = day.slots
    .filter((slot) => slot.available && (slot.maxAvailableMinutes ?? 0) >= minWindowMinutes)
    .map((slot) => slot.startTime);
  expect(startTimes.length, `expected >= 1 open slot fitting ${minWindowMinutes}m on ${date}`).toBeGreaterThan(0);
  return { date, startTimes };
}

function pickTime(startTimes: readonly string[], position: 'first' | 'middle' | 'last'): string {
  if (position === 'last') return startTimes[startTimes.length - 1]!;
  if (position === 'middle') return startTimes[Math.floor(startTimes.length / 2)]!;
  return startTimes[0]!;
}

/** Verifies a control scrolled via standard CSSOM `scrollIntoView({ behavior: 'instant', block: 'nearest' })` clears both `<header>` and sticky bottom bars. */
async function assertClearOfStickyChrome(locator: Locator, label: string): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate(async (element) => {
    element.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    element.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
  });
  const metrics = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const header = document.querySelector('header[data-site-chrome]');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const stickyBottomTops = [
      ...document.querySelectorAll('.sticky'),
      ...document.querySelectorAll('[data-consent-banner]'),
    ]
      .filter((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          box.height > 0 &&
          (style.position === 'sticky' || style.position === 'fixed') &&
          box.top > window.innerHeight * 0.4 &&
          parseFloat(style.bottom) >= 0
        );
      })
      .map((el) => el.getBoundingClientRect().top);
    const limitBottom = stickyBottomTops.length ? Math.min(...stickyBottomTops) : window.innerHeight;
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      headerBottom: Math.round(headerBottom),
      limitBottom: Math.round(limitBottom),
    };
  });
  expect(metrics.bottom, `${label} bottom should clear sticky header (${JSON.stringify(metrics)})`).toBeGreaterThan(
    metrics.headerBottom
  );
  expect(metrics.top, `${label} top should clear bottom sticky bar (${JSON.stringify(metrics)})`).toBeLessThan(
    metrics.limitBottom
  );
}

async function preferPageLanguage(page: Page, language: Language): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('simdream_lang', value);
    } catch {
      /* sandboxed frame */
    }
  }, language);
}

async function openLocalizedBook(page: Page, lang: Language, query = ''): Promise<void> {
  await preferPageLanguage(page, lang);
  const path = localizeInternalHref(`/book${query}`, lang);
  await page.goto(path);
  await expect(page.locator('[data-slots-state]').filter({ visible: true }).first()).toHaveAttribute(
    'data-slots-state',
    /^(ready|failed)$/,
    { timeout: 30_000 }
  );
}

async function clickCalendarDateAndWait(page: Page, isoDate: string): Promise<void> {
  const dateBtn = page.locator(`[data-calendar-date="${isoDate}"]:visible`).first();
  for (let step = 0; step < 12 && !(await dateBtn.isVisible()); step += 1) {
    const shown = await page
      .locator('[data-calendar-date]:visible')
      .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-calendar-date') ?? '').sort());
    const forward = shown.length === 0 || isoDate > shown[shown.length - 1]!;
    await page
      .locator(forward ? '[data-calendar-next-week]:visible' : '[data-calendar-previous-week]:visible')
      .first()
      .click();
  }
  await expect(dateBtn).toBeVisible();
  if ((await dateBtn.getAttribute('aria-pressed')) === 'true') return;
  const loaded = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/slots' && response.url().includes(`date=${isoDate}`)
  );
  await dateBtn.click();
  expect((await loaded).status()).toBe(200);
}

function slotButtonByTime(page: Page, startTime: string): Locator {
  return page
    .locator('[data-slots-state="ready"] button', { has: page.locator(`span[dir="ltr"]:text-is("${startTime}")`) })
    .first();
}

test.describe('multilingual multi-addon booking matrix (CI guard)', () => {
  for (const scenario of LANGUAGES) {
    test(`completes guided wizard with ${scenario.addons.length} add-ons (${scenario.lang.toUpperCase()} / ${scenario.slotPosition} slot)`, async ({
      page,
      schedule,
    }) => {
      const { date, startTimes } = await findMultiAddonDay(schedule, 120);
      const chosenTime = pickTime(startTimes, scenario.slotPosition);
      const checkoutRequests = recordRequests(page, '/api/checkout');

      await openLocalizedBook(page, scenario.lang);
      await expect(page.locator('html')).toHaveAttribute('lang', scenario.lang);
      await expect(page.locator(`[dir="${scenario.dir}"]`).first()).toBeVisible();

      await page.locator('[data-booking-view="wizard"]').filter({ visible: true }).first().click();
      await clickCalendarDateAndWait(page, date);
      const slotBtn = slotButtonByTime(page, chosenTime);
      await assertClearOfStickyChrome(slotBtn, `slot-${scenario.lang}-${chosenTime}`);
      await slotBtn.click();

      await page.getByRole('button', { name: translations[scenario.lang].booking.continueToAddons }).click();

      for (const addonId of scenario.addons) {
        const cb = page.locator(`input[id$="-${addonId}"]`).first();
        await assertClearOfStickyChrome(cb, `${scenario.lang}-${addonId}`);
        await cb.check();
      }

      if (startTimes.length > 1) {
        await page.getByRole('button', { name: translations[scenario.lang].booking.back }).click();
        const alternateTime = startTimes.find((t) => t !== chosenTime) ?? chosenTime;
        const altBtn = slotButtonByTime(page, alternateTime);
        await altBtn.click();
        await page.getByRole('button', { name: translations[scenario.lang].booking.continueToAddons }).click();
        for (const addonId of scenario.addons) {
          await expect(page.locator(`input[id$="-${addonId}"]`).first()).toBeChecked();
        }
      }

      await page.getByRole('button', { name: translations[scenario.lang].booking.continueToPilot }).click();

      await page.locator('input[id$="-pilot-name"]:visible').first().fill('Nat Nat');
      await page.locator('input[type="email"]:visible').first().fill(`nat.${scenario.lang}@example.com`);
      await page.locator('input[type="tel"]:visible').first().fill('+972547773074');
      await completeBookingExtras(page);

      const submitBtn = page.locator('button[type="submit"][data-ui-control="button"]:visible').last();
      const checkoutResp = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
      await submitBtn.click();
      const response = await checkoutResp;
      expect(response.status()).toBe(503);

      await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE }).first()).toBeVisible();
      expect(checkoutRequests).toHaveLength(1);
      const payload = checkoutRequests[0]!.postDataJSON() as {
        bookingDate: string;
        addons: string[];
        consent: { language: string };
      };
      expect(payload.bookingDate).toBe(date);
      expect(payload.addons).toEqual(expect.arrayContaining([...scenario.addons]));
      expect(payload.consent.language).toBe(scenario.lang);
    });
  }

  for (const lang of ['de', 'ar', 'es'] as const) {
    test(`Express Shop keeps selected slot across multi-addon add, remove & slot switch (${lang.toUpperCase()})`, async ({
      page,
      schedule,
      isMobile,
    }) => {
      test.skip(isMobile || (page.viewportSize()?.width ?? 0) < 640, 'Express Shop is desktop-only.');
      const { date, startTimes } = await findMultiAddonDay(schedule, 150);
      const checkoutRequests = recordRequests(page, '/api/checkout');

      await openLocalizedBook(page, lang);
      await page.locator('[data-booking-view="storefront"]').click();
      await expect(page.locator('#storefront-buy-box')).toBeVisible();
      await clickCalendarDateAndWait(page, date);

      const firstSlot = slotButtonByTime(page, startTimes[0]!);
      await firstSlot.click();

      const chosen = ['addon-cold-dark', 'addon-xwind-ifr', 'addon-classical-eu', 'addon-extra-seat'] as const;
      for (const addonId of chosen) {
        const card = page.locator(`[data-addon-card="${addonId}"]`);
        await card.scrollIntoViewIfNeeded();
        await card.locator('button').last().click();
      }
      await expect(page.locator('#storefront-buy-box button[aria-label^="Remove "]')).toHaveCount(4);

      await page.locator('#storefront-buy-box button[aria-label^="Remove "]').first().click();
      await expect(page.locator('#storefront-buy-box button[aria-label^="Remove "]')).toHaveCount(3);
      if (startTimes.length > 1) {
        await slotButtonByTime(page, startTimes[startTimes.length - 1]!).click();
      }

      await assertClearOfStickyChrome(page.locator('#storefront-pilot-name'), `storefront-${lang}-pilot-name`);
      await page.locator('#storefront-pilot-name').fill('Nat Nat');
      await page.locator('#storefront-pilot-email').fill(`nat.${lang}.shop@example.com`);
      await assertClearOfStickyChrome(page.locator('#storefront-pilot-phone'), `storefront-${lang}-pilot-phone`);
      await page.locator('#storefront-pilot-phone').fill('+972547773074');
      await completeBookingExtras(page);

      const checkoutResp = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
      await page.locator('#storefront-buy-box button[type="submit"]').click();
      const response = await checkoutResp;
      expect(response.status()).toBe(503);

      await expect(page.getByRole('alert').filter({ hasText: PAYMENTS_UNAVAILABLE }).first()).toBeVisible();
      const payload = checkoutRequests[0]!.postDataJSON() as { addons: string[]; consent: { language: string } };
      expect(payload.addons).toHaveLength(3);
      expect(payload.consent.language).toBe(lang);
    });
  }

  test('localized gift voucher checkouts submit with the active page language across all 7 locales', async ({ page }) => {
    for (const { lang } of LANGUAGES) {
      await preferPageLanguage(page, lang);
      const path = localizeInternalHref('/vouchers', lang);
      await page.goto(path);
      const nameInputs = page.locator('input[type="text"]:visible');
      await nameInputs.nth(0).fill('Aviad Tester');
      await nameInputs.nth(1).fill('Nat Nat');
      await page.locator('input[type="email"]:visible').last().fill(`nat.${lang}.voucher@example.com`);
      await page.locator('input[type="tel"]:visible').first().fill('+972547773074');

      const boxes = page.locator('[data-consent-agreement] input[type="checkbox"]:visible');
      for (let i = 0; i < (await boxes.count()); i += 1) {
        const box = boxes.nth(i);
        await assertClearOfStickyChrome(box, `voucher-${lang}-consent-${i}`);
        await box.check();
      }

      const checkoutResp = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
      await page.locator('form button[type="submit"]:visible').last().click();
      const response = await checkoutResp;
      expect(response.status(), `POST /api/checkout for ${path}`).toBe(503);
    }
  });

  test('allows applying both a Coupon (OFF-100) and a Gift Card (8AQMJWNT1V5RK98D) on the same Wix cart without hiding the second option', async ({
    page,
    schedule,
  }) => {
    const { date, startTimes } = await findMultiAddonDay(schedule, 120);
    await page.route(
      (url) => url.pathname === '/api/slots',
      async (route) => {
        const response = await route.fetch();
        const payload = (await response.json()) as Record<string, unknown>;
        await route.fulfill({ response, json: { ...payload, wixBookingsAuthoritative: true } });
      }
    );
    await page.route('**/api/wix/bookings/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slotAvailability: {
            serviceId: 'svc-60',
            scheduleId: 'sched-60',
            localStartDate: `${date}T10:00:00`,
            localEndDate: `${date}T11:00:00`,
            bookable: true,
          },
          timeZone: 'Asia/Jerusalem',
          location: { id: 'loc-1', locationType: 'BUSINESS' },
          paymentOptions: { online: true, inPerson: false },
        }),
      });
    });
    await page.route('**/oauth2/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'visitor-tok', expires_in: 3600, refresh_token: 'ref-tok' }),
      });
    });
    await page.route('**/_api/service-availability/v2/time-slots/get', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ timeSlot: { bookable: true, scheduleId: 'sched-60' } }),
      });
    });
    await page.route('**/bookings/v2/bookings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ booking: { id: 'booking-cg-1' } }),
      });
    });

    let couponApplied = false;
    let giftCardApplied = false;
    await page.route('**/ecom/v2/carts**', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/carts')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cart: { id: 'cart-cg-1' } }) });
        return;
      }
      if (url.endsWith('/add-coupon')) {
        couponApplied = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cart: { coupons: [{ id: 'coupon-off-100', code: 'OFF-100' }] } }),
        });
        return;
      }
      if (url.endsWith('/add-gift-card')) {
        giftCardApplied = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cart: { paymentInfo: { giftCards: [{ id: 'gc-1', obfuscatedCode: '****K98D' }] } },
          }),
        });
        return;
      }
      if (url.endsWith('/calculate')) {
        const preGcTotal = couponApplied ? '590' : '690';
        const discount = couponApplied ? '100' : '0';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            summary: {
              violations: [],
              priceSummary: { discount: { amount: discount }, total: { amount: preGcTotal } },
              ...(giftCardApplied
                ? {
                    paymentSummary: {
                      giftCards: [{ giftCardId: 'gc-1', redeemAmount: { amount: '200' } }],
                      totalAfterGiftCards: { amount: couponApplied ? '390' : '490' },
                    },
                  }
                : {}),
            },
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cart: { id: 'cart-cg-1' } }) });
    });

    await openLocalizedBook(page, 'en');
    await clickCalendarDateAndWait(page, date);
    await slotButtonByTime(page, startTimes[0]!).click();
    await page.getByRole('button', { name: translations.en.booking.continueToAddons }).click();
    await page.getByRole('button', { name: translations.en.booking.continueToPilot }).click();

    await page.locator('input[id$="-pilot-name"]:visible').first().fill('Nat Nat');
    await page.locator('input[type="email"]:visible').first().fill('nat.cg@example.com');
    await page.locator('input[type="tel"]:visible').first().fill('+972547773074');
    await completeBookingExtras(page);

    const selector = page.locator('[data-booking-code-type-selector]').first();
    await expect(selector).toBeVisible();
    const codeInput = page.locator('input[dir="ltr"][class*="uppercase"]:visible').last();

    // 1. Apply Coupon OFF-100
    await codeInput.fill('OFF-100');
    await page.getByRole('button', { name: translations.en.booking.applyCode }).click();
    await expect(page.locator('[data-applied-code-kind="coupon"]')).toContainText('OFF-100');

    // 2. Verify the Gift Card option did NOT disappear and is now selected for the second code
    await expect(selector).toBeVisible();
    await expect(selector.locator('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(codeInput).toBeVisible();

    // 3. Apply Gift Card 8AQMJWNT1V5RK98D on top of OFF-100
    await codeInput.fill('8AQMJWNT1V5RK98D');
    await page.getByRole('button', { name: translations.en.booking.applyCode }).click();
    await expect(page.locator('[data-applied-code-kind="coupon"]')).toContainText('OFF-100');
    await expect(page.locator('[data-applied-code-kind="gift-card"]')).toContainText('****K98D');
  });
});

test.describe('mobile 390x844 multi-addon & RTL sticky clearance (CI guard)', () => {
  test.use({ viewport: { width: 390, height: 844 }, quarantineMobileLayoutDefects: false });

  for (const lang of ['ar', 'he', 'de'] as const) {
    test(`keeps wizard slots, 3 add-ons and consents clear of sticky bars on 390x844 (${lang.toUpperCase()})`, async ({
      page,
      schedule,
    }) => {
      const { date, startTimes } = await findMultiAddonDay(schedule, 120);
      await openLocalizedBook(page, lang);
      await page.locator('[data-booking-view="wizard"]').filter({ visible: true }).first().click();
      await clickCalendarDateAndWait(page, date);

      const slotBtn = slotButtonByTime(page, startTimes[startTimes.length - 1]!);
      await assertClearOfStickyChrome(slotBtn, `mobile-${lang}-slot`);
      await slotBtn.click();

      await page.getByRole('button', { name: translations[lang].booking.continueToAddons }).click();
      for (const addonId of ['addon-cold-dark', 'addon-xwind-ifr', 'addon-extra-seat']) {
        const cb = page.locator(`input[id$="-${addonId}"]`).first();
        await assertClearOfStickyChrome(cb, `mobile-${lang}-${addonId}`);
        await cb.check();
      }

      await page.getByRole('button', { name: translations[lang].booking.continueToPilot }).click();
      await page.locator('input[id$="-pilot-name"]:visible').first().fill('Nat Nat');
      await page.locator('input[type="email"]:visible').first().fill(`nat.mobile.${lang}@example.com`);
      await page.locator('input[type="tel"]:visible').first().fill('+972547773074');
      await completeBookingExtras(page);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow on mobile ${lang}`).toBeLessThanOrEqual(0);

      const checkoutResp = page.waitForResponse((response) => response.url().endsWith('/api/checkout'));
      await page.locator('button[type="submit"][data-ui-control="button"]:visible').last().click();
      const response = await checkoutResp;
      expect(response.status()).toBe(503);
    });
  }
});
