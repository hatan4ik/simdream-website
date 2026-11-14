import { FILES, pathIn, readJson, readNdjson } from './io';
import type { LoadState } from './load';
import type { MergedPerson, SourceOrder } from './types';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface VerifyReport {
  ok: boolean;
  checks: VerifyCheck[];
}

/** Integer agorot/cents so sums compare exactly. */
const cents = (amount: unknown): number => Math.round(Number(typeof amount === 'string' ? amount : '0') * 100);

interface TargetOrder {
  id?: string;
  number?: string | number;
  purchasedDate?: string;
  imported?: boolean;
  channelInfo?: { externalOrderId?: string };
  buyerInfo?: { contactId?: string };
  priceSummary?: { total?: { amount?: string } };
}

/**
 * Reads the staging site back and checks it against what the load state says was written:
 * contacts exist, every imported order is present with the number, date and total of its
 * source order. Read-only.
 */
export async function runVerify(http: WixHttp, dir: string, log: (message: string) => void = () => undefined): Promise<VerifyReport> {
  const state = readJson<LoadState>(pathIn(dir, FILES.loadState));
  const sourceOrders = new Map(readNdjson<SourceOrder>(pathIn(dir, FILES.orders)).map((order) => [order.id, order] as const));
  const checks: VerifyCheck[] = [];

  // Contacts: the first hundred recorded ids must exist on the target.
  const ids = Object.values(state.contacts).slice(0, 100);
  if (ids.length > 0) {
    const found = await http.request<{ contacts?: Array<{ id: string }> }>('POST', `${API}/contacts/v5/contacts/query`, {
      query: { filter: { id: { $in: ids } }, cursorPaging: { limit: 100 } },
    });
    const present = found.contacts?.length ?? 0;
    checks.push({ name: 'sampled contacts exist on staging', ok: present === ids.length, detail: `${present}/${ids.length}` });
  }
  const total = await http.request<{ count?: number }>('POST', `${API}/contacts/v5/contacts/count`, {});
  const expected = Object.keys(state.contacts).length;
  checks.push({ name: 'staging holds at least the copied contacts', ok: (total.count ?? 0) >= expected, detail: `staging ${total.count ?? '?'} ≥ copied ${expected}` });

  // Birthdays: every person who has one must carry the same date on staging. A contact that already existed on
  // staging was only matched, never written, so its birthday was never ours to set and is left out.
  const people = readNdjson<MergedPerson>(pathIn(dir, FILES.people));
  const adopted = new Set(state.adopted);
  const expectedBirthdays = people.filter((person) => person.birthdate && state.contacts[person.personId] && !adopted.has(person.personId));
  const skippedExisting = people.filter((person) => person.birthdate && adopted.has(person.personId)).length;
  let matching = 0;
  let different = 0;
  let missingOnStaging = 0;
  for (let start = 0; start < expectedBirthdays.length; start += 100) {
    const batch = expectedBirthdays.slice(start, start + 100);
    const response = await http.request<{ contacts?: Array<{ id: string; birthdate?: string }> }>('POST', `${API}/contacts/v5/contacts/query`, {
      query: { filter: { id: { $in: batch.map((person) => state.contacts[person.personId]) } }, cursorPaging: { limit: 100 } },
    });
    const byId = new Map((response.contacts ?? []).map((contact) => [contact.id, contact] as const));
    for (const person of batch) {
      const staged = byId.get(state.contacts[person.personId]!)?.birthdate;
      if (staged === person.birthdate) matching += 1;
      else if (staged) different += 1;
      else missingOnStaging += 1;
    }
  }
  checks.push({
    name: 'birthdays copied to staging',
    ok: different === 0 && missingOnStaging === 0,
    detail:
      `${matching}/${expectedBirthdays.length} match` +
      (different + missingOnStaging > 0 ? ` (${different} different, ${missingOnStaging} missing on staging)` : '') +
      (skippedExisting > 0 ? `; ${skippedExisting} on a contact that already existed` : ''),
  });

  // Orders: page the target and compare with the source order each was imported from.
  const imported = new Map<string, TargetOrder>();
  for (let cursor: string | undefined, page = 0; page < 1000; page += 1) {
    const response = await http.request<{ orders?: TargetOrder[]; metadata?: { hasNext?: boolean; cursors?: { next?: string } } }>('POST', `${API}/ecom/v1/orders/search`, {
      search: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } },
    });
    for (const order of response.orders ?? []) {
      const sourceId = order.channelInfo?.externalOrderId;
      if (order.imported && sourceId) imported.set(sourceId, order);
    }
    const next = response.metadata?.cursors?.next;
    if (!response.metadata?.hasNext || !next || next === cursor) break;
    cursor = next;
    log(`  scanned ${imported.size} imported orders`);
  }

  const wanted = Object.keys(state.orders);
  const missing = wanted.filter((id) => !imported.has(id));
  checks.push({ name: 'every imported order is on staging', ok: missing.length === 0, detail: `${wanted.length - missing.length}/${wanted.length}` });

  let numberDrift = 0;
  let dateDrift = 0;
  let sourceCents = 0;
  let targetCents = 0;
  for (const id of wanted) {
    const target = imported.get(id);
    const source = sourceOrders.get(id);
    if (!target || !source) continue;
    if (source.number !== undefined && String(target.number) !== String(source.number)) numberDrift += 1;
    const sourceDate = source.purchasedDate ?? source.createdDate;
    if (sourceDate && target.purchasedDate && Date.parse(target.purchasedDate) !== Date.parse(sourceDate)) dateDrift += 1;
    sourceCents += cents((source.priceSummary as { total?: { amount?: string } } | undefined)?.total?.amount);
    targetCents += cents(target.priceSummary?.total?.amount);
  }
  // Every imported order must point at the staging contact of its source buyer: that link is how the
  // order appears under the contact. An order whose buyer is not in the export has no contact to point at.
  const contactToPerson = readJson<Record<string, string>>(pathIn(dir, FILES.contactMap), {});
  let linked = 0;
  let wrong = 0;
  let withoutContact = 0;
  for (const id of wanted) {
    const target = imported.get(id);
    const source = sourceOrders.get(id);
    if (!target || !source) continue;
    const person = source.buyerInfo?.contactId ? contactToPerson[source.buyerInfo.contactId] : undefined;
    const expected = person ? state.contacts[person] : undefined;
    if (!expected) {
      withoutContact += 1;
      continue;
    }
    if (target.buyerInfo?.contactId === expected) linked += 1;
    else wrong += 1;
  }
  checks.push({
    name: 'imported orders are linked to their buyer’s staging contact',
    ok: wrong === 0,
    detail: `${linked}/${linked + wrong} linked${withoutContact > 0 ? `; ${withoutContact} without a contact (the buyer is not in the export)` : ''}`,
  });

  checks.push({ name: 'order numbers preserved', ok: numberDrift === 0, detail: `${numberDrift} differ` });
  checks.push({ name: 'purchase dates preserved', ok: dateDrift === 0, detail: `${dateDrift} differ` });
  checks.push({ name: 'order totals add up to the source', ok: sourceCents === targetCents, detail: `source ${(sourceCents / 100).toFixed(2)} vs staging ${(targetCents / 100).toFixed(2)}` });
  checks.push({ name: 'no recorded failures', ok: Object.keys(state.contactFailures).length + Object.keys(state.orderFailures).length === 0, detail: `${Object.keys(state.contactFailures).length} contact, ${Object.keys(state.orderFailures).length} order` });

  return { ok: checks.every((check) => check.ok), checks };
}
