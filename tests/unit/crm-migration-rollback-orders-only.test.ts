import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, readJson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad, type LoadState } from '../../tools/crm-migration/load';
import { runRollback } from '../../tools/crm-migration/rollback';
import type { MergedPerson, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const person = (id: string): MergedPerson => ({ personId: id, sourceContactIds: [id], name: { first: id }, email: `${id}@example.com`, additionalEmails: [], additionalPhones: [], addresses: [], labels: [], memberSourceIds: [], wasSubscribed: false, orderCount: 1, conflicts: [] });
const order = (id: string, number: string, contactId: string): SourceOrder => ({ id, number, purchasedDate: '2025-01-01T10:00:00.000Z', status: 'APPROVED', paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED', currency: 'ILS', channelInfo: { type: 'WEB' }, buyerInfo: { contactId }, priceSummary: { total: { amount: '100' } }, lineItems: [] });

describe('rollback --only orders', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-rb-'));
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.people), [person('p1'), person('p2')]);
    writeNdjson(pathIn(dir, FILES.orders), [order('o1', '1', 'p1'), order('o2', '2', 'p2')]);
    writeJson(pathIn(dir, FILES.contactMap), { p1: 'p1', p2: 'p2' });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('removes every imported order and leaves every contact, on staging and in the load state', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    expect(target.orders.size).toBe(2);
    const summary = await runRollback(target.http, dir, true, () => undefined, { ordersOnly: true });
    expect(summary.orders.removed).toBe(2);
    expect(summary.contacts).toMatchObject({ planned: 0, removed: 0 });
    expect(target.orders.size).toBe(0);
    expect(target.contacts.size).toBe(2);
    const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
    expect(Object.keys(state.orders)).toEqual([]);
    expect(Object.keys(state.contacts).sort()).toEqual(['p1', 'p2']);
  });

  it('without the switch it still removes the copied contacts too', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    await runRollback(target.http, dir, true, () => undefined);
    expect(target.contacts.size).toBe(0);
  });
});
