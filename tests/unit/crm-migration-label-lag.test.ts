import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad } from '../../tools/crm-migration/load';
import type { MergedPerson } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crm-label-lag-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const person = (id: string, labels: string[]): MergedPerson => ({
  personId: id,
  sourceContactIds: [id],
  name: { first: id },
  email: `${id}@example.com`,
  additionalEmails: [],
  additionalPhones: [],
  addresses: [],
  labels,
  memberSourceIds: [],
  wasSubscribed: false,
  orderCount: 0,
  conflicts: [],
});

function seed(people: MergedPerson[]) {
  ensureDataDir(dir);
  writeNdjson(pathIn(dir, FILES.people), people);
  writeNdjson(pathIn(dir, FILES.orders), []);
  writeJson(pathIn(dir, FILES.contactMap), Object.fromEntries(people.map((entry) => [entry.personId, entry.personId])));
}

/** A real Wix run: the first label went through, then each newly created label was refused for a moment. */
describe('labels Wix does not recognise yet', () => {
  it('waits and retries, with growing pauses, until Wix accepts the new label', async () => {
    seed([person('p1', ['VIP']), person('p2', ['VIP', 'Gifts'])]);
    const target = createFakeTarget({ labelLagCalls: 2 });
    const pauses: number[] = [];
    await runLoad(target.http, dir, { apply: true, sleep: async (ms) => void pauses.push(ms) }, () => undefined);

    expect(target.labelAssignments.map((assignment) => assignment.ids.length).sort()).toEqual([1, 2]);
    expect(pauses.length).toBe(4);
    expect(pauses.slice(0, 2)).toEqual([1000, 2000]);
  });

  it('gives up with a message naming the label when Wix never accepts it', async () => {
    seed([person('p1', ['VIP'])]);
    const target = createFakeTarget({ labelLagCalls: 99 });
    await expect(runLoad(target.http, dir, { apply: true, only: undefined, sleep: async () => undefined }, () => undefined)).rejects.toThrow(/VIP/);
  });

  it('does not retry an unrelated 400', async () => {
    seed([person('p1', ['VIP'])]);
    const target = createFakeTarget();
    const original = target.http.request.bind(target.http);
    let assignCalls = 0;
    target.http.request = (async (method: string, url: string, body?: unknown) => {
      if (url.endsWith('/contacts/v4/bulk/contacts/add-remove-labels')) {
        assignCalls += 1;
        const { WixHttpError } = await import('../../tools/crm-migration/wix-http');
        throw new WixHttpError(400, url, JSON.stringify({ message: 'something else', details: { applicationError: { code: 'INVALID_ARGUMENT' } } }));
      }
      return original(method as 'GET', url, body);
    }) as typeof target.http.request;
    await expect(runLoad(target.http, dir, { apply: true, sleep: async () => undefined }, () => undefined)).rejects.toThrow(/something else/);
    expect(assignCalls).toBe(1);
  });
});
