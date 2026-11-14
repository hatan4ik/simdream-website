import { FILES, ensureDataDir, pathIn, writeJson, writeNdjson } from './io';
import type { SourceContact, SourceOrder } from './types';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const MAX_PAGES = 1000;

export interface SourceLabel {
  key: string;
  displayName: string;
  labelType?: string;
  tagId?: string;
}

export interface ExportManifest {
  exportedAt: string;
  sourceSiteId: string;
  counts: { contacts: number; orders: number; planOrders: number; labels: number };
  /** What Count Contacts reported at the end of the export; a mismatch means contacts changed during it. */
  contactCountReported: number | null;
  complete: boolean;
  warnings: string[];
}

interface CursorPage {
  next?: string;
  hasNext: boolean;
}

function cursorOf(paging: { hasNext?: boolean; cursors?: { next?: string } } | undefined): CursorPage {
  const next = paging?.cursors?.next;
  return { next, hasNext: Boolean(paging?.hasNext && next) };
}

async function readLabels(http: WixHttp): Promise<SourceLabel[]> {
  const labels: SourceLabel[] = [];
  for (let offset = 0, page = 0; page < MAX_PAGES; page += 1) {
    const response = await http.request<{ labels?: SourceLabel[]; pagingMetadata?: { total?: number } }>('POST', `${API}/contacts/v4/labels/query`, {
      query: { paging: { limit: 100, offset } },
    });
    const batch = response.labels ?? [];
    labels.push(...batch);
    offset += batch.length;
    if (batch.length < 100 || (response.pagingMetadata?.total !== undefined && offset >= response.pagingMetadata.total)) break;
  }
  return labels;
}

/** Label display names per contact id. v5 contacts do not list label keys, so each label is asked who holds it. */
async function readLabelMembership(http: WixHttp, labels: readonly SourceLabel[], log: (message: string) => void): Promise<Map<string, string[]>> {
  const byContact = new Map<string, string[]>();
  for (const label of labels) {
    let holders = 0;
    for (let offset = 0, page = 0; page < MAX_PAGES; page += 1) {
      const response = await http.request<{ contacts?: Array<{ id: string }> }>('POST', `${API}/contacts/v4/contacts/query`, {
        query: { filter: { 'info.labelKeys': { $hasSome: [label.key] } }, fields: ['id'], paging: { limit: 1000, offset } },
      });
      const batch = response.contacts ?? [];
      for (const { id } of batch) {
        const names = byContact.get(id) ?? [];
        names.push(label.displayName);
        byContact.set(id, names);
      }
      holders += batch.length;
      offset += batch.length;
      if (batch.length < 1000) break;
    }
    log(`label "${label.displayName}": ${holders} contact(s)`);
  }
  return byContact;
}

/**
 * Reads everything the migration needs from the source site into plain local files:
 * contacts (with label names), eCommerce orders, Pricing Plan orders and the label list.
 * Read-only by construction (see createSourceHttp). The manifest is written last, so its
 * presence means the export finished.
 */
export async function runExport(http: WixHttp, dir: string, log: (message: string) => void = () => undefined): Promise<ExportManifest> {
  ensureDataDir(dir);
  const warnings: string[] = [];

  log('Reading labels…');
  const labels = await readLabels(http);
  const membership = await readLabelMembership(http, labels, log);

  log('Reading contacts…');
  const contacts: SourceContact[] = [];
  for (let cursor: string | undefined, page = 0; page < MAX_PAGES; page += 1) {
    const response = await http.request<{ contacts?: SourceContact[]; pagingMetadata?: { hasNext?: boolean; cursors?: { next?: string } } }>(
      'POST',
      `${API}/contacts/v5/contacts/query`,
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } },
    );
    for (const contact of response.contacts ?? []) contacts.push({ ...contact, labels: membership.get(contact.id) ?? [] });
    const paging = cursorOf(response.pagingMetadata);
    log(`  contacts: ${contacts.length}`);
    if (!paging.hasNext || paging.next === cursor) break;
    cursor = paging.next;
  }

  log('Reading orders…');
  const orders: SourceOrder[] = [];
  for (let cursor: string | undefined, page = 0; page < MAX_PAGES; page += 1) {
    const response = await http.request<{ orders?: SourceOrder[]; metadata?: { hasNext?: boolean; cursors?: { next?: string } } }>(
      'POST',
      `${API}/ecom/v1/orders/search`,
      { search: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } },
    );
    orders.push(...(response.orders ?? []));
    const paging = cursorOf(response.metadata);
    log(`  orders: ${orders.length}`);
    if (!paging.hasNext || paging.next === cursor) break;
    cursor = paging.next;
  }

  log('Reading Pricing Plan orders…');
  const planOrders: Array<Record<string, unknown>> = [];
  for (let offset = 0, page = 0; page < MAX_PAGES; page += 1) {
    const response = await http.request<{ orders?: Array<Record<string, unknown>>; pagingMetadata?: { hasNext?: boolean } }>(
      'GET',
      `${API}/pricing-plans/v2/orders?limit=50&offset=${offset}&fieldSet=FULL`,
    );
    const batch = response.orders ?? [];
    planOrders.push(...batch);
    offset += batch.length;
    log(`  plan orders: ${planOrders.length}`);
    if (batch.length === 0 || !response.pagingMetadata?.hasNext) break;
  }

  const reported = await http.request<{ count?: number }>('POST', `${API}/contacts/v5/contacts/count`, {}).then(
    (response) => response.count ?? null,
    () => null,
  );
  if (reported !== null && reported !== contacts.length) {
    warnings.push(`Count Contacts reported ${reported} but ${contacts.length} were read; contacts changed during the export. Run it again for a consistent copy.`);
  }
  if (new Set(contacts.map((contact) => contact.id)).size !== contacts.length) warnings.push('Some contact ids repeated across pages; the dedupe stage ignores the repeats.');

  writeJson(pathIn(dir, FILES.labels), labels);
  writeNdjson(pathIn(dir, FILES.contacts), contacts);
  writeNdjson(pathIn(dir, FILES.orders), orders);
  writeNdjson(pathIn(dir, FILES.planOrders), planOrders);
  const manifest: ExportManifest = {
    exportedAt: new Date().toISOString(),
    sourceSiteId: http.siteId,
    counts: { contacts: contacts.length, orders: orders.length, planOrders: planOrders.length, labels: labels.length },
    contactCountReported: reported,
    complete: reported === null || reported === contacts.length,
    warnings,
  };
  writeJson(pathIn(dir, FILES.exportManifest), manifest);
  return manifest;
}
