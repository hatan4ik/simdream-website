import { existsSync } from 'node:fs';
import { FILES, ensureDataDir, pathIn, readNdjson, writeJson, writeNdjson } from './io';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const MAX_PAGES = 5000;
const FORMS_NAMESPACE = 'wix.form_app.form';
const TRANSACTION_BATCH = 100;

type Row = Record<string, unknown>;

export interface RelatedManifest {
  exportedAt: string;
  sourceSiteId: string;
  counts: { bookings: number; forms: number; formSubmissions: number; members: number; orderTransactions: number; coupons: number };
  /** What Wix itself reported as the total, where it offers one. A mismatch with `counts` marks the export incomplete. */
  reported: { bookings: number | null; members: number | null; coupons: number | null };
  complete: boolean;
  warnings: string[];
  /** Records tied to customers that this export cannot read, and why. A gap is never silent. */
  notExported: Array<{ what: string; reason: string }>;
}

interface CursorEnvelope {
  metadata?: { cursors?: { next?: string } };
  pagingMetadata?: { cursors?: { next?: string } };
}

/**
 * Wix is not consistent about where a page's next cursor sits: bookings and orders use `metadata`
 * or `pagingMetadata` depending on the endpoint, and some endpoints send no `hasNext` at all.
 * The cursor itself is the only reliable signal, so that is the one read, from either field.
 */
export function nextCursor(response: CursorEnvelope): string | undefined {
  return response.metadata?.cursors?.next ?? response.pagingMetadata?.cursors?.next;
}

async function readCursorPages(
  fetchPage: (cursor: string | undefined) => Promise<{ rows: Row[]; next: string | undefined }>,
  log: (message: string) => void,
  label: string,
): Promise<Row[]> {
  const all: Row[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { rows, next } = await fetchPage(cursor);
    all.push(...rows);
    log(`  ${label}: ${all.length}`);
    if (!next || next === cursor || rows.length === 0) return all;
    cursor = next;
  }
  throw new Error(`${label}: still more pages after ${MAX_PAGES}; refusing to save a truncated copy.`);
}

async function readOffsetPages(
  fetchPage: (offset: number) => Promise<{ rows: Row[]; total: number | null }>,
  pageSize: number,
  log: (message: string) => void,
  label: string,
): Promise<{ rows: Row[]; total: number | null }> {
  const all: Row[] = [];
  let total: number | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(all.length);
    all.push(...result.rows);
    total = result.total ?? total;
    log(`  ${label}: ${all.length}`);
    if (result.rows.length < pageSize || (total !== null && all.length >= total)) return { rows: all, total };
  }
  throw new Error(`${label}: still more pages after ${MAX_PAGES}; refusing to save a truncated copy.`);
}

/**
 * Reads the records tied to customers that the main export does not hold: bookings, form submissions
 * (a birthday form's answers live here, not on the contact), full site-member records, the payments and
 * refunds of each order, and coupons. Read-only (see createSourceHttp) and written to local files for
 * the owner to keep or inspect; the load stage does not use them. Needs the orders file from `export`.
 */
export async function runExportRelated(http: WixHttp, dir: string, log: (message: string) => void = () => undefined): Promise<RelatedManifest> {
  ensureDataDir(dir);
  const ordersFile = pathIn(dir, FILES.orders);
  if (!existsSync(ordersFile)) {
    throw new Error('Run `crm:migrate export` first: orders.ndjson is missing, and the related export needs the order ids.');
  }
  const orderIds = readNdjson<{ id: string }>(ordersFile).map((order) => order.id);
  const warnings: string[] = [];

  log('Reading bookings…');
  const bookings = await readCursorPages(
    async (cursor) => {
      const response = await http.request<{ extendedBookings?: Row[] } & CursorEnvelope>('POST', `${API}/bookings/bookings-reader/v2/extended-bookings/query`, {
        query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } },
      });
      return { rows: response.extendedBookings ?? [], next: nextCursor(response) };
    },
    log,
    'bookings',
  );
  const bookingsReported = await http.request<{ count?: number }>('POST', `${API}/bookings/bookings-reader/v2/extended-bookings/count`, { filter: {} }).then(
    (response) => response.count ?? null,
    () => null,
  );

  log('Reading forms and their submissions…');
  const formsResponse = await http.request<{ forms?: Row[] }>('POST', `${API}/form-schema-service/v4/forms/query`, {
    query: { filter: { namespace: FORMS_NAMESPACE }, paging: { limit: 100 } },
  });
  const forms = formsResponse.forms ?? [];
  if (forms.length >= 100) warnings.push('The forms query returned 100 forms, the page size; there may be more forms than were read.');
  const submissions: Row[] = [];
  for (const form of forms) {
    const formId = String(form.id);
    const rows = await readCursorPages(
      async (cursor) => {
        const response = await http.request<{ submissions?: Row[] } & CursorEnvelope>('POST', `${API}/form-submission-service/v4/submissions/query`, {
          query: cursor ? { cursorPaging: { cursor } } : { filter: { namespace: FORMS_NAMESPACE, formId }, cursorPaging: { limit: 100 } },
        });
        return { rows: response.submissions ?? [], next: nextCursor(response) };
      },
      log,
      `submissions of "${String(form.name ?? formId)}"`,
    );
    submissions.push(...rows);
  }

  log('Reading site members (full records)…');
  const members = await readOffsetPages(
    async (offset) => {
      const response = await http.request<{ members?: Row[]; metadata?: { total?: number } }>('POST', `${API}/members/v1/members/query`, {
        fieldsets: ['FULL'],
        query: { paging: { limit: 100, offset } },
      });
      return { rows: response.members ?? [], total: response.metadata?.total ?? null };
    },
    100,
    log,
    'members',
  );

  log('Reading coupons…');
  const coupons = await readOffsetPages(
    async (offset) => {
      const response = await http.request<{ coupons?: Row[]; totalResults?: number }>('POST', `${API}/stores/v2/coupons/query`, { query: { paging: { limit: 100, offset } } });
      return { rows: response.coupons ?? [], total: response.totalResults ?? null };
    },
    100,
    log,
    'coupons',
  );

  log('Reading order payments and refunds…');
  const transactions: Row[] = [];
  for (let start = 0; start < orderIds.length; start += TRANSACTION_BATCH) {
    const response = await http.request<{ orderTransactions?: Row[] }>('POST', `${API}/ecom/v1/payments/list-by-ids`, { orderIds: orderIds.slice(start, start + TRANSACTION_BATCH) });
    transactions.push(...(response.orderTransactions ?? []));
    log(`  order transactions: ${transactions.length}`);
  }

  const reported = { bookings: bookingsReported, members: members.total, coupons: coupons.total };
  if (reported.bookings !== null && reported.bookings !== bookings.length) warnings.push(`Count Bookings reported ${reported.bookings} bookings but ${bookings.length} were read.`);
  if (reported.members !== null && reported.members !== members.rows.length) warnings.push(`Query Members reported ${reported.members} members but ${members.rows.length} were read.`);
  if (reported.coupons !== null && reported.coupons !== coupons.rows.length) warnings.push(`Query Coupons reported ${reported.coupons} coupons but ${coupons.rows.length} were read.`);
  if (transactions.length !== orderIds.length) warnings.push(`Asked about ${orderIds.length} orders but got transactions for ${transactions.length}; Wix omits orders the key may not read.`);

  writeNdjson(pathIn(dir, FILES.bookings), bookings);
  writeJson(pathIn(dir, FILES.forms), forms);
  writeNdjson(pathIn(dir, FILES.formSubmissions), submissions);
  writeNdjson(pathIn(dir, FILES.members), members.rows);
  writeNdjson(pathIn(dir, FILES.orderTransactions), transactions);
  writeNdjson(pathIn(dir, FILES.coupons), coupons.rows);
  const manifest: RelatedManifest = {
    exportedAt: new Date().toISOString(),
    sourceSiteId: http.siteId,
    counts: {
      bookings: bookings.length,
      forms: forms.length,
      formSubmissions: submissions.length,
      members: members.rows.length,
      orderTransactions: transactions.length,
      coupons: coupons.rows.length,
    },
    reported,
    complete: warnings.length === 0,
    warnings,
    notExported: [
      { what: 'invoices', reason: 'This site still uses the legacy invoices API; the current Invoices API answers that it is not available here.' },
      { what: 'activity log', reason: 'The per-contact activity API returned server errors for most contacts when sampled, so it cannot be read reliably.' },
      { what: 'segments', reason: 'No public API for reading segment definitions was found in the Wix docs; each exported contact still lists the ids of the segments it belongs to.' },
    ],
  };
  writeJson(pathIn(dir, FILES.relatedManifest), manifest);
  return manifest;
}
