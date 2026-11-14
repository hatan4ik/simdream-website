import { existsSync } from 'node:fs';
import { FILES, pathIn, readJson, readNdjson } from './io';
import type { SourceContact, SourceOrder } from './types';

/** What the owner chose to leave out of the migration (for example their own test customer). */
export interface Exclusions {
  /** The email addresses given in `overrides.json`, lowercased. */
  emails: string[];
  /** Every source contact that holds one of those emails, as its main or an additional address. */
  contactIds: string[];
  /** Every order those contacts bought, by contact id or by buyer email. */
  orderIds: string[];
}

const normal = (email: string | null | undefined): string => (email ?? '').trim().toLowerCase();

/** Contacts and orders belonging to the given emails. Pure; the export itself is never edited. */
export function findExclusions(contacts: readonly SourceContact[], orders: readonly SourceOrder[], emails: readonly string[]): Exclusions {
  const wanted = new Set(emails.map(normal).filter(Boolean));
  if (wanted.size === 0) return { emails: [], contactIds: [], orderIds: [] };
  const contactIds = new Set(
    contacts
      .filter((contact) => [contact.email?.email, ...(contact.additionalEmails ?? []).map((extra) => extra.email)].some((email) => wanted.has(normal(email))))
      .map((contact) => contact.id),
  );
  const orderIds = orders
    .filter((order) => (order.buyerInfo?.contactId && contactIds.has(order.buyerInfo.contactId)) || wanted.has(normal(order.buyerInfo?.email)))
    .map((order) => order.id);
  return { emails: [...wanted], contactIds: [...contactIds], orderIds };
}

/**
 * The orders to migrate: the exported orders minus those of excluded contacts. `load` and `verify` read
 * orders through this, so a contact left out by `dedupe` is left out everywhere. The exported file is untouched,
 * and removing the override and running `dedupe` again brings the orders back.
 */
export function readOrdersToMigrate(dir: string): SourceOrder[] {
  const orders = readNdjson<SourceOrder>(pathIn(dir, FILES.orders));
  const file = pathIn(dir, FILES.excluded);
  if (!existsSync(file)) return orders;
  const skipped = new Set(readJson<Exclusions>(file, { emails: [], contactIds: [], orderIds: [] }).orderIds);
  return skipped.size === 0 ? orders : orders.filter((order) => !skipped.has(order.id));
}
