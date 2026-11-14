import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runExportRelated } from '../../tools/crm-migration/export-related';
import { FILES, ensureDataDir, pathIn, readJson, readNdjson, writeNdjson } from '../../tools/crm-migration/io';
import { isReadOnlyCall } from '../../tools/crm-migration/wix-http';
import { createFakeSource, type FakeSourceData } from './_support/crm-fake-wix';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crm-related-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const API = 'https://www.wixapis.com';
const rows = (count: number, make: (index: number) => Record<string, unknown>) => Array.from({ length: count }, (_, index) => make(index));
const emptySource: FakeSourceData = { labels: [], membership: {}, contacts: [], orders: [], planOrders: [] };

/** Related export needs the orders file the main export writes, to know which orders to ask about. */
function seedOrders(count: number): string[] {
  ensureDataDir(dir);
  const orders = rows(count, (index) => ({ id: `order-${index}` }));
  writeNdjson(pathIn(dir, FILES.orders), orders);
  return orders.map((order) => String(order.id));
}

describe('isReadOnlyCall: related records', () => {
  it('allows the seven read endpoints the related export uses', () => {
    for (const path of [
      '/bookings/bookings-reader/v2/extended-bookings/query',
      '/bookings/bookings-reader/v2/extended-bookings/count',
      '/form-schema-service/v4/forms/query',
      '/form-submission-service/v4/submissions/query',
      '/members/v1/members/query',
      '/stores/v2/coupons/query',
      '/ecom/v1/payments/list-by-ids',
    ]) {
      expect(isReadOnlyCall('POST', `${API}${path}`), path).toBe(true);
    }
  });

  it('still refuses the write calls that sit next to them', () => {
    for (const path of [
      '/bookings/v2/bookings',
      '/bookings/bookings-reader/v2/extended-bookings/query/../cancel',
      '/members/v1/members',
      '/stores/v2/coupons',
      '/form-submission-service/v4/submissions',
      '/ecom/v1/payments/orders/order-1/add-payments',
    ]) {
      expect(isReadOnlyCall('POST', `${API}${path}`), path).toBe(false);
    }
    expect(isReadOnlyCall('DELETE', `${API}/stores/v2/coupons/query`)).toBe(false);
  });
});

describe('runExportRelated', () => {
  it('writes each related record type to its own private file and the manifest last', async () => {
    seedOrders(2);
    const source = createFakeSource({
      ...emptySource,
      bookings: rows(3, (index) => ({ booking: { id: `b${index}`, status: 'CONFIRMED' } })),
      forms: [{ id: 'form-birthday', name: 'Birthday form' }, { id: 'form-inquiry', name: 'Inquiry' }],
      submissions: { 'form-birthday': rows(4, (index) => ({ id: `s${index}`, formId: 'form-birthday', contactId: 'c1' })), 'form-inquiry': [] },
      members: rows(2, (index) => ({ id: `m${index}`, loginEmail: `m${index}@example.com` })),
      coupons: rows(5, (index) => ({ id: `k${index}` })),
      transactions: { 'order-0': { payments: [{ id: 'p0' }] }, 'order-1': { refunds: [{ id: 'r0' }] } },
    });

    const manifest = await runExportRelated(source.http, dir);

    expect(manifest.counts).toEqual({ bookings: 3, forms: 2, formSubmissions: 4, members: 2, orderTransactions: 2, coupons: 5 });
    expect(readNdjson(pathIn(dir, FILES.bookings))).toHaveLength(3);
    expect(readNdjson(pathIn(dir, FILES.formSubmissions))).toHaveLength(4);
    expect(readNdjson<{ loginEmail?: string }>(pathIn(dir, FILES.members))[0]?.loginEmail).toBe('m0@example.com');
    expect(readNdjson(pathIn(dir, FILES.coupons))).toHaveLength(5);
    const transactions = readNdjson<{ orderId: string; payments: unknown[]; refunds: unknown[] }>(pathIn(dir, FILES.orderTransactions));
    expect(transactions.map((entry) => entry.payments.length + entry.refunds.length)).toEqual([1, 1]);
    expect(readJson<Array<{ id: string }>>(pathIn(dir, FILES.forms)).map((form) => form.id)).toEqual(['form-birthday', 'form-inquiry']);
    expect(statSync(pathIn(dir, FILES.formSubmissions)).mode & 0o777).toBe(0o600);
    expect(readJson<{ complete: boolean }>(pathIn(dir, FILES.relatedManifest)).complete).toBe(true);
  });

  it.each(['metadata', 'pagingMetadata'] as const)('reads every page when the cursor arrives in %s and there is no hasNext flag', async (cursorField) => {
    seedOrders(1);
    const source = createFakeSource({
      ...emptySource,
      cursorField,
      bookings: rows(250, (index) => ({ booking: { id: `b${index}` } })),
      forms: [{ id: 'form-birthday', name: 'Birthday form' }],
      submissions: { 'form-birthday': rows(501, (index) => ({ id: `s${index}`, formId: 'form-birthday' })) },
    });

    const manifest = await runExportRelated(source.http, dir);

    // The first page alone would have held 100; reading only page one is the failure this pins.
    expect(manifest.counts.bookings).toBe(250);
    expect(manifest.counts.formSubmissions).toBe(501);
    expect(new Set(readNdjson<{ id: string }>(pathIn(dir, FILES.formSubmissions)).map((submission) => submission.id)).size).toBe(501);
  });

  it('asks for the FULL member fieldset and a namespace on forms, which Wix requires', async () => {
    seedOrders(1);
    const source = createFakeSource({ ...emptySource, forms: [{ id: 'f', name: 'F' }], submissions: { f: [] }, members: [{ id: 'm1', loginEmail: 'a@example.com' }] });
    await expect(runExportRelated(source.http, dir)).resolves.toMatchObject({ counts: { members: 1, forms: 1 } });
  });

  it('pages members and coupons past one page', async () => {
    seedOrders(1);
    const source = createFakeSource({ ...emptySource, members: rows(230, (index) => ({ id: `m${index}`, loginEmail: 'x@example.com' })), coupons: rows(230, (index) => ({ id: `k${index}` })) });
    const manifest = await runExportRelated(source.http, dir);
    expect(manifest.counts.members).toBe(230);
    expect(manifest.counts.coupons).toBe(230);
  });

  it('asks about order transactions 100 orders at a time', async () => {
    seedOrders(230);
    const source = createFakeSource(emptySource);
    const manifest = await runExportRelated(source.http, dir);
    expect(manifest.counts.orderTransactions).toBe(230);
    expect(source.calls.filter((call) => call.endsWith('/ecom/v1/payments/list-by-ids'))).toHaveLength(3);
  });

  it('warns, and marks the export incomplete, when Wix reports more bookings than were read', async () => {
    seedOrders(1);
    const source = createFakeSource({ ...emptySource, bookings: rows(3, (index) => ({ booking: { id: `b${index}` } })), bookingsReportedCount: 5 });
    const manifest = await runExportRelated(source.http, dir);
    expect(manifest.complete).toBe(false);
    expect(manifest.warnings.join(' ')).toMatch(/5 bookings/);
  });

  it('stops with a clear message when the orders export has not been run', async () => {
    ensureDataDir(dir);
    await expect(runExportRelated(createFakeSource(emptySource).http, dir)).rejects.toThrow(/run .*export.* first/i);
  });

  it('says what it did not export and why, so a gap is never silent', async () => {
    seedOrders(1);
    const manifest = await runExportRelated(createFakeSource(emptySource).http, dir);
    expect(manifest.notExported.map((entry) => entry.what)).toEqual(expect.arrayContaining(['invoices', 'activity log', 'segments']));
    expect(manifest.notExported.every((entry) => entry.reason.length > 10)).toBe(true);
  });
});
