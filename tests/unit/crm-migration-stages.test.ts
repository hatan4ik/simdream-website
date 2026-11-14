import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDedupeStage } from '../../tools/crm-migration/dedupe-stage';
import { runExport } from '../../tools/crm-migration/export';
import { FILES, ensureDataDir, pathIn, readJson, readNdjson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad, type LoadState } from '../../tools/crm-migration/load';
import { runRollback } from '../../tools/crm-migration/rollback';
import { runVerify } from '../../tools/crm-migration/verify';
import type { MergedPerson, SourceContact, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeSource, createFakeTarget } from './_support/crm-fake-wix';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crm-migration-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Synthetic customers only. */
const contact = (id: string, fields: Partial<SourceContact> = {}): SourceContact => ({ id, createdDate: '2024-01-01T00:00:00.000Z', ...fields });
const order = (id: string, number: string, contactId: string, purchasedDate = '2025-01-01T10:00:00.000Z'): SourceOrder => ({
  id,
  number,
  purchasedDate,
  status: 'APPROVED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  currency: 'ILS',
  channelInfo: { type: 'WEB' },
  buyerInfo: { contactId, email: `${contactId}@example.com` },
  priceSummary: { subtotal: { amount: '300' }, total: { amount: '300' } },
  lineItems: [{ id: `${id}-line`, productName: { original: 'Captain 60' }, quantity: 1, itemType: { preset: 'SERVICE' }, price: { amount: '300' } }],
});

const person = (id: string, fields: Partial<MergedPerson> = {}): MergedPerson => ({
  personId: id,
  sourceContactIds: [id],
  name: { first: id, last: 'Test' },
  email: `${id}@example.com`,
  additionalEmails: [],
  additionalPhones: [],
  addresses: [],
  labels: [],
  memberSourceIds: [],
  wasSubscribed: false,
  orderCount: 0,
  conflicts: [],
  ...fields,
});

function seedLoadInputs(people: MergedPerson[], orders: SourceOrder[]) {
  ensureDataDir(dir);
  writeNdjson(pathIn(dir, FILES.people), people);
  writeNdjson(pathIn(dir, FILES.orders), orders);
  writeJson(pathIn(dir, FILES.contactMap), Object.fromEntries(people.flatMap((entry) => entry.sourceContactIds.map((id) => [id, entry.personId]))));
}

describe('runExport', () => {
  it('reads every page, attaches label names to contacts, and writes the manifest last', async () => {
    const contacts = Array.from({ length: 150 }, (_, index) => ({ id: `c${index}`, email: { email: `c${index}@example.com` } }));
    const source = createFakeSource({
      labels: [
        { key: 'custom.vip-a', displayName: 'VIP', labelType: 'USER_DEFINED' },
        { key: 'custom.gift-b', displayName: 'Gifts', labelType: 'USER_DEFINED' },
      ],
      membership: { 'custom.vip-a': ['c0', 'c120'], 'custom.gift-b': ['c0'] },
      contacts,
      orders: Array.from({ length: 120 }, (_, index) => ({ id: `o${index}`, number: String(index + 1) })),
      planOrders: Array.from({ length: 60 }, (_, index) => ({ id: `p${index}` })),
    });

    const manifest = await runExport(source.http, dir);

    expect(manifest.counts).toEqual({ contacts: 150, orders: 120, planOrders: 60, labels: 2 });
    expect(manifest.complete).toBe(true);
    expect(manifest.sourceSiteId).toBe('fake-production-site');
    const saved = readNdjson<SourceContact>(pathIn(dir, FILES.contacts));
    expect(saved).toHaveLength(150);
    expect(saved.find((entry) => entry.id === 'c0')!.labels).toEqual(['VIP', 'Gifts']);
    expect(saved.find((entry) => entry.id === 'c120')!.labels).toEqual(['VIP']);
    expect(saved.find((entry) => entry.id === 'c5')!.labels).toEqual([]);
    expect(readNdjson(pathIn(dir, FILES.orders))).toHaveLength(120);
    expect(readNdjson(pathIn(dir, FILES.planOrders))).toHaveLength(60);
  });

  it('keeps customer data private on disk', async () => {
    const source = createFakeSource({ labels: [], membership: {}, contacts: [{ id: 'c1' }], orders: [], planOrders: [] });
    await runExport(source.http, dir);
    expect(statSync(dir).mode & 0o077).toBe(0);
    expect(statSync(pathIn(dir, FILES.contacts)).mode & 0o077).toBe(0);
  });

  it('flags an export whose contact count moved while it ran', async () => {
    const source = createFakeSource({ labels: [], membership: {}, contacts: [{ id: 'c1' }, { id: 'c2' }], orders: [], planOrders: [], reportedCount: 3 });
    const manifest = await runExport(source.http, dir);
    expect(manifest.complete).toBe(false);
    expect(manifest.warnings.join(' ')).toMatch(/reported 3/);
  });

  it('only ever issues read calls', async () => {
    const source = createFakeSource({ labels: [{ key: 'k', displayName: 'VIP' }], membership: { k: ['c1'] }, contacts: [{ id: 'c1' }], orders: [{ id: 'o1' }], planOrders: [{ id: 'p1' }] });
    await runExport(source.http, dir);
    expect(source.calls.every((call) => /query|count|search|GET/.test(call))).toBe(true);
  });
});

describe('runDedupeStage', () => {
  it('writes people, the contact map, a merge report and a review sheet from the exported files', () => {
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.contacts), [
      contact('a', { name: { first: 'Dana', last: 'Levi' }, email: { email: 'dana@example.com' } }),
      contact('b', { name: { first: 'Dana', last: 'Levi' }, email: { email: 'DANA@example.com' } }),
      contact('c', { name: { first: 'Dan', last: 'Cohen' }, phone: { phone: '0501234567' } }),
      contact('d', { name: { first: 'Dan', last: 'Levi' }, phone: { phone: '+972501234567' } }),
    ]);
    writeNdjson(pathIn(dir, FILES.orders), [order('o1', '1', 'a')]);

    const report = runDedupeStage(dir);

    expect(report).toMatchObject({ contactsIn: 4, peopleOut: 3, mergedGroups: 1, reviewGroups: 1 });
    expect(readNdjson<MergedPerson>(pathIn(dir, FILES.people))).toHaveLength(3);
    expect(readJson<Record<string, string>>(pathIn(dir, FILES.contactMap))).toMatchObject({ a: 'a', b: 'a' });
    const csv = readFileSync(pathIn(dir, FILES.reviewCsv), 'utf8').trim().split('\n');
    expect(csv[0]).toBe('group,why,matched_on,contact_id,name,email,phone,labels,created');
    expect(csv).toHaveLength(3);
  });

  it('applies a reviewer’s overrides file', () => {
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.contacts), [
      contact('c', { name: { first: 'Dan', last: 'Cohen' }, phone: { phone: '0501234567' } }),
      contact('d', { name: { first: 'Dan', last: 'Levi' }, phone: { phone: '+972501234567' } }),
    ]);
    writeNdjson(pathIn(dir, FILES.orders), []);
    writeJson(pathIn(dir, FILES.overrides), { forceMerge: [['c', 'd']] });
    expect(runDedupeStage(dir)).toMatchObject({ peopleOut: 1, reviewGroups: 0 });
  });
});

describe('runLoad', () => {
  const people = [
    person('p1', { labels: ['VIP'] }),
    person('p2', { labels: ['VIP', 'Gifts'], sourceContactIds: ['p2', 'p2b'] }),
    person('p3', { email: undefined, name: {} }),
  ];
  const orders = [order('o1', '10001', 'p1'), order('o2', '10002', 'p2b'), order('o3', '10003', 'ghost')];

  it('is a dry run unless told to apply: it never calls Wix and writes nothing', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    const summary = await runLoad(target.http, dir, { apply: false });
    expect(target.calls).toEqual([]);
    expect(summary).toMatchObject({
      mode: 'dry-run',
      contacts: { planned: 2, withoutIdentity: 1 },
      labels: { planned: 2 },
      orders: { planned: 3, maxNumber: 10003 },
    });
    expect(() => readFileSync(pathIn(dir, FILES.loadState))).toThrow();
  });

  it('copies contacts, labels and orders, re-pointing orders at the new contacts', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    const summary = await runLoad(target.http, dir, { apply: true });

    expect(summary.contacts).toMatchObject({ created: 2, failed: 0, withoutIdentity: 1 });
    expect([...target.contacts.values()].map((stored) => stored.externalId).sort()).toEqual(['p1', 'p2']);
    expect(target.labels.size).toBe(2);
    expect(target.labelAssignments.map((entry) => entry.ids.length).sort()).toEqual([1, 2]);

    expect(target.orders.size).toBe(3);
    const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
    const imported = [...target.orders.values()];
    const forP1 = imported.find((stored) => (stored.channelInfo as { externalOrderId: string }).externalOrderId === 'o1')!;
    expect((forP1.buyerInfo as { contactId: string }).contactId).toBe(state.contacts.p1);
    const forMerged = imported.find((stored) => (stored.channelInfo as { externalOrderId: string }).externalOrderId === 'o2')!;
    expect((forMerged.buyerInfo as { contactId: string }).contactId).toBe(state.contacts.p2);
    const orphan = imported.find((stored) => (stored.channelInfo as { externalOrderId: string }).externalOrderId === 'o3')!;
    expect(orphan.buyerInfo).toEqual({ email: 'ghost@example.com' });
    expect(summary.orders).toMatchObject({ imported: 3, failed: 0, withoutContact: 1 });
  });

  it('is idempotent: a second run creates and imports nothing more', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true });
    const contactsAfter = target.contacts.size;
    const ordersAfter = target.orders.size;
    const callsAfter = target.calls.length;

    const again = await runLoad(target.http, dir, { apply: true });

    expect(target.contacts.size).toBe(contactsAfter);
    expect(target.orders.size).toBe(ordersAfter);
    expect(target.calls.length).toBe(callsAfter);
    expect(again.contacts.created).toBe(0);
  });

  it('matches a contact already on the target instead of overwriting or duplicating it', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget({ existingContacts: [{ id: 'existing-1', email: 'p1@example.com' }] });
    const summary = await runLoad(target.http, dir, { apply: true });
    const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
    expect(state.contacts.p1).toBe('existing-1');
    expect(state.adopted).toEqual(['p1']);
    expect(summary.contacts.adopted).toBe(1);
    expect(target.contacts.size).toBe(2);
  });

  it('retries a contact Wix rejected with identity fields only, and says so', async () => {
    seedLoadInputs([person('p1', { birthdate: '1990-05-01' })], []);
    const target = createFakeTarget({ rejectBirthdate: true });
    const summary = await runLoad(target.http, dir, { apply: true });
    expect(summary.contacts.failed).toBe(0);
    expect(readJson<LoadState>(pathIn(dir, FILES.loadState)).minimal).toEqual(['p1']);
    expect(summary.warnings.join(' ')).toMatch(/identity fields only/);
  });

  it('falls back to the documented order fields when Wix refuses the extended ones', async () => {
    seedLoadInputs([person('p1')], [order('o1', '10001', 'p1')]);
    const target = createFakeTarget({ rejectFullOrders: true });
    const summary = await runLoad(target.http, dir, { apply: true });
    expect(summary.orders).toMatchObject({ imported: 1, core: 1, failed: 0 });
    expect(readJson<LoadState>(pathIn(dir, FILES.loadState)).coreOrders).toEqual(['o1']);
  });

  it('stops after the first order when Wix did not keep its number, unless told to accept that', async () => {
    seedLoadInputs([person('p1')], [order('o1', '10001', 'p1'), order('o2', '10002', 'p1', '2025-02-01T10:00:00.000Z')]);
    const target = createFakeTarget({ alterOrderNumber: true });
    const stopped = await runLoad(target.http, dir, { apply: true });
    expect(stopped.stopped).toMatch(/number/);
    expect(target.orders.size).toBe(1);

    const resumed = await runLoad(target.http, dir, { apply: true, acceptMismatch: true });
    expect(resumed.stopped).toBeUndefined();
    expect(target.orders.size).toBe(2);
  });

  it('imports oldest first and honours --limit for a small first probe', async () => {
    seedLoadInputs(
      [person('p1')],
      [order('late', '3', 'p1', '2025-03-01T00:00:00.000Z'), order('early', '1', 'p1', '2024-01-01T00:00:00.000Z'), order('mid', '2', 'p1', '2024-06-01T00:00:00.000Z')],
    );
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true, only: 'orders', limit: 2 });
    const done = Object.keys(readJson<LoadState>(pathIn(dir, FILES.loadState)).orders).sort();
    expect(done).toEqual(['early', 'mid']);
  });
});

describe('runVerify and runRollback', () => {
  const people = [person('p1'), person('p2')];
  const orders = [order('o1', '10001', 'p1'), order('o2', '10002', 'p2')];

  it('verify passes after a clean load and fails when staging loses an order', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true });

    const clean = await runVerify(target.http, dir);
    expect(clean.ok).toBe(true);
    expect(clean.checks.map((check) => check.name)).toContain('order totals add up to the source');

    target.orders.delete([...target.orders.keys()][0]!);
    const broken = await runVerify(target.http, dir);
    expect(broken.ok).toBe(false);
    expect(broken.checks.find((check) => check.name === 'every imported order is on staging')!.ok).toBe(false);
  });

  it('verify catches a changed purchase date', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true });
    const [first] = [...target.orders.values()];
    first!.purchasedDate = '2030-01-01T00:00:00.000Z';
    const report = await runVerify(target.http, dir);
    expect(report.checks.find((check) => check.name === 'purchase dates preserved')!.ok).toBe(false);
  });

  it('rollback is a dry run by default and deletes nothing', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true });
    const summary = await runRollback(target.http, dir, false);
    expect(summary).toMatchObject({ mode: 'dry-run', orders: { planned: 2 }, contacts: { planned: 2 } });
    expect(target.orders.size).toBe(2);
    expect(target.contacts.size).toBe(2);
  });

  it('rollback removes what the tool created and never a contact that already existed', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget({ existingContacts: [{ id: 'existing-1', email: 'p1@example.com' }] });
    await runLoad(target.http, dir, { apply: true });
    expect(target.contacts.size).toBe(2);

    const summary = await runRollback(target.http, dir, true);

    expect(summary.orders.removed).toBe(2);
    expect(summary.contacts).toMatchObject({ removed: 1, keptBecauseTheyExistedBefore: 1 });
    expect(target.orders.size).toBe(0);
    expect([...target.contacts.keys()]).toEqual(['existing-1']);
    const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
    expect(state.orders).toEqual({});
    expect(Object.keys(state.contacts)).toEqual(['p1']);
  });

  it('a rolled-back migration can be loaded again from scratch', async () => {
    seedLoadInputs(people, orders);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true });
    await runRollback(target.http, dir, true);
    await runLoad(target.http, dir, { apply: true });
    expect(target.orders.size).toBe(2);
    expect(target.contacts.size).toBe(2);
  });
});
