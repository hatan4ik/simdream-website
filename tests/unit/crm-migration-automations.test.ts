import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pauseAutomations } from '../../tools/crm-migration/automations';
import { FILES, ensureDataDir, pathIn, readJson } from '../../tools/crm-migration/io';
import { createFakeTarget } from './_support/crm-fake-wix';

type Entry = { id: string; name: string; triggerKey: string; status: 'ACTIVE' | 'INACTIVE'; origin?: string; locked?: boolean };
const a = (id: string, triggerKey: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE', extra: Partial<Entry> = {}): Entry => ({ id, name: `automation ${id}`, triggerKey, status, ...extra });
const statusOf = (target: ReturnType<typeof createFakeTarget>, id: string) => (target.automations.get(id) as { configuration: { status: string } }).configuration.status;

describe('pauseAutomations', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-auto-'));
    ensureDataDir(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const site: Entry[] = [
    a('booked', 'wix_bookings-sessions_booked'),
    a('canceled', 'wix_bookings-booking_canceled'),
    a('welcome', 'wix_pricing_plans-plan_purchased'),
    a('password', 'wix_sitemembers_app-member_activation'),
    a('approved', 'wix_members-member_approves'),
    a('already-off', 'wix_bookings-no_show', 'INACTIVE'),
    a('receipt', 'receipts-receipt_document_generated'),
    a('order-mail', 'domain_events_wix.ecom.v1.automation_trigger-order_confirmation_issued_to_buyer'),
  ];

  it('a dry run lists what it would pause and changes nothing', async () => {
    const target = createFakeTarget({ automations: site });
    const summary = await pauseAutomations(target.http, dir, { apply: false });
    expect(summary.candidates.map((entry) => entry.id).sort()).toEqual(['approved', 'booked', 'canceled', 'password', 'welcome']);
    expect(target.calls.filter((call) => call.startsWith('PATCH'))).toEqual([]);
    expect(() => statSync(pathIn(dir, FILES.pausedAutomations))).toThrow();
  });

  it('with all: true it also pauses the order and receipt automations, but never an inactive one', async () => {
    const target = createFakeTarget({ automations: site });
    const summary = await pauseAutomations(target.http, dir, { apply: true, all: true });
    expect(summary.paused).toBe(7);
    for (const id of ['booked', 'canceled', 'welcome', 'password', 'approved', 'receipt', 'order-mail']) expect(statusOf(target, id), id).toBe('INACTIVE');
    expect(summary.candidates.map((entry) => entry.id)).not.toContain('already-off');
  });

  it('pauses only active booking, plan and member automations and leaves the rest alone', async () => {
    const target = createFakeTarget({ automations: site });
    const summary = await pauseAutomations(target.http, dir, { apply: true });
    expect(summary.paused).toBe(5);
    for (const id of ['booked', 'canceled', 'welcome', 'password', 'approved']) expect(statusOf(target, id), id).toBe('INACTIVE');
    expect(statusOf(target, 'receipt')).toBe('ACTIVE');
    expect(statusOf(target, 'order-mail')).toBe('ACTIVE');
  });

  it('writes the snapshot, privately, before it changes anything, and records each pause', async () => {
    const target = createFakeTarget({ automations: site, failPatchFor: 'canceled' });
    await pauseAutomations(target.http, dir, { apply: true });
    const snapshot = readJson<{ entries: Array<{ id: string; state: string }> }>(pathIn(dir, FILES.pausedAutomations));
    expect(snapshot.entries.map((entry) => entry.id).sort()).toEqual(['approved', 'booked', 'canceled', 'password', 'welcome']);
    expect(snapshot.entries.find((entry) => entry.id === 'canceled')?.state).toBe('failed');
    expect(snapshot.entries.find((entry) => entry.id === 'booked')?.state).toBe('paused');
    expect(statSync(pathIn(dir, FILES.pausedAutomations)).mode & 0o777).toBe(0o600);
  });

  it('keeps going after one automation cannot be paused, and says which', async () => {
    const target = createFakeTarget({ automations: site, failPatchFor: 'booked' });
    const summary = await pauseAutomations(target.http, dir, { apply: true });
    expect(summary.failed.map((entry) => entry.id)).toEqual(['booked']);
    expect(summary.paused).toBe(4);
  });

  it('does not touch an automation the owning app locked, and reports it', async () => {
    const target = createFakeTarget({ automations: [a('locked', 'wix_bookings-sessions_booked', 'ACTIVE', { locked: true }), a('free', 'wix_bookings-booking_canceled')] });
    const summary = await pauseAutomations(target.http, dir, { apply: true });
    expect(summary.locked.map((entry) => entry.id)).toEqual(['locked']);
    expect(statusOf(target, 'locked')).toBe('ACTIVE');
    expect(statusOf(target, 'free')).toBe('INACTIVE');
  });

  it('records the new id when Wix answers a preinstalled automation under an override', async () => {
    const target = createFakeTarget({ automations: [a('welcome', 'wix_pricing_plans-plan_purchased')], overrideIdOnPatch: true });
    await pauseAutomations(target.http, dir, { apply: true });
    const [entry] = readJson<{ entries: Array<{ id: string; pausedId?: string; state: string }> }>(pathIn(dir, FILES.pausedAutomations)).entries;
    expect(entry).toMatchObject({ id: 'welcome', pausedId: 'welcome-override', state: 'paused' });
  });

  it('does not report a pause the read-back does not confirm', async () => {
    const target = createFakeTarget({ automations: [a('booked', 'wix_bookings-sessions_booked')], ignorePatch: true });
    const summary = await pauseAutomations(target.http, dir, { apply: true });
    expect(summary.paused).toBe(0);
    expect(summary.failed.map((entry) => entry.id)).toEqual(['booked']);
  });

  it('finds every automation across pages', async () => {
    const many = Array.from({ length: 230 }, (_, index) => a(`b${index}`, 'wix_bookings-booking_canceled'));
    const target = createFakeTarget({ automations: many });
    const summary = await pauseAutomations(target.http, dir, { apply: false });
    expect(summary.candidates).toHaveLength(230);
  });

  it('is safe to run twice: what is already paused is not paused again', async () => {
    const target = createFakeTarget({ automations: site });
    await pauseAutomations(target.http, dir, { apply: true });
    const before = target.calls.filter((call) => call.startsWith('PATCH')).length;
    const again = await pauseAutomations(target.http, dir, { apply: true });
    expect(again.paused).toBe(5);
    expect(target.calls.filter((call) => call.startsWith('PATCH')).length).toBe(before);
    expect(readFileSync(pathIn(dir, FILES.pausedAutomations), 'utf8')).toContain('"state": "paused"');
  });
});
