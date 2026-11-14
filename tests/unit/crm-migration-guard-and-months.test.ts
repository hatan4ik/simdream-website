import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertAutomationsQuiet, pauseAutomations } from '../../tools/crm-migration/automations';
import { FILES, ensureDataDir, pathIn, readJson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { runLoad, type LoadState } from '../../tools/crm-migration/load';
import type { MergedPerson, SourceOrder } from '../../tools/crm-migration/types';
import { createFakeTarget } from './_support/crm-fake-wix';

type Entry = { id: string; name: string; triggerKey: string; status: 'ACTIVE' | 'INACTIVE'; locked?: boolean };
const auto = (id: string, triggerKey: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE', locked = false): Entry => ({ id, name: `automation ${id}`, triggerKey, status, locked });

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crm-guard-'));
  ensureDataDir(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('assertAutomationsQuiet', () => {
  it('passes when everything is off except automations the pause recorded as locked', async () => {
    const target = createFakeTarget({ automations: [auto('booked', 'wix_bookings-sessions_booked'), auto('card', 'wix_bookings-saved_card_charged', 'ACTIVE', true)] });
    await pauseAutomations(target.http, dir, { apply: true, all: true });
    await expect(assertAutomationsQuiet(target.http, dir)).resolves.toMatchObject({ acknowledgedLocked: 1 });
  });

  it('refuses, naming them, when an automation is active that the pause did not cover', async () => {
    const target = createFakeTarget({ automations: [auto('booked', 'wix_bookings-sessions_booked')] });
    await pauseAutomations(target.http, dir, { apply: true, all: true });
    (target.automations.get('booked') as { configuration: { status: string } }).configuration.status = 'ACTIVE'; // someone turned it back on
    await expect(assertAutomationsQuiet(target.http, dir)).rejects.toThrow(/automation booked/);
  });

  it('refuses when nothing was ever paused and something is active, and says how to fix it', async () => {
    const target = createFakeTarget({ automations: [auto('welcome', 'wix_pricing_plans-plan_purchased')] });
    await expect(assertAutomationsQuiet(target.http, dir)).rejects.toThrow(/automations pause/);
  });

  it('is satisfied by a site with no active automations at all', async () => {
    const target = createFakeTarget({ automations: [auto('off', 'wix_bookings-no_show', 'INACTIVE')] });
    await expect(assertAutomationsQuiet(target.http, dir)).resolves.toBeDefined();
  });
});

describe('load with the automation guard and one month at a time', () => {
  const people: MergedPerson[] = [{ personId: 'p1', sourceContactIds: ['p1'], name: { first: 'P' }, email: 'p1@example.com', additionalEmails: [], additionalPhones: [], addresses: [], labels: [], memberSourceIds: [], wasSubscribed: false, orderCount: 4, conflicts: [] }];
  const order = (id: string, number: string, purchasedDate: string): SourceOrder => ({ id, number, purchasedDate, status: 'APPROVED', paymentStatus: 'PAID', fulfillmentStatus: 'FULFILLED', currency: 'ILS', channelInfo: { type: 'WEB' }, buyerInfo: { contactId: 'p1' }, priceSummary: { total: { amount: '100' } }, lineItems: [] });
  const seed = () => {
    writeNdjson(pathIn(dir, FILES.people), people);
    writeNdjson(pathIn(dir, FILES.orders), [order('a1', '1', '2024-08-03T10:00:00.000Z'), order('a2', '2', '2024-08-30T10:00:00.000Z'), order('b1', '3', '2024-09-01T00:00:00.000Z'), order('c1', '4', '2024-10-15T10:00:00.000Z')]);
    writeJson(pathIn(dir, FILES.contactMap), { p1: 'p1' });
  };
  const imported = () => Object.keys(readJson<LoadState>(pathIn(dir, FILES.loadState)).orders).sort();

  it('imports only the chosen month, and a later run adds the next month without touching the first', async () => {
    seed();
    const target = createFakeTarget();
    await runLoad(target.http, dir, { apply: true, only: 'orders', month: '2024-08' }, () => undefined);
    expect(imported()).toEqual(['a1', 'a2']);
    await runLoad(target.http, dir, { apply: true, only: 'orders', month: '2024-09' }, () => undefined);
    expect(imported()).toEqual(['a1', 'a2', 'b1']);
    expect(target.orders.size).toBe(3);
  });

  it('a dry run counts only the chosen month', async () => {
    seed();
    const summary = await runLoad(createFakeTarget().http, dir, { apply: false, month: '2024-08' }, () => undefined);
    expect(summary.orders.planned).toBe(2);
  });

  it('rejects a month that is not YYYY-MM', async () => {
    seed();
    await expect(runLoad(createFakeTarget().http, dir, { apply: true, only: 'orders', month: '2024-8' }, () => undefined)).rejects.toThrow(/YYYY-MM/);
  });

  it('with the guard on, imports nothing while an automation is active', async () => {
    seed();
    const target = createFakeTarget({ automations: [auto('welcome', 'wix_pricing_plans-plan_purchased')] });
    await expect(runLoad(target.http, dir, { apply: true, only: 'orders', guardAutomations: true }, () => undefined)).rejects.toThrow(/active/i);
    expect(target.calls.filter((call) => call.endsWith('/ecom/v1/orders/import'))).toEqual([]);
  });

  it('with the guard on and everything paused, imports as usual', async () => {
    seed();
    const target = createFakeTarget({ automations: [auto('welcome', 'wix_pricing_plans-plan_purchased')] });
    await pauseAutomations(target.http, dir, { apply: true, all: true });
    await runLoad(target.http, dir, { apply: true, only: 'orders', guardAutomations: true }, () => undefined);
    expect(imported()).toEqual(['a1', 'a2', 'b1', 'c1']);
  });

  it('without the guard option it does not look at automations at all', async () => {
    seed();
    const target = createFakeTarget({ automations: [auto('welcome', 'wix_pricing_plans-plan_purchased')] });
    await runLoad(target.http, dir, { apply: true, only: 'orders' }, () => undefined);
    expect(target.calls.some((call) => call.includes('/automations-service/'))).toBe(false);
  });
});
