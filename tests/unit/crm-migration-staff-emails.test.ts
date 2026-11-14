import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILES, ensureDataDir, pathIn, readJson } from '../../tools/crm-migration/io';
import { redirectStaffEmails, restoreStaffEmails } from '../../tools/crm-migration/staff';
import { createFakeTarget } from './_support/crm-fake-wix';

const OWNER = 'owner@example.com';
const staff = [
  { name: 'Natan', resourceId: 'r1', email: 'natan@elsewhere.com' },
  { name: 'Mike', resourceId: 'r2', email: 'Mike@Elsewhere.com' },
  { name: 'Already Me', resourceId: 'r3', email: 'OWNER@example.com' },
  { name: 'No Email', resourceId: 'r4' },
];
const emailOf = (target: ReturnType<typeof createFakeTarget>, name: string) => [...target.staffMembers.values()].find((member) => member.name === name)?.email;

describe('redirectStaffEmails', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-staff-'));
    ensureDataDir(dir);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('a dry run lists who would change and changes nothing', async () => {
    const target = createFakeTarget({ staff });
    const summary = await redirectStaffEmails(target.http, dir, OWNER, { apply: false });
    expect(summary.candidates.map((entry) => entry.name).sort()).toEqual(['Mike', 'Natan']);
    expect(target.calls.filter((call) => call.startsWith('PATCH'))).toEqual([]);
  });

  it('points every other staff email at the owner, and leaves the owner’s own and staff without an email alone', async () => {
    const target = createFakeTarget({ staff });
    const summary = await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    expect(summary.changed).toBe(2);
    expect(emailOf(target, 'Natan')).toBe(OWNER);
    expect(emailOf(target, 'Mike')).toBe(OWNER);
    expect(emailOf(target, 'Already Me')).toBe('OWNER@example.com');
    expect(emailOf(target, 'No Email')).toBeUndefined();
  });

  it('writes the original emails, privately, before it changes anything', async () => {
    const target = createFakeTarget({ staff, failStaffPatchFor: 'Mike' });
    await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    const snapshot = readJson<{ entries: Array<{ name: string; email: string; state: string }> }>(pathIn(dir, FILES.staffEmails));
    expect(snapshot.entries.find((entry) => entry.name === 'Natan')).toMatchObject({ email: 'natan@elsewhere.com', state: 'changed' });
    expect(snapshot.entries.find((entry) => entry.name === 'Mike')).toMatchObject({ email: 'Mike@Elsewhere.com', state: 'failed' });
    expect(statSync(pathIn(dir, FILES.staffEmails)).mode & 0o777).toBe(0o600);
  });

  it('does not report a change the read-back does not confirm', async () => {
    const target = createFakeTarget({ staff, ignoreStaffPatch: true });
    const summary = await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    expect(summary.changed).toBe(0);
    expect(summary.failed.map((entry) => entry.name).sort()).toEqual(['Mike', 'Natan']);
  });

  it('is safe to run twice', async () => {
    const target = createFakeTarget({ staff });
    await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    const patches = target.calls.filter((call) => call.startsWith('PATCH')).length;
    const again = await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    expect(target.calls.filter((call) => call.startsWith('PATCH')).length).toBe(patches);
    expect(again.changed).toBe(2);
  });

  it('restore puts the original emails back', async () => {
    const target = createFakeTarget({ staff });
    await redirectStaffEmails(target.http, dir, OWNER, { apply: true });
    const restored = await restoreStaffEmails(target.http, dir, { apply: true });
    expect(restored.restored).toBe(2);
    expect(emailOf(target, 'Natan')).toBe('natan@elsewhere.com');
    expect(emailOf(target, 'Mike')).toBe('Mike@Elsewhere.com');
  });
});
