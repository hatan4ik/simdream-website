import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDedupeStage } from '../../tools/crm-migration/dedupe-stage';
import { findExclusions, readOrdersToMigrate } from '../../tools/crm-migration/exclusions';
import { FILES, ensureDataDir, pathIn, readJson, readNdjson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad } from '../../tools/crm-migration/load';
import { runVerify } from '../../tools/crm-migration/verify';
import type { MergedPerson, SourceContact, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const contact = (id: string, email: string, fields: Partial<SourceContact> = {}): SourceContact => ({
  id,
  createdDate: '2024-01-01T00:00:00.000Z',
  name: { first: id },
  email: { email },
  ...fields,
});
const order = (id: string, number: string, buyer: { contactId?: string; email?: string }): SourceOrder => ({
  id,
  number,
  purchasedDate: '2025-01-01T10:00:00.000Z',
  status: 'APPROVED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'FULFILLED',
  currency: 'ILS',
  channelInfo: { type: 'WEB' },
  buyerInfo: buyer,
  priceSummary: { subtotal: { amount: '100' }, total: { amount: '100' } },
  lineItems: [],
});

const contacts: SourceContact[] = [
  contact('tester-1', 'Owner@Example.com'),
  contact('tester-2', 'someone@example.com', { additionalEmails: [{ email: 'owner@example.com' }] }),
  contact('real-1', 'real@example.com'),
];
const orders: SourceOrder[] = [
  order('o1', '1001', { contactId: 'tester-1' }),
  order('o2', '1002', { email: 'OWNER@example.com' }),
  order('o3', '1003', { contactId: 'real-1', email: 'real@example.com' }),
];

describe('findExclusions', () => {
  it('matches contacts by primary or additional email, ignoring case and spaces', () => {
    const found = findExclusions(contacts, orders, [' owner@EXAMPLE.com ']);
    expect(found.contactIds.sort()).toEqual(['tester-1', 'tester-2']);
  });

  it('takes the orders bought by those contacts, by contact id or by buyer email', () => {
    expect(findExclusions(contacts, orders, ['owner@example.com']).orderIds.sort()).toEqual(['o1', 'o2']);
  });

  it('leaves everyone else alone, and does nothing for an empty list', () => {
    expect(findExclusions(contacts, orders, ['owner@example.com']).contactIds).not.toContain('real-1');
    expect(findExclusions(contacts, orders, [])).toEqual({ emails: [], contactIds: [], orderIds: [] });
  });
});

describe('the exclusion across the stages', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-exclude-'));
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.contacts), contacts);
    writeNdjson(pathIn(dir, FILES.orders), orders);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('dedupe leaves the excluded contacts and their orders out, and says what it left out', () => {
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    const report = runDedupeStage(dir);
    const people = readNdjson<MergedPerson>(pathIn(dir, FILES.people));
    expect(people.map((person) => person.personId)).toEqual(['real-1']);
    expect(report.peopleOut).toBe(1);
    expect(report.excluded).toEqual({ contacts: 2, orders: 2, emails: ['owner@example.com'] });
    expect(readJson<{ orderIds: string[] }>(pathIn(dir, FILES.excluded)).orderIds.sort()).toEqual(['o1', 'o2']);
  });

  it('a person who only shared a phone with an excluded contact is no longer pulled into a merge', () => {
    writeNdjson(pathIn(dir, FILES.contacts), [
      contact('tester-1', 'owner@example.com', { phone: { phone: '+972501112222' } }),
      contact('real-1', 'real@example.com', { phone: { phone: '+972501112222' }, name: { first: 'Real' } }),
    ]);
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    const people = (runDedupeStage(dir), readNdjson<MergedPerson>(pathIn(dir, FILES.people)));
    expect(people).toHaveLength(1);
    expect(people[0]?.sourceContactIds).toEqual(['real-1']);
  });

  it('takes back the exclusion when the override is removed and dedupe is run again', () => {
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    runDedupeStage(dir);
    writeJson(pathIn(dir, FILES.overrides), {});
    const report = runDedupeStage(dir);
    expect(report.peopleOut).toBe(3);
    expect(readJson<{ orderIds: string[] }>(pathIn(dir, FILES.excluded)).orderIds).toEqual([]);
    expect(readOrdersToMigrate(dir)).toHaveLength(3);
  });

  it('readOrdersToMigrate drops the excluded orders, and returns every order when nothing is excluded', () => {
    expect(readOrdersToMigrate(dir)).toHaveLength(3);
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    runDedupeStage(dir);
    expect(readOrdersToMigrate(dir).map((entry) => entry.id)).toEqual(['o3']);
  });

  it('the form answers saved under an excluded contact create nobody, even if that contact was chosen to be split', () => {
    writeJson(pathIn(dir, FILES.forms), [{ id: 'form-b', name: 'Birthday', formFields: [{ inputOptions: { target: 'given', contactMapping: { contactField: 'FIRST_NAME' } } }, { inputOptions: { target: 'dob', contactMapping: { contactField: 'BIRTHDATE' } } }] }]);
    writeNdjson(pathIn(dir, FILES.formSubmissions), [{ id: 's1', formId: 'form-b', contactId: 'tester-1', createdDate: '2026-01-01T00:00:00.000Z', submissions: { given: 'Someone Else', dob: '2010-02-02' } }]);
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'], splitSubmissionContacts: ['tester-1'] });
    const report = runDedupeStage(dir);
    expect(report.forms?.newPeople).toBe(0);
    expect(readNdjson<MergedPerson>(pathIn(dir, FILES.people)).map((person) => person.personId)).toEqual(['real-1']);
  });

  it('load plans no orders for an excluded contact', async () => {
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    runDedupeStage(dir);
    const summary = await runLoad(createFakeTarget().http, dir, { apply: false }, () => undefined);
    expect(summary.contacts.planned).toBe(1);
    expect(summary.orders.planned).toBe(1);
  });

  it('end to end: an excluded contact and its orders never reach staging, and verify is satisfied', async () => {
    writeJson(pathIn(dir, FILES.overrides), { excludeEmails: ['owner@example.com'] });
    runDedupeStage(dir);
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    expect(target.contacts.size).toBe(1);
    expect(target.orders.size).toBe(1);
    const report = await runVerify(target.http, dir, () => undefined);
    expect(report.ok, report.checks.map((check) => `${check.ok ? 'ok' : 'FAIL'} ${check.name}: ${check.detail}`).join('\n')).toBe(true);
    expect(readFileSync(pathIn(dir, FILES.excluded), 'utf8')).toContain('o1');
  });
});
