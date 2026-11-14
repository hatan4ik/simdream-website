import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, readJson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad, type LoadState } from '../../tools/crm-migration/load';
import { toOrderImportBody } from '../../tools/crm-migration/order-mapper';
import type { MergedPerson, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const discount = (discountType: string) => ({
  id: 'd1',
  discountType,
  lineItemIds: ['l1'],
  itemCombinations: [],
  coupon: { id: 'coupon-prod-id', code: 'SAVE10', name: 'Save', amount: { amount: '10.00', formattedAmount: '10 ₪' }, discountValueType: 'UNKNOWN_DISCOUNT_VALUE_TYPE' },
  lineItemDiscounts: [{ id: 'l1', totalDiscount: { amount: '10.00' } }],
});
const order = (id: string, number: string, discounts: unknown[] = []): SourceOrder => ({
  id,
  number,
  purchasedDate: '2025-01-01T10:00:00.000Z',
  status: 'APPROVED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  currency: 'ILS',
  channelInfo: { type: 'WEB' },
  buyerInfo: { contactId: 'p1', email: 'p1@example.com' },
  priceSummary: { subtotal: { amount: '100' }, discount: { amount: '10' }, total: { amount: '90' } },
  balanceSummary: { balance: { amount: '0' }, paid: { amount: '90' } },
  taxInfo: { totalTax: { amount: '13' } },
  appliedDiscounts: discounts,
  lineItems: [{ id: 'l1', productName: { original: 'Captain 60' }, quantity: 1, price: { amount: '100' }, serviceProperties: { scheduledDate: '2025-02-01T10:00:00.000Z', numberOfParticipants: 1 } }],
});

type Body = { order: Record<string, unknown> };
const discountsOf = (body: Body) => (body.order.appliedDiscounts ?? []) as Array<Record<string, any>>;

describe('order variants for coupons Wix refuses', () => {
  it('no-coupon-ids drops each coupon’s production id and keeps the rest of the coupon', () => {
    const [applied] = discountsOf(toOrderImportBody(order('o', '1', [discount('SPECIFIC_ITEMS')]), 'tc', 'no-coupon-ids'));
    expect(applied?.coupon).toEqual({ code: 'SAVE10', name: 'Save', amount: { amount: '10.00' }, discountValueType: 'UNKNOWN_DISCOUNT_VALUE_TYPE' });
    expect(applied?.discountType).toBe('SPECIFIC_ITEMS');
    expect(applied?.lineItemDiscounts).toEqual([{ id: 'l1', totalDiscount: { amount: '10.00' } }]);
  });

  it('global-discount records an item-specific discount as order-wide and leaves the other types alone', () => {
    const body = toOrderImportBody(order('o', '1', [discount('SPECIFIC_ITEMS'), { ...discount('SHIPPING'), id: 'd2' }, { ...discount('GLOBAL'), id: 'd3' }]), 'tc', 'global-discount');
    expect(discountsOf(body).map((applied) => applied.discountType)).toEqual(['GLOBAL', 'SHIPPING', 'GLOBAL']);
    expect(discountsOf(body)[0]?.coupon?.id).toBe('coupon-prod-id');
  });

  it('no-discounts drops the discount detail but keeps the price summary with its discount total', () => {
    const body = toOrderImportBody(order('o', '1', [discount('SPECIFIC_ITEMS')]), 'tc', 'no-discounts');
    expect(body.order.appliedDiscounts).toBeUndefined();
    expect((body.order.priceSummary as Record<string, any>).discount).toEqual({ amount: '10' });
  });

  it.each(['no-coupon-ids', 'global-discount', 'no-discounts'] as const)('%s still sends everything full does apart from the coupon change', (variant) => {
    const body = toOrderImportBody(order('o', '1', [discount('SPECIFIC_ITEMS')]), 'tc', variant).order;
    expect(body.fulfillmentStatus).toBe('FULFILLED');
    expect(body.balanceSummary).toBeDefined();
    expect(body.taxInfo).toEqual({ totalTax: { amount: '13' } });
    expect(JSON.stringify(body.lineItems)).toContain('scheduledDate');
  });

  it('core still sends the documented fields only', () => {
    const body = toOrderImportBody(order('o', '1', [discount('SPECIFIC_ITEMS')]), 'tc', 'core').order;
    expect(body.appliedDiscounts).toBeUndefined();
    expect(body.fulfillmentStatus).toBeUndefined();
  });
});

describe('the loader tries simpler versions of an order Wix refuses', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-ladder-'));
    ensureDataDir(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const people: MergedPerson[] = [{ personId: 'p1', sourceContactIds: ['p1'], name: { first: 'P' }, email: 'p1@example.com', additionalEmails: [], additionalPhones: [], addresses: [], labels: [], memberSourceIds: [], wasSubscribed: false, orderCount: 1, conflicts: [] }];
  const seed = (orders: SourceOrder[]) => {
    writeNdjson(pathIn(dir, FILES.people), people);
    writeNdjson(pathIn(dir, FILES.orders), orders);
    writeJson(pathIn(dir, FILES.contactMap), { p1: 'p1' });
  };
  const hasCouponId = (body: Record<string, unknown>) => ((body.appliedDiscounts ?? []) as Array<Record<string, any>>).some((applied) => applied.coupon?.id);
  const hasSpecific = (body: Record<string, unknown>) => ((body.appliedDiscounts ?? []) as Array<Record<string, any>>).some((applied) => applied.discountType === 'SPECIFIC_ITEMS');
  const hasDiscounts = (body: Record<string, unknown>) => ((body.appliedDiscounts ?? []) as unknown[]).length > 0;

  const run = async (failImport: (body: Record<string, unknown>) => number | undefined, orders: SourceOrder[]) => {
    seed(orders);
    const target = createFakeTarget({ failImport });
    const summary = await runLoad(target.http, dir, { apply: true, only: 'orders' }, () => undefined);
    return { target, summary, state: readJson<LoadState>(pathIn(dir, FILES.loadState)) };
  };

  it('imports an order Wix accepts as it is, without adjusting it', async () => {
    const { state, summary } = await run(() => undefined, [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(Object.keys(state.orders)).toEqual(['o1']);
    expect(state.adjustedOrders).toEqual({});
    expect(summary.orders.adjusted).toBe(0);
  });

  it('drops the coupon ids first, when that is what Wix refuses', async () => {
    const { state, target } = await run((body) => (hasCouponId(body) ? 500 : undefined), [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(state.adjustedOrders).toEqual({ o1: 'no-coupon-ids' });
    expect(state.coreOrders).toEqual([]);
    const stored = [...target.orders.values()][0] as { appliedDiscounts?: Array<{ coupon?: { code?: string } }> };
    expect(stored.appliedDiscounts?.[0]?.coupon?.code).toBe('SAVE10');
  });

  it('records the discount as order-wide when item-specific discounts are what Wix refuses', async () => {
    const { state } = await run((body) => (hasSpecific(body) ? 500 : undefined), [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(state.adjustedOrders).toEqual({ o1: 'global-discount' });
  });

  it('drops the discount detail only when no coupon version is accepted', async () => {
    const { state } = await run((body) => (hasDiscounts(body) ? 500 : undefined), [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(state.adjustedOrders).toEqual({ o1: 'no-discounts' });
  });

  it('falls back to the documented fields only as the last resort, and records it', async () => {
    const { state, summary } = await run((body) => ('fulfillmentStatus' in body ? 500 : undefined), [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(state.coreOrders).toEqual(['o1']);
    expect(state.adjustedOrders).toEqual({});
    expect(summary.orders.core).toBe(1);
  });

  it('does not repeat a body it has already sent: an order without coupons goes from full straight to core', async () => {
    let imports = 0;
    const { state } = await run((body) => { imports += 1; return 'fulfillmentStatus' in body ? 500 : undefined; }, [order('o1', '1')]);
    expect(state.coreOrders).toEqual(['o1']);
    expect(imports).toBe(2);
  });

  it('records the order as failed, and tries nothing simpler, when Wix is throttling', async () => {
    let imports = 0;
    const { state } = await run(() => { imports += 1; return 429; }, [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(Object.keys(state.orders)).toEqual([]);
    expect(Object.keys(state.orderFailures)).toEqual(['o1']);
    expect(imports).toBe(1);
  });

  it('records the order as failed when every version is refused', async () => {
    const { state } = await run(() => 500, [order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    expect(Object.keys(state.orderFailures)).toEqual(['o1']);
  });

  it('a later run retries the failed order and clears the failure', async () => {
    seed([order('o1', '1', [discount('SPECIFIC_ITEMS')])]);
    await runLoad(createFakeTarget({ failImport: () => 500 }).http, dir, { apply: true, only: 'orders' }, () => undefined);
    const target = createFakeTarget({ failImport: (body) => (hasSpecific(body) ? 500 : undefined) });
    // contacts are not needed for this stage; the order is simply re-imported
    await runLoad(target.http, dir, { apply: true, only: 'orders' }, () => undefined);
    const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
    expect(state.orderFailures).toEqual({});
    expect(state.adjustedOrders).toEqual({ o1: 'global-discount' });
  });
});
