import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad } from '../../tools/crm-migration/load';
import { runVerify } from '../../tools/crm-migration/verify';
import type { MergedPerson, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const person = (id: string): MergedPerson => ({ personId: id, sourceContactIds: [id], name: { first: id }, email: `${id}@example.com`, additionalEmails: [], additionalPhones: [], addresses: [], labels: [], memberSourceIds: [], wasSubscribed: false, orderCount: 1, conflicts: [] });
const order = (id: string, number: string, contactId: string): SourceOrder => ({
  id,
  number,
  purchasedDate: '2025-01-01T10:00:00.000Z',
  status: 'APPROVED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  currency: 'ILS',
  channelInfo: { type: 'WEB' },
  buyerInfo: { contactId, email: `${contactId}@example.com` },
  priceSummary: { subtotal: { amount: '100' }, total: { amount: '100' } },
  lineItems: [],
});

describe('verify: every imported order belongs to its buyer’s staging contact', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-links-'));
    ensureDataDir(dir);
    const people = [person('p1'), person('p2')];
    writeNdjson(pathIn(dir, FILES.people), people);
    writeNdjson(pathIn(dir, FILES.orders), [order('o1', '1', 'p1'), order('o2', '2', 'p2'), order('o3', '3', 'p1'), order('orphan', '4', 'not-in-the-export')]);
    writeJson(pathIn(dir, FILES.contactMap), { p1: 'p1', p2: 'p2' });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const link = (report: Awaited<ReturnType<typeof runVerify>>) => report.checks.find((check) => /linked to/i.test(check.name));

  it('passes after a normal load and counts the orders whose buyer is not a contact separately', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const report = await runVerify(target.http, dir, () => undefined);
    expect(link(report)?.ok).toBe(true);
    expect(link(report)?.detail).toBe('3/3 linked; 1 without a contact (the buyer is not in the export)');
  });

  it('fails, and says how many, when an order on staging points at another contact', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const stored = [...target.orders.values()].find((entry) => (entry.channelInfo as { externalOrderId?: string }).externalOrderId === 'o1') as { buyerInfo: { contactId?: string } };
    stored.buyerInfo.contactId = 'someone-else';
    const report = await runVerify(target.http, dir, () => undefined);
    expect(link(report)?.ok).toBe(false);
    expect(link(report)?.detail).toContain('2/3 linked');
    expect(report.ok).toBe(false);
  });

  it('fails when an order on staging has lost its contact', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const stored = [...target.orders.values()].find((entry) => (entry.channelInfo as { externalOrderId?: string }).externalOrderId === 'o2') as { buyerInfo: { contactId?: string } };
    delete stored.buyerInfo.contactId;
    expect(link(await runVerify(target.http, dir, () => undefined))?.ok).toBe(false);
  });
});
