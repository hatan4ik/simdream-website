import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { loadApp, voucherCheckoutBody, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { adminRequest, postCheckout, PRIVATE_NO_STORE, SEED_FULL_VOUCHER, SEED_VOUCHER } from './api-helpers';
import {
  errorBody,
  expectContract,
  giftVoucher,
  publicVoucher,
  validationErrorBody,
  voucherExpired,
  voucherRedeemed,
  voucherRedemption,
} from './contracts';

async function verify(app: TestApp, body: unknown) {
  const { POST } = await app.routes.vouchers();
  return readJson(await POST(apiRequest('/api/vouchers', { body })));
}

async function redeem(app: TestApp, body: unknown, headers: Record<string, string> = {}) {
  const { PATCH } = await app.routes.vouchers();
  return readJson(await PATCH(adminRequest('/api/vouchers', { method: 'PATCH', body, headers })));
}

describe('GET /api/vouchers (admin)', () => {
  it('lists full voucher records for an admin under the voucher contract, privately', async () => {
    const app = await loadApp();

    const { GET } = await app.routes.vouchers();
    const response = await readJson(await GET(adminRequest('/api/vouchers')));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const vouchers = expectContract(giftVoucher.array(), response.body);
    expect(vouchers.map((voucher) => voucher.code)).toEqual([SEED_VOUCHER.code, SEED_FULL_VOUCHER.code]);
  });

  it('challenges an anonymous caller with 401', async () => {
    const app = await loadApp();

    const { GET } = await app.routes.vouchers();
    const response = await readJson(await GET(apiRequest('/api/vouchers')));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Basic realm="Sim Dream Admin"/);
    expectContract(errorBody, response.body);
  });
});

describe('POST /api/vouchers (public verification)', () => {
  it('verifies a paid voucher and reveals only its code, balance and expiry, privately', async () => {
    const app = await loadApp();
    const stored = await app.store.getVoucherByCode(SEED_VOUCHER.code);

    const response = await verify(app, { action: 'verify', code: SEED_VOUCHER.code });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(publicVoucher, response.body)).toEqual({
      code: SEED_VOUCHER.code,
      currentBalanceIls: SEED_VOUCHER.balanceIls,
      expiryDate: stored?.expiryDate,
    });
  });

  it('normalizes letter case and surrounding whitespace in the submitted code', async () => {
    const app = await loadApp();

    const response = await verify(app, { action: 'verify', code: `  ${SEED_VOUCHER.code.toLowerCase()} ` });

    expect(response.status).toBe(200);
    expect(expectContract(publicVoucher, response.body).code).toBe(SEED_VOUCHER.code);
  });

  it('answers 404 for an unknown code', async () => {
    const app = await loadApp();

    const response = await verify(app, { action: 'verify', code: 'SD-VOUCH-ZZZZZZZZZZZZZZZZZZ' });

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid voucher code.');
  });

  it('reports an expired voucher with 400 and expired: true', async () => {
    const app = await loadApp();
    vi.setSystemTime(new Date('2027-11-08T08:00:00+02:00'));

    const response = await verify(app, { action: 'verify', code: SEED_VOUCHER.code });

    expect(response.status).toBe(400);
    expect(expectContract(voucherExpired, response.body).error).toBe('This voucher has expired.');
  });

  it('reports a fully redeemed voucher with 400 and redeemed: true', async () => {
    const app = await loadApp();
    expect((await redeem(app, { code: SEED_VOUCHER.code, amount: SEED_VOUCHER.balanceIls })).status).toBe(200);

    const response = await verify(app, { action: 'verify', code: SEED_VOUCHER.code });

    expect(response.status).toBe(400);
    expect(expectContract(voucherRedeemed, response.body).error).toBe('This voucher has already been fully redeemed.');
  });

  it.each([
    { name: 'a code shorter than 16 characters', body: { action: 'verify', code: 'SD-VOUCH-1' }, field: 'code' },
    { name: 'a missing code', body: { action: 'verify' }, field: 'code' },
    { name: 'an unsupported action', body: { action: 'redeem', code: SEED_VOUCHER.code }, field: 'action' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp();

    const response = await verify(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.vouchers();

    const response = await readJson(await POST(apiRequest('/api/vouchers', { method: 'POST', rawBody: 'code=SD' })));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });
});

describe('PATCH /api/vouchers (admin redemption)', () => {
  it('deducts the amount and returns the new balance', async () => {
    const app = await loadApp();

    const response = await redeem(app, { code: SEED_VOUCHER.code, amount: 150 });

    expect(response.status).toBe(200);
    expect(expectContract(voucherRedemption, response.body).newBalance).toBe(250);
    expect(await app.store.getVoucherByCode(SEED_VOUCHER.code)).toMatchObject({ currentBalanceIls: 250, isRedeemed: false });
  });

  it('marks the voucher redeemed when its balance reaches exactly zero', async () => {
    const app = await loadApp();

    const response = await redeem(app, { code: SEED_VOUCHER.code.toLowerCase(), amount: SEED_VOUCHER.balanceIls });

    expect(response.status).toBe(200);
    expect(expectContract(voucherRedemption, response.body).newBalance).toBe(0);
    expect(await app.store.getVoucherByCode(SEED_VOUCHER.code)).toMatchObject({ currentBalanceIls: 0, isRedeemed: true });
  });

  it.each([
    { name: 'overdraws the balance', code: SEED_VOUCHER.code, amount: SEED_VOUCHER.balanceIls + 0.01 },
    { name: 'names an unknown voucher', code: 'SD-VOUCH-ZZZZZZZZZZZZZZZZZZ', amount: 10 },
  ])('refuses a redemption that $name with 409 and keeps every balance', async ({ code, amount }) => {
    const app = await loadApp();

    const response = await redeem(app, { code, amount });

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('Voucher cannot cover this purchase.');
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });

  it('refuses to redeem a gift voucher whose purchase is still unpaid with 409', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    expect((await postCheckout(app, voucherCheckoutBody({ amountIls: 600 }))).status).toBe(201);
    const pending = await app.store.getVoucherById(app.checkoutSessions[0].voucherId ?? '');

    const response = await redeem(app, { code: pending?.code, amount: 1 });

    expect(response.status).toBe(409);
    expect((await app.store.getVoucherById(pending?.id ?? ''))?.currentBalanceIls).toBe(0);
  });

  it('rejects a redemption amount finer than one agora with 400 and keeps the balance (API-10)', async () => {
    const app = await loadApp();

    const response = await redeem(app, { code: SEED_VOUCHER.code, amount: 0.004 });

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain('amount');
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });

  it('marks a voucher fully redeemed when agora-precise redemptions use up its balance (API-10)', async () => {
    const app = await loadApp();
    expect((await redeem(app, { code: SEED_VOUCHER.code, amount: SEED_VOUCHER.balanceIls - 0.1 })).status).toBe(200);

    const response = await redeem(app, { code: SEED_VOUCHER.code, amount: 0.1 });

    expect(response.status).toBe(200);
    expect(await app.store.getVoucherByCode(SEED_VOUCHER.code)).toMatchObject({ currentBalanceIls: 0, isRedeemed: true });
  });

  it.each([
    { name: 'a zero amount', body: { code: SEED_VOUCHER.code, amount: 0 }, field: 'amount' },
    { name: 'a negative amount', body: { code: SEED_VOUCHER.code, amount: -5 }, field: 'amount' },
    { name: 'a string amount', body: { code: SEED_VOUCHER.code, amount: '10' }, field: 'amount' },
    { name: 'an empty code', body: { code: '', amount: 10 }, field: 'code' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp();

    const response = await redeem(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });

  it('challenges an anonymous redemption with 401 and keeps the balance', async () => {
    const app = await loadApp();
    const { PATCH } = await app.routes.vouchers();

    const response = await readJson(
      await PATCH(apiRequest('/api/vouchers', { method: 'PATCH', body: { code: SEED_VOUCHER.code, amount: 10 } }))
    );

    expect(response.status).toBe(401);
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });

  it('refuses an authenticated cross-origin redemption with 403', async () => {
    const app = await loadApp();

    const response = await redeem(app, { code: SEED_VOUCHER.code, amount: 10 }, { origin: 'https://attacker.test' });

    expect(response.status).toBe(403);
    expectContract(errorBody, response.body);
    expect((await app.store.getVoucherByCode(SEED_VOUCHER.code))?.currentBalanceIls).toBe(SEED_VOUCHER.balanceIls);
  });

  it('keeps balance arithmetic exact across any sequence of whole-shekel redemptions (property)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 8 }), async (amounts) => {
        const app = await loadApp();
        let expectedBalance: number = SEED_FULL_VOUCHER.balanceIls;

        for (const amount of amounts) {
          const response = await redeem(app, { code: SEED_FULL_VOUCHER.code, amount });
          if (amount <= expectedBalance) {
            expectedBalance -= amount;
            expect(response.status).toBe(200);
            expect(expectContract(voucherRedemption, response.body).newBalance).toBe(expectedBalance);
          } else {
            expect(response.status).toBe(409);
          }
        }

        expect(await app.store.getVoucherByCode(SEED_FULL_VOUCHER.code)).toMatchObject({
          currentBalanceIls: expectedBalance,
          isRedeemed: expectedBalance === 0,
        });
      }),
      { numRuns: 25 }
    );
  });
});
