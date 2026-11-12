import type { Page } from '@playwright/test';
import { FACILITY_INFO } from '../../lib/config/facility-info';
import { preferLanguage } from '../support/e2e';
import { expect, recordRequests, test } from './fixtures';

/**
 * The unlisted /refund page: a three-step form with a live "what to expect" panel, an honest
 * success, and an honest "nothing was sent" ending. The browser-test server has no Supabase and no
 * SendGrid and opts into the in-memory store, so a submit is stored in memory and no email goes out.
 */
const REFERENCE = /^RF-[A-HJ-NP-Z2-9]{6}$/;
const SEED_VOUCHER = { code: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA', buyer: 'michal@example.com' };

function israelDate(offsetDays: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

async function openForm(page: Page): Promise<void> {
  await page.goto('/refund');
  await expect(page.getByRole('heading', { level: 1, name: 'Ask for a refund' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Which order is this about?' })).toBeVisible();
}

async function fillOrder(page: Page, order: { reference: string; email: string; sessionDate?: string; sessionTime?: string; voucher?: boolean }) {
  if (order.voucher) await page.getByRole('radio', { name: /A gift voucher/ }).check();
  await page.getByLabel('Booking reference, voucher code or order number').fill(order.reference);
  await page.getByLabel('Email used for the order').fill(order.email);
  await page.getByLabel('Your full name').fill('Dana Pilot');
  await page.getByLabel('Phone number').fill('+972501234567');
  if (order.sessionDate) await page.getByLabel(/^Session date/).fill(order.sessionDate);
  if (order.sessionTime) await page.getByLabel(/^Session time/).fill(order.sessionTime);
}

const next = (page: Page) => page.getByRole('button', { name: /^Continue$|^Checking your order/ });
const panel = (page: Page) => page.locator('[data-refund-panel]');

async function toReview(page: Page, reasonName: RegExp = /My plans changed/) {
  await next(page).click();
  await expect(page.getByRole('heading', { level: 2, name: 'What happened?' })).toBeFocused();
  await page.getByRole('radio', { name: reasonName }).check();
  await next(page).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Review and send' })).toBeFocused();
}

async function declare(page: Page) {
  await page.getByRole('checkbox', { name: /I confirm that the information I gave is true/ }).check();
  await page.getByRole('checkbox', { name: /I understand that my request is handled under the refund rules/ }).check();
}

test.describe('refund request form', () => {
  test('is unlisted: noindex, no link from the site, not in the sitemap, robots.txt or llms.txt', async ({ page, request }) => {
    await openForm(page);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /nofollow/);
    await expect(page.locator('a[href="/refund"], a[href^="/refund?"], a[href^="/refund#"]')).toHaveCount(0);

    // The rules page may link here (its refund clause is the one intended entry point), so it is not scanned.
    for (const route of ['/', '/privacy-policy', '/contact', '/book', '/vouchers']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.locator('a[href^="/refund"], a[href*="simdream.co.il/refund"]')).toHaveCount(0);
    }
    for (const path of ['/sitemap.xml', '/robots.txt', '/llms.txt']) {
      const response = await request.get(path);
      expect(response.ok(), path).toBe(true);
      expect(await response.text(), path).not.toMatch(/\/refund\b/);
    }
  });

  test('explains itself, and tells the customer to add a session date before it estimates anything', async ({ page }) => {
    await openForm(page);
    await expect(page.getByText('Refunds are requested only through this form.')).toBeVisible();
    await expect(panel(page)).toHaveAttribute('data-refund-outcome', 'pending');
    await expect(panel(page).getByText('Add your session date to see what the rules say.')).toBeVisible();
    await expect(panel(page).getByText(/not a decision/i).first()).toBeVisible();
  });

  test('validates step 1 inline, moves focus to the first problem and sends nothing', async ({ page }) => {
    const lookups = recordRequests(page, '/api/refund-requests/lookup');
    await openForm(page);

    await next(page).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Please check the highlighted fields.' })).toBeVisible();
    const reference = page.getByLabel('Booking reference, voucher code or order number');
    await expect(reference).toBeFocused();
    await expect(reference).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('This field is required.').first()).toBeVisible();

    await reference.fill('SD-737-ABCD');
    await page.getByLabel('Email used for the order').fill('not-an-email');
    await page.getByLabel('Phone number').fill('12');
    await next(page).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Enter a valid phone number.')).toBeVisible();
    expect(lookups).toHaveLength(0);
  });

  test('submits an order the store cannot verify, shows the likely outcome, and returns a reference (unverified path)', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-77231', email: 'dana@example.com', sessionDate: israelDate(10) });

    // The estimate appears as soon as there is a session date.
    await expect(panel(page)).toHaveAttribute('data-refund-outcome', 'full_refund_possible');
    await expect(panel(page).getByRole('status')).toHaveText('A full refund looks possible');
    await expect(panel(page).getByText('Rules, clause 4.3, 4.1')).toBeVisible();

    await next(page).click();
    await expect(page.locator('[data-refund-verification="unverified"]')).toContainText('We could not confirm this order automatically');
    await expect(panel(page).getByText('Would you rather keep your flight?')).toBeVisible();
    await expect(panel(page).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', FACILITY_INFO.contact.whatsappHref);
    await expect(panel(page).getByRole('link', { name: /Call/ })).toHaveAttribute('href', FACILITY_INFO.contact.phoneHref);

    await page.getByRole('radio', { name: /Illness or an emergency/ }).check();
    await page.getByLabel(/Anything else the team should know/).fill('Doctor note available.');
    await expect(page.getByText('22 of 1000 characters')).toBeVisible();
    await next(page).click();

    // Step 3 summary, the two links, and a refusal to send without the declarations.
    await expect(page.getByRole('heading', { level: 2, name: 'Review and send' })).toBeFocused();
    await expect(page.getByText('WIX-77231')).toBeVisible();
    await expect(page.getByText('To be checked by the team')).toBeVisible();
    await expect(page.getByRole('link', { name: /Read the refund rules/ })).toHaveAttribute('href', '/rules#refunds');
    await expect(page.getByRole('link', { name: /Privacy policy/ })).toHaveAttribute('href', '/privacy-policy');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('Please confirm to continue.').first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /I confirm that the information I gave is true/ })).toBeFocused();

    await declare(page);
    const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/refund-requests' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Send request' }).click();
    const reply = await response;
    expect(reply.status()).toBe(201);
    const body = (await reply.json()) as { reference: string; evaluation: { outcome: string }; acknowledged: boolean };
    expect(body.reference).toMatch(REFERENCE);
    expect(body.evaluation.outcome).toBe('full_refund_possible');

    await expect(page.getByRole('heading', { level: 2, name: 'Request received' })).toBeFocused();
    await expect(page.locator('[data-refund-reference]')).toHaveText(body.reference);
    await expect(page.locator('[data-refund-reference]')).toHaveAttribute('dir', 'ltr');
    // The test server has no email transport, so the page must not claim an email went out.
    await expect(page.getByText('We could not email you a copy, so please keep this reference.')).toBeVisible();
    await expect(page.getByText(/We emailed a copy/)).toHaveCount(0);
    await expect(page.getByText('The rules (clause 12.1) allow up to 14 days to reply to a written request.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy reference' })).toBeVisible();
  });

  test('verifies a gift voucher by code and buyer email, and shows only what matched', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: SEED_VOUCHER.code, email: SEED_VOUCHER.buyer, voucher: true });
    await next(page).click();

    const note = page.locator('[data-refund-verification="verified"]');
    await expect(note).toContainText('We found your order');
    await expect(note).toContainText('Gift voucher');
    await expect(panel(page)).toHaveAttribute('data-refund-outcome', 'manual_review');
    await expect(panel(page)).toContainText('The rules do not describe gift voucher refunds separately');
    await expect(page.getByRole('radio', { name: /A gift voucher/ })).toBeVisible();
    // A voucher offers voucher reasons, not flight reasons.
    await expect(page.getByRole('radio', { name: /My plans changed/ })).toHaveCount(0);
  });

  test('treats a wrong email like an unknown order, so the lookup cannot be used to probe', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: SEED_VOUCHER.code, email: 'someone.else@example.com', voucher: true });
    await next(page).click();
    await expect(page.locator('[data-refund-verification="unverified"]')).toBeVisible();
    await expect(page.getByText('We found your order')).toHaveCount(0);
  });

  test('says no refund is likely on the day of the session, and offers a paid move', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-1', email: 'dana@example.com', sessionDate: israelDate(0), sessionTime: '23:30' });
    await expect(panel(page)).toHaveAttribute('data-refund-outcome', 'no_refund_window');
    await expect(panel(page).getByRole('status')).toHaveText('A refund is unlikely');
    await expect(panel(page)).toContainText('₪150');
    await expect(panel(page)).toContainText('Rules, clause 4.4, 4.2');
  });

  test('advances with the Enter key and keeps keyboard focus on each new step heading', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-9', email: 'dana@example.com', sessionDate: israelDate(10) });
    await page.getByLabel('Phone number').press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: 'What happened?' })).toBeFocused();
    await page.getByRole('radio', { name: /My plans changed/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: /Illness or an emergency/ })).toBeChecked();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Which order is this about?' })).toBeFocused();
    await expect(page.getByLabel('Booking reference, voucher code or order number')).toHaveValue('WIX-9');
  });

  test('rejects a form the honeypot caught, with an error and no success', async ({ page }) => {
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-5', email: 'dana@example.com', sessionDate: israelDate(10) });
    await toReview(page);
    await declare(page);
    await page.locator('input[name="refund_company_site"]').fill('https://spam.example', { force: true });

    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Some details were not accepted.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
  });

  test('is honest when the server cannot take the request: nothing was sent, and the desk is one tap away', async ({ page }) => {
    await page.route('**/api/refund-requests', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Refund requests are temporarily unavailable. Nothing was sent.' }) })
        : route.fallback()
    );
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-6', email: 'dana@example.com', sessionDate: israelDate(10) });
    await toReview(page);
    await declare(page);

    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByRole('heading', { level: 2, name: 'We cannot take requests online right now' })).toBeFocused();
    await expect(page.getByText(/Nothing was sent\./)).toBeVisible();
    await expect(page.locator('[data-refund-unavailable]').getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', FACILITY_INFO.contact.whatsappHref);
    await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
    await expect(page.locator('[data-refund-reference]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Review and send' })).toBeVisible();
  });

  test('keeps the request editable when the network fails, and retries with the same request id', async ({ page }) => {
    const ids: string[] = [];
    let attempts = 0;
    await page.route('**/api/refund-requests', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      ids.push((route.request().postDataJSON() as { clientRequestId: string }).clientRequestId);
      attempts += 1;
      return attempts === 1 ? route.abort('failed') : route.fallback();
    });
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-7', email: 'dana@example.com', sessionDate: israelDate(10) });
    await toReview(page);
    await declare(page);

    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'We could not reach the server.' })).toBeVisible();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Request received' })).toBeVisible();

    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  test('prefills the booking reference from a confirmation-email link', async ({ page }) => {
    await page.goto('/refund?ref=SD-737-ABCDEFGHJKLMNPQR');
    await expect(page.getByLabel('Booking reference, voucher code or order number')).toHaveValue('SD-737-ABCDEFGHJKLMNPQR');
    await page.goto('/refund?ref=%3Cscript%3E');
    await expect(page.getByLabel('Booking reference, voucher code or order number')).toHaveValue('');
  });

  test('prints only the receipt', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await openForm(page);
    await fillOrder(page, { reference: 'WIX-8', email: 'dana@example.com', sessionDate: israelDate(10) });
    await toReview(page);
    await declare(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('[data-refund-success]')).toBeVisible();

    await page.getByRole('button', { name: 'Print or save as PDF' }).click();

    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    await expect(page.locator('#refund-receipt')).toBeVisible();
  });

  test('renders in Hebrew, right to left, with the reference and times left to right', async ({ page }) => {
    await preferLanguage(page, 'he');
    await page.goto('/refund');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1, name: 'מבקשים החזר כספי' })).toBeVisible();
    await expect(page.getByLabel('מספר הזמנה, קוד שובר או מספר רכישה')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByLabel('כתובת המייל שבה בוצעה ההזמנה')).toHaveAttribute('dir', 'ltr');
    expect(await page.locator('[data-refund-form]').innerText()).not.toMatch(/[؀-ۿ]/);
  });

  test('renders in Arabic, right to left, without Hebrew letters', async ({ page }) => {
    await preferLanguage(page, 'ar');
    await page.goto('/refund');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1, name: 'اطلبوا استرداد المبلغ' })).toBeVisible();
    const text = await page.locator('[data-refund-form]').innerText();
    expect(text).not.toMatch(/[֐-׿]/);
  });
});
