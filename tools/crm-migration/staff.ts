import { existsSync } from 'node:fs';
import { FILES, pathIn, readJson, writeJson } from './io';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com/bookings/v1/staff-members';

export interface StaffEmailEntry {
  id: string;
  name: string;
  /** The address the staff member had before the change. */
  email: string;
  state: 'planned' | 'changed' | 'failed' | 'restored';
  note?: string;
}

export interface StaffEmailSnapshot {
  changedAt: string;
  /** The address they were all pointed at. */
  to: string;
  entries: StaffEmailEntry[];
}

interface StaffMember {
  id: string;
  name?: string;
  email?: string;
  revision?: string;
}

const same = (a: string | undefined, b: string | undefined): boolean => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const noteOf = (error: unknown): string => (error instanceof Error ? error.message.slice(0, 200) : String(error));

async function listStaff(http: WixHttp): Promise<StaffMember[]> {
  const response = await http.request<{ staffMembers?: StaffMember[] }>('POST', `${API}/query`, { query: { paging: { limit: 100 } } });
  return response.staffMembers ?? [];
}

async function setEmail(http: WixHttp, id: string, email: string): Promise<StaffMember | undefined> {
  const current = (await http.request<{ staffMember: StaffMember }>('GET', `${API}/${id}`)).staffMember;
  const updated = await http.request<{ staffMember?: StaffMember }>('PATCH', `${API}/${id}`, { staffMember: { id, revision: current.revision, email } });
  return updated.staffMember;
}

/**
 * Points every staff member's email on staging at one address (the owner's), so a booking assigned to staff can
 * notify nobody but the owner. Only staff who have a different address are touched; staff without an address, and
 * those already on it, are left alone. The addresses they had are written to a private file BEFORE the first change,
 * so `restore` can put them back. Dry run unless `apply`.
 */
export async function redirectStaffEmails(
  http: WixHttp,
  dir: string,
  to: string,
  options: { apply: boolean },
  log: (message: string) => void = () => undefined,
): Promise<{ candidates: StaffEmailEntry[]; changed: number; failed: StaffEmailEntry[] }> {
  const file = pathIn(dir, FILES.staffEmails);
  const previous = existsSync(file) ? readJson<StaffEmailSnapshot>(file) : undefined;
  const found = (await listStaff(http)).filter((member) => member.email && !same(member.email, to));
  const candidates: StaffEmailEntry[] = found.map((member) => ({ id: member.id, name: member.name ?? member.id, email: member.email!, state: 'planned' }));
  if (!options.apply) return { candidates, changed: previous?.entries.filter((entry) => entry.state === 'changed').length ?? 0, failed: [] };

  // What was already changed in an earlier run keeps its recorded original address; anything newly found is added.
  const entries = new Map<string, StaffEmailEntry>((previous?.entries ?? []).filter((entry) => entry.state === 'changed').map((entry) => [entry.id, entry] as const));
  for (const entry of candidates) entries.set(entry.id, entry);
  const snapshot: StaffEmailSnapshot = { changedAt: previous?.changedAt ?? new Date().toISOString(), to, entries: [...entries.values()] };
  writeJson(file, snapshot);

  for (const entry of snapshot.entries.filter((candidate) => candidate.state === 'planned')) {
    try {
      const updated = await setEmail(http, entry.id, to);
      if (same(updated?.email, to)) entry.state = 'changed';
      else {
        entry.state = 'failed';
        entry.note = `read-back shows ${updated?.email ? 'a different address' : 'no address'}`;
      }
    } catch (error) {
      entry.state = 'failed';
      entry.note = noteOf(error);
    }
    writeJson(file, snapshot);
    log(`  ${entry.state}: ${entry.name}`);
  }
  return {
    candidates,
    changed: snapshot.entries.filter((entry) => entry.state === 'changed').length,
    failed: snapshot.entries.filter((entry) => entry.state === 'failed'),
  };
}

/** Puts back the addresses the snapshot recorded, for the staff that were changed. Dry run unless `apply`. */
export async function restoreStaffEmails(http: WixHttp, dir: string, options: { apply: boolean }, log: (message: string) => void = () => undefined): Promise<{ restored: number; failed: StaffEmailEntry[] }> {
  const file = pathIn(dir, FILES.staffEmails);
  if (!existsSync(file)) throw new Error('No snapshot of staff emails to restore from.');
  const snapshot = readJson<StaffEmailSnapshot>(file);
  const todo = snapshot.entries.filter((entry) => entry.state === 'changed');
  if (!options.apply) return { restored: 0, failed: [] };
  for (const entry of todo) {
    try {
      const updated = await setEmail(http, entry.id, entry.email);
      if (same(updated?.email, entry.email)) entry.state = 'restored';
      else {
        entry.state = 'failed';
        entry.note = 'read-back does not show the original address';
      }
    } catch (error) {
      entry.state = 'failed';
      entry.note = noteOf(error);
    }
    writeJson(file, snapshot);
    log(`  ${entry.state}: ${entry.name}`);
  }
  return { restored: snapshot.entries.filter((entry) => entry.state === 'restored').length, failed: snapshot.entries.filter((entry) => entry.state === 'failed') };
}
