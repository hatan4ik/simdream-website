import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad } from '../../tools/crm-migration/load';
import { runVerify } from '../../tools/crm-migration/verify';
import type { MergedPerson } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const person = (id: string, fields: Partial<MergedPerson> = {}): MergedPerson => ({ personId: id, sourceContactIds: [id], name: { first: id }, email: `${id}@example.com`, additionalEmails: [], additionalPhones: [], addresses: [], labels: [], memberSourceIds: [], wasSubscribed: false, orderCount: 0, conflicts: [], ...fields });

describe('verify: birthdays', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-bday-'));
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.people), [person('p1', { birthdate: '1990-05-01' }), person('p2', { birthdate: '2001-02-03' }), person('p3')]);
    writeNdjson(pathIn(dir, FILES.orders), []);
    writeJson(pathIn(dir, FILES.contactMap), { p1: 'p1', p2: 'p2', p3: 'p3' });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const check = (report: Awaited<ReturnType<typeof runVerify>>) => report.checks.find((entry) => /birthday/i.test(entry.name));

  it('passes when every birthday arrived, counting only the people who have one', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const result = check(await runVerify(target.http, dir, () => undefined));
    expect(result?.ok).toBe(true);
    expect(result?.detail).toBe('2/2 match');
  });

  it('fails, and counts, a birthday that is different or missing on staging', async () => {
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const stored = [...target.contacts.values()] as Array<{ externalId?: string; birthdate?: string }>;
    stored.find((entry) => entry.externalId === 'p1')!.birthdate = '1991-01-01';
    delete stored.find((entry) => entry.externalId === 'p2')!.birthdate;
    const result = check(await runVerify(target.http, dir, () => undefined));
    expect(result?.ok).toBe(false);
    expect(result?.detail).toBe('0/2 match (1 different, 1 missing on staging)');
  });

  it('leaves out a contact that already existed on staging, whose data was never ours to set', async () => {
    const target = createFakeTarget({ existingContacts: [{ id: 'old-1', email: 'p1@example.com' }] });
    await runLoad(target.http, dir, { apply: true }, () => undefined);
    const result = check(await runVerify(target.http, dir, () => undefined));
    expect(result?.ok).toBe(true);
    expect(result?.detail).toBe('1/1 match; 1 on a contact that already existed');
  });
});
