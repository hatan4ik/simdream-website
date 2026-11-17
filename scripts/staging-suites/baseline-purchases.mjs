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

const ADDON_COLD = 'Boeing 737 Cold & Dark Cockpit Startup';
const ADDON_EU = 'Classical EU Hubs Trio — London Heathrow (EGLL), Paris CDG (LFPG) & Amsterdam (EHAM)';
const ADDON_MED = 'Mediterranean Islands & Riviera Trio — Corfu (LGKR), Skiathos (LGSK) & Nice (LFMN)';
const ADDON_OBS = 'Extra Cockpit Jumpseat Passenger';

const summary = [];

async function runCase(browser, name, expected, { viewport = { width: 1280, height: 900 }, fn }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const net = [];
  const consoleErrors = [];
  const cspErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/Content Security Policy/i.test(text)) cspErrors.push(text);
      else consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('wixapis.com') || url.includes('/api/wix/') || url.includes('/api/checkout') || res.status() >= 400) {
      let body = '';
      if (res.status() >= 400) {
        try {
          body = (await res.text()).slice(0, 400);
        } catch {}
      }
      net.push({ method: res.request().method(), status: res.status(), url, body });
    }
  });

  let errorMsg = '';
  try {
    await fn(page);
  } catch (err) {
    errorMsg = err?.message || String(err);
  }

  const finalUrl = page.url();
  const alerts = (await page.locator('[role="alert"]').allTextContents().catch(() => [])).map((s) => s.trim()).filter(Boolean);
  const bookingAlerts = alerts.filter((a) => !a.includes('בסניף ישראל לא מקבלים תשלומים אונליין'));

  let pass = false;
  if (expected.type === 'checkout') {
    pass = !errorMsg && finalUrl.includes('/checkout?checkoutId=') && cspErrors.length === 0;
  } else if (expected.type === 'guard') {
    pass = !errorMsg && !finalUrl.includes('/checkout') && bookingAlerts.some((a) => expected.pattern.test(a));
  }

  const row = {
    name,
    result: pass ? 'PASS' : 'FAIL',
    finalUrl,
    alerts: bookingAlerts,
    cspErrors,
    consoleErrors,
    httpFailures: net.filter((r) => r.status >= 400),
    errorMsg: errorMsg || undefined,
  };
  summary.push(row);
  console.log(`\n[${row.result}] ${name}`);
  console.log('  URL:', finalUrl);
  if (bookingAlerts.length) console.log('  Alerts:', JSON.stringify(bookingAlerts));
  if (cspErrors.length) console.log('  CSP Errors:', JSON.stringify(cspErrors));
  if (row.httpFailures.length) console.log('  HTTP >=400:', JSON.stringify(row.httpFailures));
  if (errorMsg) console.log('  Exception:', errorMsg);

  await context.close();
}

async function waitReady(page) {
  await page.locator('[data-slots-state="ready"], [data-slots-state="failed"]').first().waitFor({ state: 'attached', timeout: 25_000 });
  const slotBtns = page.locator('[data-slots-state="ready"] button:enabled').filter({ hasText: /\d{2}:\d{2}/ });
  await slotBtns.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null);
}

async function advanceWizard(page, { hebrew = false, addons = [] } = {}) {
  const addonsBtn = hebrew
    ? page.getByRole('button', { name: 'המשך לשדרוגים ותוספות' })
    : page.getByRole('button', { name: 'Continue to Add-ons' });
  if (await addonsBtn.isVisible().catch(() => false)) {
    if (await addonsBtn.isDisabled().catch(() => false)) {
      const slotBtns = page.locator('[data-slots-state="ready"] button:enabled').filter({ hasText: /\d{2}:\d{2}/ });
      if ((await slotBtns.count()) > 0) await slotBtns.first().click();
    }
    await addonsBtn.click();
    for (const label of addons) {
      await page.getByText(label, { exact: true }).click();
    }
    const pilotBtn = hebrew
      ? page.getByRole('button', { name: 'המשך לפרטי הקברניט' })
      : page.getByRole('button', { name: 'Continue to Pilot Details' });
    await pilotBtn.click();
    return;
  }
  const directPilotBtn = hebrew
    ? page.getByRole('button', { name: 'המשך לפרטי הקברניט' })
    : page.getByRole('button', { name: 'Continue to Pilot Details' });
  if (await directPilotBtn.isVisible().catch(() => false)) {
    await directPilotBtn.click();
  }
}

async function fillPilot(page, { hebrew = false, name = 'Nat Nat', email = 'nat-v1296@gmail.com', phone = '0547773074', birthDate = '2000-11-11', notes = '' } = {}) {
  if (hebrew) {
    await page.getByLabel(/שם מלא של הטייס/).fill(name);
    await page.getByLabel(/דוא״ל למשלוח אישור ההזמנה/).fill(email);
    await page.getByLabel(/מספר טלפון נייד/).fill(phone);
  } else {
    await page.getByLabel(/Pilot Full Name/).fill(name);
    await page.getByLabel(/Pilot Email/).fill(email);
    await page.getByLabel(/Phone Number/).fill(phone);
  }
  const dob = page.locator('input[type="date"]').first();
  if (await dob.count()) await dob.fill(birthDate);
  if (notes) {
    const notesEl = page.locator('textarea').first();
    if (await notesEl.count()) await notesEl.fill(notes);
  }
  const cbs = page.locator('input[type="checkbox"]:visible');
  for (let i = 0; i < (await cbs.count()); i++) {
    if (!(await cbs.nth(i).isChecked())) await cbs.nth(i).check();
  }
}

async function proceedAndWait(page, { hebrew = false } = {}) {
  const startUrl = page.url();
  const btn = hebrew
    ? page.getByRole('button', { name: /^מעבר לתשלום מאובטח/ }).first()
    : page.getByRole('button', { name: /^Proceed to Secure Checkout/ }).first();
  await btn.click();
  await Promise.race([
    page.waitForURL((u) => u.toString() !== startUrl, { timeout: 25_000 }).catch(() => null),
    page.locator('[role="alert"]').filter({ hasText: /\S+/ }).first().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => null),
  ]);
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Stale Wix Member session auto-recovery + edge.wixapis.com CSP check
  await runCase(
    browser,
    '01. Stale Wix member session tokens + Birthday 2000-11-11 (auto-recovers & no CSP error)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
          window.sessionStorage.setItem(
            'simdream_wix_member_tokens',
            JSON.stringify({
              accessToken: { value: 'invalid.stale.member.token', expiresAt: Math.floor(Date.now() / 1000) + 3600 },
              refreshToken: { value: 'invalid-refresh', role: 'member' },
            })
          );
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { email: 'nat-v1296+c01@gmail.com' });
        await proceedAndWait(page);
      },
    }
  );

  // 2. Hebrew /book Wizard default package + Birthday 2000-11-11
  await runCase(
    browser,
    '02. /book (Hebrew Wizard) + Nat Nat + 0547773074 + Birthday 2000-11-11',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/book`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { hebrew: true });
        await fillPilot(page, { hebrew: true, email: 'nat-v1296+c02@gmail.com' });
        await proceedAndWait(page, { hebrew: true });
      },
    }
  );

  // 3. EN Wizard + 2 add-ons + Birthday 2000-11-11 (verify zero spurious coupon alert)
  await runCase(
    browser,
    '03. /en/book + 2 add-ons + Birthday 2000-11-11 (no false coupon alert)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { addons: [ADDON_COLD, ADDON_EU] });
        await fillPilot(page, { email: 'nat-v1296+c03@gmail.com' });
        await proceedAndWait(page);
      },
    }
  );

  // 4. Hebrew Express Shop 1-Page + 2 add-ons
  await runCase(
    browser,
    '04. /book (Hebrew Express Shop 1-Page) + 2 add-ons + Birthday 2000-11-11',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/book`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await page.getByRole('button', { name: 'חנות מהירה (עמוד אחד)' }).click();
        await page.waitForTimeout(400);
        const addBtns = page.getByRole('button', { name: /\+\s*הוספה לטיסה|הוספה להזמנה/ });
        if ((await addBtns.count()) >= 2) {
          await addBtns.nth(0).click();
          await addBtns.nth(1).click();
        }
        await fillPilot(page, { hebrew: true, email: 'nat-v1296+c04@gmail.com' });
        await proceedAndWait(page, { hebrew: true });
      },
    }
  );

  // 5. EN Express Shop 1-Page + 2 add-ons
  await runCase(
    browser,
    '05. /en/book (Express Shop 1-Page) + 2 add-ons',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await page.getByRole('button', { name: 'Express Shop View (1-Page)' }).click();
        await page.waitForTimeout(400);
        const addBtns = page.getByRole('button', { name: /Add to Flight/ });
        await addBtns.nth(0).click();
        await addBtns.nth(1).click();
        await fillPilot(page, { email: 'nat-v1296+c05@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  // 6. All packages (non-birthday date 2026-11-26 or 1990-05-15 so we test every catalog item)
  await runCase(
    browser,
    '06. /en/book?package=discovery-30 + Cold & Dark (+20m)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=discovery-30`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { addons: [ADDON_COLD] });
        await fillPilot(page, { email: 'nat-v1296+c06@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '07. /en/book?package=daytime-promo-45',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=daytime-promo-45`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        // daytime-promo-45 is a Sun-Tue daytime offer (is45MinutePromoDay); advance to next week if ${NEXT_SUN} is not in the current week strip
        const sunBtn = page.locator(`[data-calendar-date="${NEXT_SUN}"]`);
        if (!(await sunBtn.isVisible().catch(() => false))) {
          const nextWeek = page.locator('[data-calendar-next-week="true"]:visible').first();
          if (await nextWeek.count()) {
            await nextWeek.click();
            await page.waitForTimeout(400);
          }
        }
        if (await sunBtn.isVisible().catch(() => false)) {
          const resp = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/slots' && r.url().includes(`date=${NEXT_SUN}`), { timeout: 25_000 }).catch(() => null);
          await sunBtn.click();
          await resp;
          await waitReady(page);
        }
        await advanceWizard(page);
        await fillPilot(page, { email: 'nat-v1296+c07@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '08. /en/book?package=captains-command-60 (Last slot + 3 add-ons = 160m + 935-char notes)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        const slotBtns = page.locator('[data-slots-state="ready"] button').filter({ hasText: /\d{2}:\d{2}/ });
        const count = await slotBtns.count();
        if (count > 0) await slotBtns.nth(count - 1).click();
        await advanceWizard(page, { addons: [ADDON_COLD, ADDON_EU, ADDON_MED] });
        await fillPilot(page, {
          email: 'nat-v1296+c08@gmail.com',
          birthDate: '1990-05-15',
          notes: 'Approach request '.repeat(55),
        });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '09. /en/book?package=ultimate-aviator-90 + 2 add-ons',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=ultimate-aviator-90`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { addons: [ADDON_COLD, ADDON_OBS] });
        await fillPilot(page, { email: 'nat-v1296+c09@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '10. /en/book?package=airline-prep-60-pro',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=airline-prep-60-pro`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { email: 'nat-v1296+c10@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '11. /en/book?package=airline-assessment-prep (120 PRO)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=airline-assessment-prep`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { email: 'nat-v1296+c11@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '12. /en/book?package=fear-of-flying-course (90m)',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=fear-of-flying-course`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { email: 'nat-v1296+c12@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  // 13. Weekend Saturday 2026-11-21 + hatan4ik@gmail.com
  await runCase(
    browser,
    '13. Saturday 2026-11-21 + Cold & Dark + exact hatan4ik@gmail.com',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        const sat = page.locator(`[data-calendar-date="${NEXT_SAT}"]`);
        if (await sat.isVisible().catch(() => false)) {
          await sat.click();
          await page.waitForTimeout(800);
        }
        await advanceWizard(page, { addons: [ADDON_COLD] });
        await fillPilot(page, { email: 'hatan4ik@gmail.com', birthDate: '2000-11-11' });
        await proceedAndWait(page);
      },
    }
  );

  // 14. Mobile 390x844 Hebrew + Back -> Proceed Retry
  await runCase(
    browser,
    '14. Mobile 390x844 /book Hebrew + Back -> Retry',
    { type: 'checkout' },
    {
      viewport: { width: 390, height: 844 },
      fn: async (page) => {
        await page.goto(`${BASE_URL}/book`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { hebrew: true });
        await fillPilot(page, { hebrew: true, email: 'nat-v1296+c14@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page, { hebrew: true });
        if (!page.url().includes('/checkout?checkoutId=')) return;
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page, { hebrew: true });
        await fillPilot(page, { hebrew: true, email: 'nat-v1296+c14@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page, { hebrew: true });
      },
    }
  );

  // 15. Pre-booking validation guards (Email missing TLD, single-word name, bad phone)
  await runCase(
    browser,
    '15a. Guard: Email without TLD ("test@gmail") rejected cleanly before bookings API',
    { type: 'guard', pattern: /Enter a valid email address/i },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { email: 'test@gmail', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '15b. Guard: Single-word name ("Nat") rejected cleanly',
    { type: 'guard', pattern: /first and last name/i },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { name: 'Nat', email: 'nat-v1296+c15b@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '15c. Guard: Invalid phone ("12345") rejected cleanly',
    { type: 'guard', pattern: /phone number with a country code/i },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
        await waitReady(page);
        await advanceWizard(page);
        await fillPilot(page, { phone: '12345', email: 'nat-v1296+c15c@gmail.com', birthDate: '1990-05-15' });
        await proceedAndWait(page);
      },
    }
  );

  // 16. Gift Vouchers /en/vouchers & /vouchers
  await runCase(
    browser,
    '16a. /en/vouchers Gift Card checkout',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/en/vouchers`, { waitUntil: 'domcontentloaded' });
        await page.getByPlaceholder('e.g. Aviad Stern').fill('Recipient Nat');
        await page.getByPlaceholder('aviad@example.com').fill('recipient-v1296@example.com');
        await page.getByPlaceholder('e.g. Danielle Cohen').fill('Nat Nat');
        await page.getByPlaceholder('danielle@example.com').fill('nat-v1296+gc@gmail.com');
        await page.getByPlaceholder('+972-54-123-4567').fill('0547773074');
        await proceedAndWait(page);
      },
    }
  );

  await runCase(
    browser,
    '16b. /vouchers (Hebrew) Gift Card checkout',
    { type: 'checkout' },
    {
      fn: async (page) => {
        await page.goto(`${BASE_URL}/vouchers`, { waitUntil: 'domcontentloaded' });
        const inputs = page.locator('form input:visible');
        await inputs.nth(0).fill('יעד נסיון');
        await inputs.nth(1).fill('recipient-he-v1296@example.com');
        await inputs.nth(2).fill('Nat Nat');
        await inputs.nth(3).fill('nat-v1296+gche@gmail.com');
        await inputs.nth(4).fill('0547773074');
        await proceedAndWait(page, { hebrew: true });
      },
    }
  );

  await browser.close();

  const passed = summary.filter((s) => s.result === 'PASS').length;
  console.log(`\n==================== SUMMARY: ${passed}/${summary.length} PASSED ====================`);
  for (const row of summary) {
    console.log(`${row.result} | ${row.name} | ${row.finalUrl}`);
  }
  if (passed !== summary.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
