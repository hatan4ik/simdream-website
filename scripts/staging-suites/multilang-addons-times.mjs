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

async function runCase(browser, name, fn) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const httpFailures = [];
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
    if (res.status() >= 400) {
      let body = '';
      try { body = (await res.text()).slice(0, 500); } catch {}
      httpFailures.push({ method: res.request().method(), status: res.status(), url: res.url(), body });
    }
  });

  let exception = '';
  try {
    await fn(page);
  } catch (err) {
    exception = err?.message || String(err);
  }

  const finalUrl = page.url();
  const rawAlerts = (await page.locator('[role="alert"]').allTextContents().catch(() => []))
    .map((s) => s.trim())
    .filter(Boolean);
  const alerts = rawAlerts.filter((a) => !a.includes('בסניף ישראל לא מקבלים תשלומים אונליין'));

  const ok = !exception && finalUrl.includes('/checkout?checkoutId=') && cspErrors.length === 0;
  const entry = {
    name,
    status: ok ? 'PASS' : 'FAIL',
    finalUrl,
    alerts,
    cspErrors,
    consoleErrors,
    httpFailures,
    exception: exception || undefined,
  };
  results.push(entry);
  console.log(`\n[${entry.status}] ${name}`);
  console.log('  URL:', finalUrl);
  if (alerts.length) console.log('  Alerts:', JSON.stringify(alerts));
  if (cspErrors.length) console.log('  CSP Errors:', JSON.stringify(cspErrors));
  if (httpFailures.length) console.log('  HTTP >=400:', JSON.stringify(httpFailures));
  if (consoleErrors.length && !ok) console.log('  Console:', JSON.stringify(consoleErrors.slice(0, 4)));
  if (exception) console.log('  Exception:', exception);

  await context.close();
}

async function waitReady(page) {
  await page.locator('[data-slots-state="ready"], [data-slots-state="failed"]').first().waitFor({ state: 'attached', timeout: 25_000 });
}

async function clickPrimaryNext(page) {
  const btns = page.locator('button[data-ui-control="button"][data-button-variant="primary"]:visible');
  await btns.last().click();
}

async function pickSlotByHourOrIndex(page, { hour, index, fromEnd } = {}) {
  const slotBtns = page.locator('[data-slots-state="ready"] button').filter({ hasText: /\d{2}:\d{2}/ });
  const count = await slotBtns.count();
  if (count === 0) throw new Error('No visible slot buttons');
  if (hour) {
    const exact = slotBtns.filter({ hasText: new RegExp(`\\b${hour}\\b`) }).first();
    if (await exact.isVisible().catch(() => false)) {
      await exact.click();
      return (await exact.innerText()).replace(/\s+/g, ' ').trim();
    }
  }
  const targetIdx = fromEnd ? Math.max(0, count - 1) : Math.min(index ?? 0, count - 1);
  const btn = slotBtns.nth(targetIdx);
  await btn.click();
  return (await btn.innerText()).replace(/\s+/g, ' ').trim();
}

async function toggleWizardAddons(page, addonIds) {
  const skipped = [];
  for (const id of addonIds) {
    const cb = page.locator(`input[id$="-addon-${id}"]`);
    if ((await cb.count()) === 0) throw new Error(`Addon checkbox not found: ${id}`);
    await cb.scrollIntoViewIfNeeded();
    if (await cb.isDisabled()) {
      skipped.push(id);
      continue;
    }
    await cb.check();
  }
  if (skipped.length) console.log('  Disabled (exceeds slot window):', JSON.stringify(skipped));
}

async function fillPilotLangAgnostic(page, { name = 'Nat Nat', email, phone = '0547773074', birthDate = '1990-05-15' }) {
  const emailInput = page.locator('input[type="email"]:visible').first();
  const phoneInput = page.locator('input[type="tel"]:visible').first();
  const nameInput = page.locator('input[autocomplete="name"]:visible, input[type="text"]:visible').first();
  await nameInput.fill(name);
  await emailInput.fill(email);
  await phoneInput.fill(phone);

  const dob = page.locator('input[type="date"]:visible').first();
  if (await dob.count()) await dob.fill(birthDate);

  const cbs = page.locator('input[type="checkbox"]:visible');
  for (let i = 0; i < (await cbs.count()); i++) {
    const cb = cbs.nth(i);
    await cb.scrollIntoViewIfNeeded();
    if (!(await cb.isChecked())) await cb.check();
  }
}

async function submitAndWait(page) {
  const startUrl = page.url();
  await page.locator('button[type="submit"][data-ui-control="button"]').last().click();
  await Promise.race([
    page.waitForURL((u) => u.toString() !== startUrl, { timeout: 25_000 }).catch(() => null),
    page.locator('[role="alert"]').filter({ hasText: /\S+/ }).first().waitFor({ state: 'visible', timeout: 25_000 }).catch(() => null),
  ]);
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Part 1: ALL 7 languages with multiple add-ons across different time slots
  const langCases = [
    {
      label: 'L1. HE (/book) morning slot + 2 add-ons (cold-dark, xwind-ifr) + Birthday 2000-11-11',
      path: '/book',
      slotOpts: { index: 0 },
      addons: ['addon-cold-dark', 'addon-xwind-ifr'],
      birthDate: '2000-11-11',
      email: 'nat-ml+he@gmail.com',
    },
    {
      label: 'L2. EN (/en/book) 12:00 slot + 3 add-ons (cold-dark, xwind-ifr, classical-eu)',
      path: '/en/book',
      slotOpts: { hour: '12:00', index: 2 },
      addons: ['addon-cold-dark', 'addon-xwind-ifr', 'addon-classical-eu'],
      birthDate: '1990-05-15',
      email: 'nat-ml+en@gmail.com',
    },
    {
      label: 'L3. RU (/ru/book) 18:00 prime slot + 3 add-ons (cold-dark, extreme-airports, night-neon) + Birthday 2000-11-11',
      path: '/ru/book',
      slotOpts: { hour: '18:00', index: 6 },
      addons: ['addon-cold-dark', 'addon-extreme-airports', 'addon-night-neon'],
      birthDate: '2000-11-11',
      email: 'nat-ml+ru@gmail.com',
    },
    {
      label: 'L4. FR (/fr/book) 15:00 slot + 2 add-ons (med-islands, extra-seat)',
      path: '/fr/book',
      slotOpts: { hour: '15:00', index: 4 },
      addons: ['addon-med-islands', 'addon-extra-seat'],
      birthDate: '1990-05-15',
      email: 'nat-ml+fr@gmail.com',
    },
    {
      label: 'L5. AR (/ar/book RTL) 20:00 evening slot + 3 add-ons (alpine-mountains, tropical-ocean, extra-seat)',
      path: '/ar/book',
      slotOpts: { hour: '20:00', index: 8 },
      addons: ['addon-alpine-mountains', 'addon-tropical-ocean', 'addon-extra-seat'],
      birthDate: '1990-05-15',
      email: 'nat-ml+ar@gmail.com',
    },
    {
      label: 'L6. ES (/es/book) last evening slot + 2 add-ons (us-megacities, middle-east-legends)',
      path: '/es/book',
      slotOpts: { fromEnd: true },
      addons: ['addon-us-megacities', 'addon-middle-east-legends'],
      birthDate: '1990-05-15',
      email: 'nat-ml+es@gmail.com',
    },
    {
      label: 'L7. DE (/de/book) today + 2 add-ons (cold-dark, classical-eu) + Birthday 2000-11-11',
      path: '/de/book',
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()),
      slotOpts: { index: 0 },
      addons: ['addon-cold-dark', 'addon-classical-eu'],
      birthDate: '2000-11-11',
      email: 'nat-ml+de@gmail.com',
    },
  ];

  for (const c of langCases) {
    await runCase(browser, c.label, async (page) => {
      await page.goto(`${BASE_URL}${c.path}`, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      if (c.date) {
        const d = page.locator(`[data-calendar-date="${c.date}"]`);
        if (await d.isVisible().catch(() => false)) {
          const resp = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/slots' && r.url().includes(`date=${c.date}`), { timeout: 25_000 }).catch(() => null);
          await d.click();
          await resp;
          await waitReady(page);
        }
      }
      const chosenSlot = await pickSlotByHourOrIndex(page, c.slotOpts);
      console.log(`  Slot chosen (${c.path}): ${chosenSlot}`);
      await clickPrimaryNext(page);
      await toggleWizardAddons(page, c.addons);
      await clickPrimaryNext(page);
      await fillPilotLangAgnostic(page, { email: c.email, birthDate: c.birthDate });
      await submitAndWait(page);
    });
  }

  // Part 2: Heavy Add-on + Time Stress Tests
  // S1: 6 add-ons at once (+180m -> 240m total!) on 18:00
  await runCase(browser, 'S1. EN Captain-60 + 6 add-ons (+180m -> 240m!) on 18:00', async (page) => {
    await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const chosen = await pickSlotByHourOrIndex(page, { hour: '18:00', index: 6 });
    console.log('  Slot:', chosen);
    await clickPrimaryNext(page);
    await toggleWizardAddons(page, [
      'addon-cold-dark',
      'addon-xwind-ifr',
      'addon-extreme-airports',
      'addon-classical-eu',
      'addon-med-islands',
      'addon-us-megacities',
    ]);
    await clickPrimaryNext(page);
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s1@gmail.com' });
    await submitAndWait(page);
  });

  // S2: Pre-selected 4 add-ons via URL (?addons=...) -> test slot list & pick LAST slot (21:30?)
  await runCase(browser, 'S2. EN Captain-60 with 4 URL add-ons -> pick LAST visible slot', async (page) => {
    await page.goto(
      `${BASE_URL}/en/book?package=captains-command-60&addons=addon-cold-dark,addon-xwind-ifr,addon-classical-eu,addon-med-islands`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitReady(page);
    const chosen = await pickSlotByHourOrIndex(page, { fromEnd: true });
    console.log('  Last visible slot with 4 add-ons:', chosen);
    await clickPrimaryNext(page);
    await clickPrimaryNext(page);
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s2@gmail.com' });
    await submitAndWait(page);
  });

  // S3: discovery-30 + 3 add-ons (+100m -> 130m) on midday slot
  await runCase(browser, 'S3. EN discovery-30 + 3 add-ons (+100m -> 130m) midday slot', async (page) => {
    await page.goto(`${BASE_URL}/en/book?package=discovery-30`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const chosen = await pickSlotByHourOrIndex(page, { index: 3 });
    console.log('  Slot:', chosen);
    await clickPrimaryNext(page);
    await toggleWizardAddons(page, ['addon-cold-dark', 'addon-classical-eu', 'addon-med-islands']);
    await clickPrimaryNext(page);
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s3@gmail.com' });
    await submitAndWait(page);
  });

  // S4: Pick slot -> add 3 add-ons -> Go Back -> switch to another slot & date -> Proceed
  await runCase(browser, 'S4. Pick slot -> add 3 add-ons -> Back -> change date/slot -> Proceed', async (page) => {
    await page.goto(`${BASE_URL}/en/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await pickSlotByHourOrIndex(page, { index: 1 });
    await clickPrimaryNext(page);
    await toggleWizardAddons(page, ['addon-cold-dark', 'addon-classical-eu', 'addon-med-islands']);
    await page.getByRole('button', { name: 'Back' }).first().click();
    const fri = page.locator(`[data-calendar-date="${NEXT_FRI}"]`);
    if (await fri.isVisible().catch(() => false)) {
      const resp = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/slots' && r.url().includes(`date=${NEXT_FRI}`), { timeout: 25_000 }).catch(() => null);
      await fri.click();
      await resp;
      await waitReady(page);
    }
    const chosen = await pickSlotByHourOrIndex(page, { hour: '19:00', index: 5 });
    console.log('  New slot after Back:', chosen);
    await clickPrimaryNext(page);
    await clickPrimaryNext(page);
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s4@gmail.com' });
    await submitAndWait(page);
  });

  // S5: Express Shop -> select 4 add-ons -> switch slot twice -> switch language/date -> Proceed
  await runCase(browser, 'S5. DE (/de/book) Express Shop + 4 add-ons + change slot', async (page) => {
    await page.goto(`${BASE_URL}/de/book`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await page.locator('[data-booking-view="storefront"]').click();
    await page.waitForTimeout(400);
    for (const id of ['addon-cold-dark', 'addon-classical-eu', 'addon-med-islands', 'addon-extra-seat']) {
      await page.locator(`[data-addon-card="${id}"] button`).first().click();
    }
    const slotBtns = page.locator('button:enabled', {
      has: page.locator('span[dir="ltr"]', { hasText: /^\d{2}:\d{2}$/ }),
    });
    if ((await slotBtns.count()) > 0) await slotBtns.first().click();
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s5@gmail.com' });
    await submitAndWait(page);
  });

  // S6: Order Summary remove 1 add-on before submitting + Birthday
  await runCase(browser, 'S6. FR (/fr/book) add 3 add-ons -> remove 1 in OrderSummary -> Proceed', async (page) => {
    await page.goto(`${BASE_URL}/fr/book?package=captains-command-60`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await pickSlotByHourOrIndex(page, { index: 2 });
    await clickPrimaryNext(page);
    await toggleWizardAddons(page, ['addon-cold-dark', 'addon-classical-eu', 'addon-extra-seat']);
    await clickPrimaryNext(page);
    const removeBtns = page.locator('[aria-label*="Retirer" i], [aria-label*="Supprimer" i], [aria-label*="Remove" i]');
    if ((await removeBtns.count()) > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(300);
    }
    await fillPilotLangAgnostic(page, { email: 'nat-ml+s6@gmail.com', birthDate: '2000-11-11' });
    await submitAndWait(page);
  });

  // Vouchers across remaining languages (DE, FR, RU, AR)
  for (const vLang of ['/de/vouchers', '/fr/vouchers', '/ru/vouchers', '/ar/vouchers']) {
    await runCase(browser, `V. Voucher checkout (${vLang})`, async (page) => {
      await page.goto(`${BASE_URL}${vLang}`, { waitUntil: 'domcontentloaded' });
      const inputs = page.locator('form input:visible');
      await inputs.nth(0).fill('Recipient Test');
      await inputs.nth(1).fill('recipient-v@example.com');
      await inputs.nth(2).fill('Nat Nat');
      await inputs.nth(3).fill('nat-ml+voucher@gmail.com');
      await inputs.nth(4).fill('0547773074');
      await submitAndWait(page);
    });
  }

  await browser.close();

  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n==================== FINAL SUMMARY: ${passed}/${results.length} PASSED ====================`);
  for (const r of results) {
    console.log(`${r.status} | ${r.name} | ${r.finalUrl}${r.alerts.length ? ` | alerts=${JSON.stringify(r.alerts)}` : ''}`);
  }
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
