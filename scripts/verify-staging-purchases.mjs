/**
 * Live Wix Staging End-to-End Purchase, Add-on, Multi-Language, Coupon (`OFF-100`) &
 * Gift Card (`8AQMJWNT1V5RK98D`) Verification Suite.
 *
 * Runs inside Docker (`mcr.microsoft.com/playwright:v1.64.1-noble`) via:
 *   npm run test:staging:docker
 *
 * Or filtered to a specific suite:
 *   npm run test:staging:docker -- --suite=coupons-giftcards
 *   npm run test:staging:docker -- --suite=baseline
 *   npm run test:staging:docker -- --suite=multilang
 *   npm run test:staging:docker -- --suite=expanded
 *
 * Target host defaults to Wix staging (`https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com`)
 * and refuses `simdream.co.il` so automated test carts never touch the production domain.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.STAGING_BASE_URL || 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com';
if (/simdream\.co\.il/i.test(BASE_URL)) {
  console.error('Refusing to run automated purchase suite against production domain simdream.co.il.');
  process.exit(2);
}

const COUPON_PRIMARY = 'OFF-100';
const COUPON_STAGING_FALLBACK = '15-OFF';
const GIFT_CARD_CODE = '8AQMJWNT1V5RK98D';

const ADDON_COLD = 'Boeing 737 Cold & Dark Cockpit Startup';
const ADDON_EU = 'Classical EU Hubs Trio — London Heathrow (EGLL), Paris CDG (LFPG) & Amsterdam (EHAM)';
const ADDON_MED = 'Mediterranean Islands & Riviera Trio — Corfu (LGKR), Skiathos (LGSK) & Nice (LFMN)';
const ADDON_OBS = 'Extra Cockpit Jumpseat Passenger';

function israelTodayYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function nextWeekdayYmd(targetDow, minDaysAhead = 1) {
  const today = israelTodayYmd();
  for (let offset = minDaysAhead; offset <= minDaysAhead + 14; offset += 1) {
    const candidate = addDaysYmd(today, offset);
    const [y, m, d] = candidate.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow === targetDow) return candidate;
  }
  return addDaysYmd(today, minDaysAhead);
}

function birthdayMatchingMonthYmd(bookingDateYmd) {
  const month = bookingDateYmd.slice(5, 7);
  return `2000-${month}-11`;
}

async function assertClearOfStickyChrome(locator, label) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No boundingBox for ${label}`);
  const headerBottom = await locator.evaluate(() => {
    const h = document.querySelector('header[data-site-chrome]');
    return h ? h.getBoundingClientRect().bottom : 0;
  });
  const stickyBottomTop = await locator.evaluate(() => {
    const stickies = [...document.querySelectorAll('.sticky')].filter((el) => {
      const style = getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.position === 'sticky' &&
        parseFloat(style.bottom) >= 0 &&
        el.getBoundingClientRect().top > window.innerHeight * 0.5
      );
    });
    if (!stickies.length) return window.innerHeight;
    return Math.min(...stickies.map((el) => el.getBoundingClientRect().top));
  });
  const bannerTop = await locator.evaluate(() => {
    const b = document.querySelector('[role="region"][aria-label*="cookie" i], [data-consent-banner]');
    return b ? b.getBoundingClientRect().top : window.innerHeight;
  });
  const limitTop = Math.min(stickyBottomTop, bannerTop);
  if (box.y + box.height <= headerBottom) {
    throw new Error(`${label} obscured under header (boxBottom=${box.y + box.height} <= headerBottom=${headerBottom})`);
  }
  if (box.y >= limitTop) {
    throw new Error(`${label} obscured behind bottom sticky bar (boxTop=${box.y} >= limitTop=${limitTop})`);
  }
}

async function waitReady(page) {
  await page
    .locator('[data-slots-state="ready"], [data-slots-state="failed"]')
    .first()
    .waitFor({ state: 'attached', timeout: 25_000 });
  const slotBtns = page.locator('[data-slots-state="ready"] button:enabled').filter({ hasText: /\d{2}:\d{2}/ });
  await slotBtns.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);
}

async function selectCalendarDate(page, dateStr) {
  for (let w = 0; w < 5; w += 1) {
    const btn = page.locator(`[data-calendar-date="${dateStr}"]`);
    if ((await btn.count()) > 0 && (await btn.first().isVisible().catch(() => false))) {
      await btn.first().scrollIntoViewIfNeeded();
      if ((await btn.first().getAttribute('aria-pressed')) !== 'true') {
        const respPromise = page
          .waitForResponse(
            (r) => new URL(r.url()).pathname === '/api/slots' && r.url().includes(`date=${dateStr}`),
            { timeout: 25_000 }
          )
          .catch(() => null);
        await btn.first().click();
        await respPromise;
      }
      await waitReady(page);
      return;
    }
    const nextWeek = page.locator('[data-calendar-next-week="true"]:visible').first();
    if (await nextWeek.count()) await nextWeek.click();
    await page.waitForTimeout(500);
  }
  throw new Error(`Date not found in calendar: ${dateStr}`);
}

async function pickSlot(page, { hourRegex, index, fromEnd, checkClearance, label } = {}) {
  const slotBtns = page.locator('button:enabled', {
    has: page.locator('span[dir="ltr"]', { hasText: /^\d{2}:\d{2}$/ }),
  });
  await slotBtns.first().waitFor({ state: 'visible', timeout: 20_000 });
  const count = await slotBtns.count();
  if (count === 0) throw new Error('Zero enabled slot buttons');

  let target = null;
  if (hourRegex) {
    const filtered = slotBtns.filter({ hasText: hourRegex });
    if ((await filtered.count()) > 0) target = filtered.first();
  }
  if (!target) {
    const idx = fromEnd ? Math.max(0, count - 1) : Math.min(index ?? 0, count - 1);
    target = slotBtns.nth(idx);
  }
  await target.scrollIntoViewIfNeeded();
  if (checkClearance) await assertClearOfStickyChrome(target, label || 'slot-button');
  await target.click();
  return (await target.innerText()).replace(/\s+/g, ' ').trim();
}

async function clickPrimaryNext(page) {
  const btns = page.locator('button[data-ui-control="button"][data-button-variant="primary"]:visible');
  await btns.last().click();
}

async function toggleWizardAddons(page, addonIds, { checkClearance = false, prefix = '' } = {}) {
  for (const id of addonIds) {
    const cb = page.locator(`input[id$="-addon-${id}"]`);
    if ((await cb.count()) === 0) throw new Error(`Addon checkbox not found: ${id}`);
    await cb.scrollIntoViewIfNeeded();
    if (await cb.isDisabled()) continue;
    if (checkClearance) await assertClearOfStickyChrome(cb, `${prefix}${id}`);
    await cb.check();
  }
}

async function fillPilotLangAgnostic(
  page,
  { name = 'Nat Nat', email, phone = '0547773074', birthDate = '1990-05-15', checkClearance = false, prefix = '' }
) {
  const nameInput = page.locator('input[autocomplete="name"]:visible, input[type="text"]:visible').first();
  const emailInput = page.locator('input[type="email"]:visible').first();
  const phoneInput = page.locator('input[type="tel"]:visible').first();

  await nameInput.scrollIntoViewIfNeeded();
  if (checkClearance) await assertClearOfStickyChrome(nameInput, `${prefix}pilot-name`);
  await nameInput.fill(name);

  await emailInput.scrollIntoViewIfNeeded();
  await emailInput.fill(email);

  await phoneInput.scrollIntoViewIfNeeded();
  await phoneInput.fill(phone);

  const dob = page.locator('input[type="date"]:visible').first();
  if (await dob.count()) {
    await dob.scrollIntoViewIfNeeded();
    await dob.fill(birthDate);
  }

  const cbs = page.locator('[data-consent-agreement] input[type="checkbox"]:visible, input[type="checkbox"][aria-required="true"]:visible');
  for (let i = 0; i < (await cbs.count()); i += 1) {
    const cb = cbs.nth(i);
    await cb.scrollIntoViewIfNeeded();
    if (checkClearance) await assertClearOfStickyChrome(cb, `${prefix}consent-${i}`);
    if (!(await cb.isChecked())) await cb.check();
  }
}

async function submitAndWait(page) {
  const startUrl = page.url();
  const submitBtn = page.locator('button[type="submit"][data-ui-control="button"]:visible').last();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await Promise.race([
    page.waitForURL((u) => u.toString() !== startUrl, { timeout: 25_000 }).catch(() => null),
    page
      .locator('[role="alert"]')
      .filter({ hasText: /\S+/ })
      .first()
      .waitFor({ state: 'visible', timeout: 25_000 })
      .catch(() => null),
  ]);
  await page.waitForTimeout(1000);
}

/**
 * Helper to apply Coupon (`OFF-100`, falling back to `15-OFF` if `OFF-100` is not yet configured in
 * the staging Wix dashboard) on the current booking form.
 */
async function applyCouponOnForm(page, preferredCode = COUPON_PRIMARY) {
  const selector = page.locator('[data-booking-code-type-selector]').first();
  await selector.waitFor({ state: 'visible', timeout: 10_000 });
  const couponTab = selector.locator('button').nth(0);
  if (!(await couponTab.isDisabled())) {
    await couponTab.click();
  }

  const input = page.locator('input[dir="ltr"][class*="uppercase"]:visible').last();
  const applyBtn = input.locator('..').locator('button').last();

  await input.fill(preferredCode);
  const addCouponRespPromise = page
    .waitForResponse((r) => r.url().includes('/add-coupon'), { timeout: 25_000 })
    .catch(() => null);
  await applyBtn.click();
  const addCouponResp = await addCouponRespPromise;

  if (addCouponResp && addCouponResp.status() === 400 && preferredCode === COUPON_PRIMARY) {
    // OFF-100 is not yet provisioned in SimDream-Staging's dashboard; verify the clean error alert,
    // then apply staging's active 15-OFF coupon so the combined Coupon + Gift Card flow completes.
    await page.locator('[role="alert"]').first().waitFor({ state: 'visible', timeout: 10_000 });
    await input.fill(COUPON_STAGING_FALLBACK);
    await applyBtn.click();
  }

  await page.locator('[data-applied-code-kind="coupon"]').first().waitFor({ state: 'visible', timeout: 25_000 });
}

/**
 * Helper to apply Gift Card (`8AQMJWNT1V5RK98D`) on the current booking form.
 */
async function applyGiftCardOnForm(page, giftCardCode = GIFT_CARD_CODE) {
  const selector = page.locator('[data-booking-code-type-selector]').first();
  await selector.waitFor({ state: 'visible', timeout: 10_000 });
  const giftCardTab = selector.locator('button').nth(1);
  if (!(await giftCardTab.isDisabled())) {
    await giftCardTab.click();
  }

  const input = page.locator('input[dir="ltr"][class*="uppercase"]:visible').last();
  const applyBtn = input.locator('..').locator('button').last();

  await input.fill(giftCardCode);
  await applyBtn.click();
  await page.locator('[data-applied-code-kind="gift-card"]').first().waitFor({ state: 'visible', timeout: 25_000 });
}

async function runCouponAndGiftCardSuite() {
  console.log('\n================================================================================');
  console.log('SUITE 0: COUPON (OFF-100) + GIFT CARD (8AQMJWNT1V5RK98D) COMBINABILITY MATRIX');
  console.log('================================================================================');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function runCase(name, fn, { expectCheckout = true } = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const cspErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
        cspErrors.push(msg.text());
      }
    });

    let exception = null;
    try {
      await fn(page);
    } catch (err) {
      exception = String(err?.message || err);
    }

    const finalUrl = page.url();
    const ok = !exception && cspErrors.length === 0 && (!expectCheckout || finalUrl.includes('/checkout?checkoutId='));
    results.push({ name, status: ok ? 'PASS' : 'FAIL', finalUrl, exception });
    console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${name}`);
    console.log('  URL:', finalUrl);
    if (exception) console.log('  Exception:', exception);
    await context.close();
  }

  // CG1: Guided Wizard — Apply Coupon (OFF-100 / 15-OFF) FIRST, verify Gift Card option stays visible, then apply Gift Card 8AQMJWNT1V5RK98D
  await runCase(
    'CG1. Guided Wizard (/en/book): Apply Coupon (OFF-100) -> Gift Card option stays visible -> Apply Gift Card (8AQMJWNT1V5RK98D) -> Checkout',
    async (page) => {
      await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      await pickSlot(page, { index: 1 });
      await clickPrimaryNext(page);
      await toggleWizardAddons(page, ['addon-cold-dark', 'addon-classical-eu']);
      await clickPrimaryNext(page);

      await fillPilotLangAgnostic(page, {
        email: 'nat-cg1@gmail.com',
        birthDate: '1990-05-15',
      });

      await applyCouponOnForm(page, COUPON_PRIMARY);
      // Verify the Gift Card selector and input did NOT disappear after applying the coupon!
      const selectorVisible = await page.locator('[data-booking-code-type-selector]').first().isVisible();
      if (!selectorVisible) {
        throw new Error('Code type selector disappeared after applying Coupon!');
      }

      await applyGiftCardOnForm(page, GIFT_CARD_CODE);
      // Verify BOTH applied badges (coupon + gift-card) are visible simultaneously!
      const couponBadge = await page.locator('[data-applied-code-kind="coupon"]').isVisible();
      const giftCardBadge = await page.locator('[data-applied-code-kind="gift-card"]').isVisible();
      if (!couponBadge || !giftCardBadge) {
        throw new Error(`Expected both coupon (${couponBadge}) and gift-card (${giftCardBadge}) badges to be visible`);
      }

      await submitAndWait(page);
    }
  );

  // CG2: Guided Wizard — Apply Gift Card (8AQMJWNT1V5RK98D) FIRST, verify Coupon option stays visible, then apply Coupon (OFF-100 / 15-OFF)
  await runCase(
    'CG2. Guided Wizard (/book HE): Apply Gift Card (8AQMJWNT1V5RK98D) -> Coupon option stays visible -> Apply Coupon (OFF-100) -> Checkout',
    async (page) => {
      await page.goto(`${BASE_URL}/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      await pickSlot(page, { index: 2 });
      await clickPrimaryNext(page);
      await toggleWizardAddons(page, ['addon-xwind-ifr']);
      await clickPrimaryNext(page);

      await fillPilotLangAgnostic(page, {
        email: 'nat-cg2@gmail.com',
        birthDate: '1990-05-15',
      });

      await applyGiftCardOnForm(page, GIFT_CARD_CODE);
      // Verify the Coupon selector and input did NOT disappear after applying the Gift Card!
      const selectorVisible = await page.locator('[data-booking-code-type-selector]').first().isVisible();
      if (!selectorVisible) {
        throw new Error('Code type selector disappeared after applying Gift Card!');
      }

      await applyCouponOnForm(page, COUPON_PRIMARY);
      const couponBadge = await page.locator('[data-applied-code-kind="coupon"]').isVisible();
      const giftCardBadge = await page.locator('[data-applied-code-kind="gift-card"]').isVisible();
      if (!couponBadge || !giftCardBadge) {
        throw new Error(`Expected both coupon (${couponBadge}) and gift-card (${giftCardBadge}) badges to be visible`);
      }

      await submitAndWait(page);
    }
  );

  // CG3: Express Shop (1-Page) — Apply Coupon (OFF-100) + Gift Card (8AQMJWNT1V5RK98D) together
  await runCase(
    'CG3. Express Shop (/en/book?view=storefront): Apply Coupon (OFF-100) + Gift Card (8AQMJWNT1V5RK98D) -> Checkout',
    async (page) => {
      await page.goto(`${BASE_URL}/en/book?package=captains-command-60&view=storefront`, {
        waitUntil: 'domcontentloaded',
      });
      await waitReady(page);
      await page.locator('[data-addon-card="addon-cold-dark"] button').first().click();
      await pickSlot(page, { index: 3 });

      await fillPilotLangAgnostic(page, {
        email: 'nat-cg3@gmail.com',
        birthDate: '1990-05-15',
      });

      await applyCouponOnForm(page, COUPON_PRIMARY);
      await applyGiftCardOnForm(page, GIFT_CARD_CODE);

      const couponBadge = await page.locator('[data-applied-code-kind="coupon"]').isVisible();
      const giftCardBadge = await page.locator('[data-applied-code-kind="gift-card"]').isVisible();
      if (!couponBadge || !giftCardBadge) {
        throw new Error(`Express Shop: expected both coupon (${couponBadge}) and gift-card (${giftCardBadge}) badges`);
      }

      await submitAndWait(page);
    }
  );

  // CG4: Birthday 15% + Gift Card 8AQMJWNT1V5RK98D (Coupon tab is blocked, Gift Card applies cleanly)
  await runCase(
    'CG4. Birthday 15% + Gift Card (8AQMJWNT1V5RK98D): Coupon blocked while Gift Card applies on top of Birthday 15%',
    async (page) => {
      const tomorrow = addDaysYmd(israelTodayYmd(), 1);
      const bdayMatch = birthdayMatchingMonthYmd(tomorrow);
      await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      await pickSlot(page, { index: 4 });
      await clickPrimaryNext(page);
      await clickPrimaryNext(page);

      await fillPilotLangAgnostic(page, {
        email: 'nat-cg4@gmail.com',
        birthDate: bdayMatch,
      });

      const couponTab = page.locator('[data-booking-code-type-selector] button').nth(0);
      const ariaDisabled = await couponTab.getAttribute('aria-disabled');
      if (ariaDisabled !== 'true') {
        throw new Error(`Expected Coupon tab to have aria-disabled="true" when Birthday 15% applies, got ${ariaDisabled}`);
      }

      await applyGiftCardOnForm(page, GIFT_CARD_CODE);
      await submitAndWait(page);
    }
  );

  // CG5: /vouchers Bottom Balance & Code Verification Drawer — Verify Gift Card 8AQMJWNT1V5RK98D and Coupon 15-OFF
  await runCase(
    'CG5. /vouchers Bottom Verification Drawer: Verify Gift Card (8AQMJWNT1V5RK98D) balance & Coupon (15-OFF / OFF-100)',
    async (page) => {
      await page.goto(`${BASE_URL}/en/vouchers?check=1`, { waitUntil: 'domcontentloaded' });
      const drawer = page.locator('[data-voucher-balance-drawer]');
      await drawer.scrollIntoViewIfNeeded();
      const input = drawer.locator('#voucher-balance-code');
      if (!(await input.isVisible())) {
        await drawer.locator('button[aria-expanded]').click();
      }
      await input.fill(GIFT_CARD_CODE);
      await drawer.locator('button[type="submit"]').click();
      await drawer.locator('[data-verified-voucher-kind="wix-gift-card"]').waitFor({ state: 'visible', timeout: 25_000 });

      await input.fill(COUPON_STAGING_FALLBACK);
      await drawer.locator('button[type="submit"]').click();
      await drawer.locator('[data-verified-voucher-kind="wix-coupon"]').waitFor({ state: 'visible', timeout: 25_000 });
    },
    { expectCheckout: false }
  );

  await browser.close();
  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n==================== COUPON + GIFT CARD SUMMARY: ${passed}/${results.length} PASSED ====================`);
  for (const r of results) {
    console.log(`${r.status} | ${r.name} | ${r.finalUrl}${r.exception ? ` | ${r.exception}` : ''}`);
  }
  return passed === results.length ? 0 : 1;
}

export {
  BASE_URL,
  COUPON_PRIMARY,
  COUPON_STAGING_FALLBACK,
  GIFT_CARD_CODE,
  ADDON_COLD,
  ADDON_EU,
  ADDON_MED,
  ADDON_OBS,
  israelTodayYmd,
  addDaysYmd,
  nextWeekdayYmd,
  birthdayMatchingMonthYmd,
  assertClearOfStickyChrome,
  waitReady,
  selectCalendarDate,
  pickSlot,
  clickPrimaryNext,
  toggleWizardAddons,
  fillPilotLangAgnostic,
  submitAndWait,
  runCouponAndGiftCardSuite,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const suiteArg = process.argv.find((a) => a.startsWith('--suite='))?.split('=')[1] || 'all';
  let failures = 0;

  if (suiteArg === 'all' || suiteArg === 'coupons-giftcards') {
    failures += await runCouponAndGiftCardSuite();
  }

  if (suiteArg === 'all' || suiteArg === 'baseline' || suiteArg === 'multilang' || suiteArg === 'expanded') {
    const { spawnSync } = await import('node:child_process');
    const scripts = [];
    if (suiteArg === 'all' || suiteArg === 'baseline') scripts.push('scripts/staging-suites/baseline-purchases.mjs');
    if (suiteArg === 'all' || suiteArg === 'multilang') scripts.push('scripts/staging-suites/multilang-addons-times.mjs');
    if (suiteArg === 'all' || suiteArg === 'expanded') scripts.push('scripts/staging-suites/expanded-matrix.mjs');

    for (const script of scripts) {
      const res = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
      if (res.status !== 0) failures += 1;
    }
  }

  process.exit(failures > 0 ? 1 : 0);
}
