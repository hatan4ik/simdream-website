import { chromium } from 'playwright';

const BASE_URL = process.env.STAGING_BASE_URL || 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com';

function israelTodayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function nextWeekdayYmd(targetDow, minDaysAhead = 1) {
  const today = israelTodayYmd();
  for (let offset = minDaysAhead; offset <= minDaysAhead + 14; offset += 1) {
    const candidate = addDaysYmd(today, offset);
    const [y, m, d] = candidate.split("-").map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === targetDow) return candidate;
  }
  return addDaysYmd(today, minDaysAhead);
}
const NEXT_SUN = nextWeekdayYmd(0);
const NEXT_FRI = nextWeekdayYmd(5);
const NEXT_SAT = nextWeekdayYmd(6);
const DAY_PLUS_1 = addDaysYmd(israelTodayYmd(), 1);
const DAY_PLUS_2 = addDaysYmd(israelTodayYmd(), 2);

const results = [];

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
      return style.display !== 'none' && style.position === 'sticky' && parseFloat(style.bottom) >= 0 && el.getBoundingClientRect().top > window.innerHeight * 0.5;
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
    const info = await locator.evaluate(() => [...document.querySelectorAll('.sticky')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => ({ cls: e.className.slice(0, 60), rect: e.getBoundingClientRect() })));
    throw new Error(`${label} obscured behind bottom sticky bar (boxTop=${box.y} >= limitTop=${limitTop}, stickies=${JSON.stringify(info)})`);
  }
}

async function runCase(browser, name, { viewport = { width: 1280, height: 900 } } = {}, fn) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(18_000);
  const httpFailures = [];
  const cspErrors = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      consoleErrors.push(txt);
      if (txt.includes('Content Security Policy')) cspErrors.push(txt);
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    if (res.status() >= 400 && (url.includes('wixapis') || url.includes('/api/'))) {
      let body = '';
      try { body = (await res.text()).slice(0, 220); } catch {}
      httpFailures.push({ method: res.request().method(), status: res.status(), url, body });
    }
  });

  let exception = null;
  try {
    await fn(page);
  } catch (err) {
    exception = String(err?.stack || err);
  }

  const finalUrl = page.url();
  const alerts = (await page.locator('[role="alert"]:visible').allInnerTexts().catch(() => [])).filter((t) => t.trim().length > 0);
  const ok = !exception && cspErrors.length === 0 && finalUrl.includes('/checkout');
  const entry = { name, status: ok ? 'PASS' : 'FAIL', finalUrl, alerts, cspErrors, httpFailures, exception };
  results.push(entry);
  console.log(`\n[${entry.status}] ${name}`);
  console.log('  URL:', finalUrl);
  if (alerts.length) console.log('  Alerts:', JSON.stringify(alerts));
  if (cspErrors.length) console.log('  CSP Errors:', JSON.stringify(cspErrors));
  if (httpFailures.length && !ok) console.log('  HTTP >=400:', JSON.stringify(httpFailures));
  if (exception) console.log('  Exception:', exception);
  await context.close();
}

async function waitReady(page) {
  await page.locator('[data-slots-state="ready"], [data-slots-state="failed"]').first().waitFor({ state: 'attached', timeout: 25_000 });
}

async function selectDate(page, dateStr) {
  for (let w = 0; w < 5; w++) {
    const btn = page.locator(`[data-calendar-date="${dateStr}"]`);
    if (await btn.count()) {
      await btn.scrollIntoViewIfNeeded();
      if ((await btn.getAttribute('aria-pressed')) !== 'true') {
        const respPromise = page
          .waitForResponse(
            (r) => new URL(r.url()).pathname === '/api/slots' && r.url().includes(`date=${dateStr}`),
            { timeout: 25_000 }
          )
          .catch(() => null);
        await btn.click();
        await respPromise;
      }
      await waitReady(page);
      await page.locator('[data-slots-state="ready"] button', { has: page.locator('span[dir="ltr"]', { hasText: /^\d{2}:\d{2}$/ }) }).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
      return;
    }
    const nextWeek = page.locator('[data-calendar-next-week="true"]:visible').first();
    if (await nextWeek.count()) await nextWeek.click();
    await page.waitForTimeout(600);
  }
  throw new Error(`Date not found in calendar: ${dateStr}`);
}

async function pickSlot(page, { hourRegex, index, fromEnd } = {}) {
  const btns = page.locator('[data-slots-state="ready"] button', { has: page.locator('span[dir="ltr"]', { hasText: /^\d{2}:\d{2}$/ }) });
  const count = await btns.count();
  if (!count) throw new Error('No slots rendered');
  let target;
  if (hourRegex) {
    const match = btns.filter({ hasText: hourRegex }).first();
    target = (await match.count()) ? match : btns.first();
  } else if (fromEnd) {
    target = btns.nth(count - 1);
  } else {
    target = btns.nth(Math.min(index ?? 0, count - 1));
  }
  await target.scrollIntoViewIfNeeded();
  await assertClearOfStickyChrome(target, 'slot-button');
  await target.click();
  return (await target.innerText()).replace(/\s+/g, ' ').trim();
}

async function clickWizardContinue(page) {
  const btn = page.locator('button[data-ui-control="button"][data-button-variant="primary"]:visible').last();
  await btn.click();
}

async function clickWizardBack(page) {
  const btn = page.locator('button[data-ui-control="button"][data-button-variant="secondary"]:visible').first();
  await btn.click();
}

async function toggleWizardAddons(page, addonIds) {
  const toggled = [];
  for (const id of addonIds) {
    const cb = page.locator(`input[id$="-addon-${id}"]`);
    await cb.waitFor({ state: 'attached', timeout: 10_000 });
    await cb.scrollIntoViewIfNeeded();
    await assertClearOfStickyChrome(cb, `wizard-addon-${id}`);
    if (!(await cb.isDisabled())) {
      await cb.check();
      toggled.push(id);
    }
  }
  return toggled;
}

async function toggleStorefrontAddons(page, addonIds) {
  const added = [];
  for (const id of addonIds) {
    const card = page.locator(`[data-addon-card="addon-${id}"]`);
    await card.scrollIntoViewIfNeeded();
    const btn = card.locator('button').last();
    if (!(await btn.isDisabled())) {
      await btn.click();
      added.push(id);
    }
  }
  return added;
}

async function removeStorefrontAddonAt(page, idx = 0) {
  const removeBtns = page.locator('#storefront-buy-box button[aria-label^="Remove "]');
  if ((await removeBtns.count()) > idx) {
    const btn = removeBtns.nth(idx);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
}

async function fillPilot(page, { name = 'Nat Nat', email, phone = '0547773074', birthDate = '1990-05-15' }) {
  const nameInput = page.locator('input[autocomplete="name"]:visible, input[id$="-pilot-name"]:visible').first();
  const emailInput = page.locator('input[type="email"]:visible').first();
  const phoneInput = page.locator('input[type="tel"]:visible').first();
  await nameInput.scrollIntoViewIfNeeded();
  await assertClearOfStickyChrome(nameInput, 'pilot-name');
  await nameInput.fill(name);
  await emailInput.fill(email);
  await phoneInput.fill(phone);
  const dob = page.locator('input[type="date"]:visible').first();
  if (await dob.count()) {
    await dob.scrollIntoViewIfNeeded();
    await dob.fill(birthDate);
  }
  const cbs = page.locator('input[type="checkbox"]:visible');
  for (let i = 0; i < (await cbs.count()); i++) {
    const cb = cbs.nth(i);
    await cb.scrollIntoViewIfNeeded();
    await assertClearOfStickyChrome(cb, `consent-cb-${i}`);
    if (!(await cb.isChecked())) await cb.check();
  }
}

async function submitAndWaitCheckout(page) {
  const startUrl = page.url();
  const submitBtn = page.locator('button[type="submit"][data-ui-control="button"]:visible').last();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await Promise.race([
    page.waitForURL((u) => u.toString() !== startUrl, { timeout: 35_000 }).catch(() => null),
    page.locator('[role="alert"]:visible').filter({ hasText: /\S/ }).first().waitFor({ state: 'visible', timeout: 35_000 }).catch(() => null),
  ]);
  await page.waitForTimeout(700);
}

async function runVoucherCase(browser, name, path, { viewport = { width: 1280, height: 900 }, email } = {}) {
  await runCase(browser, name, { viewport }, async (page) => {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const textInputs = page.locator('input[type="text"]:visible');
    const textCount = await textInputs.count();
    for (let i = 0; i < textCount; i++) {
      await textInputs.nth(i).fill(i === 0 ? 'Aviad Tester' : 'Nat Nat');
    }
    await page.locator('input[type="email"]:visible').last().fill(email);
    await page.locator('input[type="tel"]:visible').first().fill('0547773074');
    const cbs = page.locator('input[type="checkbox"]:visible');
    for (let i = 0; i < (await cbs.count()); i++) {
      const cb = cbs.nth(i);
      await cb.scrollIntoViewIfNeeded();
      if (!(await cb.isChecked())) await cb.check();
    }
    await submitAndWaitCheckout(page);
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // MOBILE MULTI-LANGUAGE + RTL + MULTI-ADDON + BACK/SLOT CHANGE (390x844)
  await runCase(browser, 'M1. Mobile AR RTL (/ar/book) + 3 add-ons + evening slot', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(`${BASE_URL}/ar/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_1);
    await pickSlot(page, { hourRegex: /\b(18|19|20|21):/ });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'xwind-ifr', 'extra-seat']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-m1@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'M2. Mobile DE (/de/book) + morning slot + 3 add-ons + Birthday 2000-11-11', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(`${BASE_URL}/de/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { hourRegex: /\b(09|10|11):/ });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'classical-eu', 'med-islands']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-m2@gmail.com', birthDate: '2000-11-11' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'M3. Mobile RU (/ru/book) + Back + change slot + 3 add-ons', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(`${BASE_URL}/ru/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_1);
    await pickSlot(page, { index: 0 });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'xwind-ifr']);
    await clickWizardBack(page);
    await pickSlot(page, { fromEnd: true });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['extra-seat']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-m3@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'M4. Mobile FR (/fr/book) + late evening slot + 2 add-ons', { viewport: { width: 390, height: 844 } }, async (page) => {
    await page.goto(`${BASE_URL}/fr/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { fromEnd: true });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['alpine-mountains', 'night-neon']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-m4@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  // EXPRESS SHOP ACROSS LANGUAGES + MULTI-ADDON + REMOVE + CHANGE SLOT
  await runCase(browser, 'E1. Express Shop AR RTL (/ar/book) + 4 add-ons -> remove 1 -> switch slot', {}, async (page) => {
    await page.goto(`${BASE_URL}/ar/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.locator('[data-booking-view="storefront"]').click();
    await selectDate(page, DAY_PLUS_1);
    await pickSlot(page, { index: 0 });
    await toggleStorefrontAddons(page, ['cold-dark', 'xwind-ifr', 'classical-eu', 'extra-seat']);
    await removeStorefrontAddonAt(page, 1);
    await pickSlot(page, { hourRegex: /\b1[5-8]:/ });
    await fillPilot(page, { email: 'nat-e1@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'E2. Express Shop RU (/ru/book) + 5 add-ons + midday slot', {}, async (page) => {
    await page.goto(`${BASE_URL}/ru/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.locator('[data-booking-view="storefront"]').click();
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { hourRegex: /\b1[2-4]:/ });
    await toggleStorefrontAddons(page, ['cold-dark', 'xwind-ifr', 'classical-eu', 'med-islands', 'extra-seat']);
    await fillPilot(page, { email: 'nat-e2@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'E3. Express Shop ES (/es/book) + 18:00 prime + 3 add-ons -> remove 1', {}, async (page) => {
    await page.goto(`${BASE_URL}/es/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.locator('[data-booking-view="storefront"]').click();
    await selectDate(page, DAY_PLUS_1);
    await pickSlot(page, { hourRegex: /\b18:/ });
    await toggleStorefrontAddons(page, ['cold-dark', 'extreme-airports', 'us-megacities']);
    await removeStorefrontAddonAt(page, 0);
    await fillPilot(page, { email: 'nat-e3@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'E4. Express Shop HE (/book) + last slot + 3 add-ons + Birthday 2000-11-11', {}, async (page) => {
    await page.goto(`${BASE_URL}/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.locator('[data-booking-view="storefront"]').click();
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { index: 0 });
    await toggleStorefrontAddons(page, ['cold-dark', 'xwind-ifr', 'extra-seat']);
    await pickSlot(page, { fromEnd: true });
    await fillPilot(page, { email: 'nat-e4@gmail.com', birthDate: '2000-11-11' });
    await submitAndWaitCheckout(page);
  });

  // DIFFERENT HOURS & PACKAGES & FRIDAY
  await runCase(browser, 'T1. Friday 2026-11-20 earliest morning slot + 4 add-ons (+120m -> 180m)', {}, async (page) => {
    await page.goto(`${BASE_URL}/en/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, NEXT_FRI);
    await pickSlot(page, { index: 0 });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'classical-eu', 'med-islands', 'alpine-mountains']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-t1@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'T2. EN discovery-30 morning slot + 4 add-ons', {}, async (page) => {
    await page.goto(`${BASE_URL}/en/book?package=discovery-30`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { hourRegex: /\b(09|10|11):/ });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'xwind-ifr', 'classical-eu', 'extra-seat']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-t2@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'T3. EN ultimate-aviator-90 midday slot + 3 add-ons', {}, async (page) => {
    await page.goto(`${BASE_URL}/en/book?package=ultimate-aviator-90`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_1);
    await pickSlot(page, { hourRegex: /\b1[2-5]:/ });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['cold-dark', 'classical-eu', 'extra-seat']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-t3@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  await runCase(browser, 'T4. ES (/es/book) late evening slot + 2 add-ons', {}, async (page) => {
    await page.goto(`${BASE_URL}/es/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await selectDate(page, DAY_PLUS_2);
    await pickSlot(page, { hourRegex: /\b(20|21):/ });
    await clickWizardContinue(page);
    await toggleWizardAddons(page, ['night-neon', 'middle-east-legends']);
    await clickWizardContinue(page);
    await fillPilot(page, { email: 'nat-t4@gmail.com' });
    await submitAndWaitCheckout(page);
  });

  // REMAINING VOUCHER LOCALES + MOBILE VOUCHER
  await runVoucherCase(browser, 'V1. Voucher /en/vouchers Desktop', '/en/vouchers', { email: 'nat-v1@gmail.com' });
  await runVoucherCase(browser, 'V2. Voucher /vouchers Mobile HE RTL', '/vouchers', { viewport: { width: 390, height: 844 }, email: 'nat-v2@gmail.com' });
  await runVoucherCase(browser, 'V3. Voucher /es/vouchers Desktop', '/es/vouchers', { email: 'nat-v3@gmail.com' });

  await browser.close();
  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n==================== EXPANDED MATRIX SUMMARY: ${passed}/${results.length} PASSED ====================`);
  for (const r of results) console.log(`${r.status} | ${r.name} | ${r.finalUrl}`);
  if (passed !== results.length) process.exit(1);
})();
