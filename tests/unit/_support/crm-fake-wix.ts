import { CANONICAL_STAGING_WIX_SITE_ID } from '../../../lib/wix/backend-blueprint';
import { WixHttpError, type HttpMethod, type WixHttp } from '../../../tools/crm-migration/wix-http';

/** In-memory stand-ins for the two Wix sites, enough of each API for the migration stages to run against. */

type Json = Record<string, unknown>;
const API = 'https://www.wixapis.com';

export interface FakeTargetOptions {
  existingContacts?: Array<{ id: string; email?: string; phone?: string }>;
  /** Reject any contact that carries a birthdate, as Wix would reject a malformed optional field. */
  rejectBirthdate?: boolean;
  /** Reject Import Order bodies that carry fields outside the documented schema (fulfillmentStatus). */
  rejectFullOrders?: boolean;
  /** Store a different order number than the one sent. */
  alterOrderNumber?: boolean;
  /**
   * What real Wix does for a moment after a label is created: assigning it answers 400
   * EMPTY_ASSIGN_AND_UNASSIGN_LISTS, as if the key were unknown. The number is how many assign calls fail.
   */
  labelLagCalls?: number;
  /** Answer an Import Order body with this HTTP status instead of importing it (staging answered 500 for item-specific coupons). */
  failImport?: (order: Record<string, unknown>) => number | undefined;
  /** Automations on the fake site, for the pause and restore tests. */
  automations?: Array<{ id: string; name: string; triggerKey: string; status: 'ACTIVE' | 'INACTIVE'; origin?: string; locked?: boolean }>;
  /** A change to a preinstalled automation comes back under a new id, as the docs warn. */
  overrideIdOnPatch?: boolean;
  /** Accept the change but do not apply it, so the read-back disagrees. */
  ignorePatch?: boolean;
  /** Fail the change to the automation with this id (HTTP 500). */
  failPatchFor?: string;
  /** Staff members for the booking tests (their resource ids are what slots and services refer to). */
  staff?: Array<{ name: string; resourceId: string; email?: string }>;
  /** Fail the email change of the staff member with this name (HTTP 500). */
  failStaffPatchFor?: string;
  /** Accept the staff change but keep the old email, so the read-back disagrees. */
  ignoreStaffPatch?: boolean;
  /** Answer a Create Booking body with this HTTP status instead of creating it. */
  failBooking?: (body: Record<string, unknown>) => number | undefined;
  /** Store the booking with a different status than the one sent, as a site that does not honour CONFIRMED might. */
  alterBookingStatus?: string;
}

export function createFakeTarget(options: FakeTargetOptions = {}) {
  const contacts = new Map<string, Json>();
  for (const existing of options.existingContacts ?? []) {
    contacts.set(existing.id, { id: existing.id, email: { email: existing.email }, phone: existing.phone ? { phone: existing.phone } : undefined });
  }
  const orders = new Map<string, Json>();
  const labels = new Map<string, string>();
  const labelAssignments: Array<{ key: string; ids: string[] }> = [];
  let labelLag = 0;
  const automations = new Map<string, Record<string, any>>();
  const bookings = new Map<string, Record<string, any>>();
  const staffMembers = new Map<string, Record<string, any>>();
  (options.staff ?? []).forEach((member, index) => staffMembers.set(`staff-${index}`, { id: `staff-${index}`, name: member.name, resourceId: member.resourceId, email: member.email, revision: '1' }));
  const services: Array<Record<string, any>> = [];
  for (const entry of options.automations ?? []) {
    automations.set(entry.id, {
      id: entry.id,
      revision: '1',
      name: entry.name,
      origin: entry.origin ?? 'PREINSTALLED',
      ...(entry.locked ? { settings: { disableStatusChange: true } } : {}),
      configuration: { status: entry.status, trigger: { appId: 'app', triggerKey: entry.triggerKey }, actions: { a1: { id: 'a1' } } },
    });
  }
  const calls: string[] = [];
  let counter = 0;

  const route = async (method: HttpMethod, url: string, body: Json | undefined): Promise<unknown> => {
    const path = url.slice(API.length);
    calls.push(`${method} ${path}`);

    if (method === 'POST' && path === '/contacts/v5/bulk/contacts/create') {
      const items = (body?.contacts ?? []) as Json[];
      return {
        results: items.map((item, index) => {
          const email = (item.email as Json | undefined)?.email as string | undefined;
          const phone = (item.phone as Json | undefined)?.phone as string | undefined;
          const clash = [...contacts.values()].some(
            (stored) => (email && (stored.email as Json | undefined)?.email === email) || (phone && (stored.phone as Json | undefined)?.phone === phone),
          );
          if (clash) return { itemMetadata: { originalIndex: index, success: false, error: { code: 'DUPLICATE_CONTACT_EXISTS', description: 'duplicate' } } };
          if (options.rejectBirthdate && item.birthdate) {
            return { itemMetadata: { originalIndex: index, success: false, error: { code: 'INVALID_ARGUMENT', description: 'birthdate rejected' } } };
          }
          counter += 1;
          const id = `t-contact-${counter}`;
          contacts.set(id, { id, ...item });
          return { itemMetadata: { originalIndex: index, success: true, id } };
        }),
        bulkActionMetadata: {},
      };
    }
    if (method === 'POST' && path === '/automations-service/v2/automations/query') {
      const paging = ((body?.query as Json | undefined)?.cursorPaging ?? {}) as Json;
      const all = [...automations.values()];
      const start = paging.cursor ? Number(paging.cursor) : 0;
      const size = (paging.limit as number | undefined) ?? 50;
      const end = start + size;
      return { automations: all.slice(start, end).map((entry) => structuredClone(entry)), pagingMetadata: { count: Math.min(size, all.length - start), cursors: end < all.length ? { next: String(end) } : {}, hasNext: end < all.length } };
    }
    if (path.startsWith('/automations-service/v2/automations/')) {
      const id = path.slice('/automations-service/v2/automations/'.length).split('?')[0]!;
      if (method === 'GET') {
        const found = automations.get(id);
        if (!found) throw new WixHttpError(404, url, JSON.stringify({ message: 'not found' }));
        return { automation: structuredClone(found) };
      }
      if (method === 'PATCH') {
        const sent = (body?.automation ?? {}) as Record<string, any>;
        const found = automations.get(id);
        if (!found) throw new WixHttpError(404, url, JSON.stringify({ message: 'not found' }));
        if (options.failPatchFor === id) throw new WixHttpError(500, url, JSON.stringify({ message: 'Internal Server Error' }));
        if (sent.revision !== found.revision) throw new WixHttpError(409, url, JSON.stringify({ message: 'stale revision' }));
        if (!options.ignorePatch) found.configuration.status = sent.configuration?.status;
        found.revision = String(Number(found.revision) + 1);
        if (options.overrideIdOnPatch) {
          automations.delete(id);
          found.id = `${id}-override`;
          automations.set(found.id, found);
        }
        return { automation: structuredClone(found) };
      }
    }
    if (method === 'POST' && path === '/bookings/v1/staff-members/query') return { staffMembers: [...staffMembers.values()].map((member) => structuredClone(member)) };
    if (path.startsWith('/bookings/v1/staff-members/')) {
      const id = path.slice('/bookings/v1/staff-members/'.length);
      const found = staffMembers.get(id);
      if (!found) throw new WixHttpError(404, url, JSON.stringify({ message: 'not found' }));
      if (method === 'GET') return { staffMember: structuredClone(found) };
      if (method === 'PATCH') {
        const sent = (body?.staffMember ?? {}) as Record<string, any>;
        if (options.failStaffPatchFor === found.name) throw new WixHttpError(500, url, JSON.stringify({ message: 'Internal Server Error' }));
        if (sent.revision !== found.revision) throw new WixHttpError(409, url, JSON.stringify({ message: 'stale revision' }));
        if (!options.ignoreStaffPatch && 'email' in sent) found.email = sent.email;
        found.revision = String(Number(found.revision) + 1);
        return { staffMember: structuredClone(found) };
      }
    }
    if (method === 'POST' && path === '/bookings/v2/bulk/services/create') {
      const sent = (body?.services ?? []) as Json[];
      return {
        results: sent.map((service, index) => {
          const created = { ...service, id: `new-service-${services.length + 1}`, schedule: { ...((service.schedule ?? {}) as Json), id: `new-schedule-${services.length + 1}` } };
          if (service.name === 'FAIL') return { itemMetadata: { originalIndex: index, success: false, error: { code: 'INVALID_ARGUMENT', description: 'nope' } } };
          services.push(created);
          return { itemMetadata: { id: created.id, originalIndex: index, success: true }, item: created };
        }),
      };
    }
    if (method === 'POST' && path === '/bookings/v2/bookings') {
      const sent = (body?.booking ?? {}) as Record<string, any>;
      const failure = options.failBooking?.(body ?? {});
      if (failure) throw new WixHttpError(failure, url, JSON.stringify({ message: 'Internal Server Error' }));
      counter += 1;
      const id = `t-booking-${counter}`;
      const slot = (sent.bookedEntity?.slot ?? {}) as Record<string, any>;
      const stored = { ...sent, id, revision: '1', status: options.alterBookingStatus ?? sent.status, startDate: slot.startDate, endDate: slot.endDate, flow: body?.flowControlSettings, notify: body?.participantNotification };
      bookings.set(id, stored);
      return { booking: structuredClone(stored) };
    }
    if (method === 'POST' && path.startsWith('/bookings/v2/bookings/') && path.endsWith('/cancel')) {
      const id = path.split('/')[4]!;
      const found = bookings.get(id);
      if (!found) throw new WixHttpError(404, url, JSON.stringify({ message: 'not found' }));
      found.status = 'CANCELED';
      found.revision = String(Number(found.revision) + 1);
      found.cancel = body;
      return { booking: structuredClone(found) };
    }
    if (method === 'POST' && path === '/bookings/bookings-reader/v2/extended-bookings/query') {
      const paging = ((body?.query as Json | undefined)?.cursorPaging ?? {}) as Json;
      const all = [...bookings.values()];
      const start = paging.cursor ? Number(paging.cursor) : 0;
      const size = (paging.limit as number | undefined) ?? 50;
      const end = start + size;
      return { extendedBookings: all.slice(start, end).map((entry) => ({ booking: structuredClone(entry) })), metadata: { cursors: end < all.length ? { next: String(end) } : {} } };
    }
    if (method === 'POST' && path === '/contacts/v5/contacts/count') return { count: contacts.size };
    if (method === 'POST' && path === '/ecom/v1/orders/search') {
      const cursor = (((body?.search as Json).cursorPaging as Json).cursor as string | undefined) ?? undefined;
      const start = cursor ? Number(cursor) : 0;
      const all = [...orders.values()].map((stored) => ({ ...stored, imported: true }));
      return { orders: all.slice(start, start + 100), metadata: { hasNext: start + 100 < all.length, cursors: start + 100 < all.length ? { next: String(start + 100) } : {} } };
    }
    if (method === 'POST' && path === '/ecom/v1/orders/import/bulk-delete-imported-orders') {
      for (const id of (body?.orderIds ?? []) as string[]) orders.delete(id);
      return { jobId: 'order-delete-job' };
    }
    if (method === 'POST' && path === '/contacts/v4/bulk/contacts/delete') {
      const ids = (((body?.filter as Json).id as Json).$in ?? []) as string[];
      for (const id of ids) contacts.delete(id);
      return { jobId: 'contact-delete-job' };
    }
    if (method === 'POST' && path === '/contacts/v5/contacts/query') {
      const filter = ((body?.query as Json | undefined)?.filter ?? {}) as Json;
      if (filter.id) {
        const wanted = (filter.id as Json).$in as string[];
        return { contacts: wanted.filter((id) => contacts.has(id)).map((id) => ({ ...contacts.get(id), id })) };
      }
      const found = [...contacts.values()].filter((stored) => {
        if (filter.externalId) return stored.externalId === filter.externalId;
        if (filter['email.email']) return (stored.email as Json | undefined)?.email === filter['email.email'];
        if (filter['phone.phone']) return (stored.phone as Json | undefined)?.phone === filter['phone.phone'];
        return false;
      });
      return { contacts: found.slice(0, 1).map((stored) => ({ id: stored.id })) };
    }
    if (method === 'POST' && path === '/contacts/v4/labels') {
      const name = body?.displayName as string;
      if (!labels.has(name)) {
        labels.set(name, `custom.${name.toLowerCase().replace(/\W+/g, '-')}-x${labels.size}`);
        labelLag = options.labelLagCalls ?? 0;
      }
      return { label: { key: labels.get(name) }, newLabel: true };
    }
    if (method === 'POST' && path === '/contacts/v4/bulk/contacts/add-remove-labels') {
      const ids = (((body?.filter as Json).id as Json).$in ?? []) as string[];
      if (labelLag > 0) {
        labelLag -= 1;
        throw new WixHttpError(400, url, JSON.stringify({ message: 'Requires at least 1 tag to assign or unassign to contact.', details: { applicationError: { code: 'EMPTY_ASSIGN_AND_UNASSIGN_LISTS' } } }));
      }
      labelAssignments.push({ key: (body?.labelKeysToAdd as string[])[0]!, ids });
      return { jobId: `job-${labelAssignments.length}` };
    }
    if (method === 'GET' && path.startsWith('/contacts/v4/bulk/jobs/')) return { job: { status: 'COMPLETED', successTotal: 1, failedTotal: 0 } };
    if (method === 'POST' && path === '/ecom/v1/orders/import') {
      const order = (body?.order ?? {}) as Json;
      const failure = options.failImport?.(order);
      if (failure) throw new WixHttpError(failure, url, JSON.stringify({ message: 'Internal Server Error', details: {} }));
      if (options.rejectFullOrders && 'fulfillmentStatus' in order) throw new WixHttpError(400, url, JSON.stringify({ message: 'unknown field fulfillmentStatus' }));
      counter += 1;
      const id = `t-order-${counter}`;
      const stored = { ...order, id, number: options.alterOrderNumber ? '99999' : order.number };
      orders.set(id, stored);
      return { order: { id, number: stored.number, purchasedDate: order.purchasedDate, status: order.status, paymentStatus: order.paymentStatus } };
    }
    throw new Error(`Fake target has no route for ${method} ${path}`);
  };

  const http: WixHttp = {
    siteId: CANONICAL_STAGING_WIX_SITE_ID,
    request: (async (method: HttpMethod, url: string, body?: unknown) => route(method, url, body as Json | undefined)) as WixHttp['request'],
  };
  return { http, contacts, orders, labels, labelAssignments, calls, automations, bookings, services, staffMembers };
}

export interface FakeSourceData {
  labels: Array<{ key: string; displayName: string; labelType?: string; tagId?: string }>;
  /** label key → contact ids holding it */
  membership: Record<string, string[]>;
  contacts: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  planOrders: Array<Record<string, unknown>>;
  /** What Count Contacts returns; defaults to the real number of contacts. */
  reportedCount?: number;
  /** Related records, all optional: bookings, forms with their submissions (by form id), members, coupons and transactions (by order id). */
  bookings?: Array<Record<string, unknown>>;
  bookingsReportedCount?: number;
  forms?: Array<{ id: string; name: string }>;
  submissions?: Record<string, Array<Record<string, unknown>>>;
  members?: Array<Record<string, unknown>>;
  coupons?: Array<Record<string, unknown>>;
  transactions?: Record<string, { payments?: unknown[]; refunds?: unknown[] }>;
  /** Wix is inconsistent about which field carries the next-page cursor; the fake can use either. */
  cursorField?: 'metadata' | 'pagingMetadata';
}

export function createFakeSource(data: FakeSourceData) {
  const calls: string[] = [];
  const page = <T>(rows: T[], cursor: string | undefined, size: number) => {
    const start = cursor ? Number(cursor) : 0;
    const end = start + size;
    return { slice: rows.slice(start, end), paging: { count: Math.min(size, rows.length - start), hasNext: end < rows.length, cursors: end < rows.length ? { next: String(end) } : {} } };
  };

  const route = async (method: HttpMethod, url: string, body: Json | undefined): Promise<unknown> => {
    const path = url.slice(API.length).split('?')[0]!;
    calls.push(`${method} ${path}`);
    if (path === '/contacts/v4/labels/query') return { labels: data.labels, pagingMetadata: { count: data.labels.length, offset: 0, total: data.labels.length } };
    if (path === '/contacts/v4/contacts/query') {
      const query = body?.query as Json;
      const key = (((query.filter as Json)['info.labelKeys'] as Json).$hasSome as string[])[0]!;
      const offset = ((query.paging as Json).offset as number) ?? 0;
      const ids = data.membership[key] ?? [];
      return { contacts: ids.slice(offset, offset + 1000).map((id) => ({ id, revision: '1' })), pagingMetadata: { total: ids.length } };
    }
    if (path === '/contacts/v5/contacts/query') {
      const cursor = (((body?.query as Json).cursorPaging as Json).cursor as string | undefined) ?? undefined;
      const { slice, paging } = page(data.contacts, cursor, 100);
      return { contacts: slice, pagingMetadata: paging };
    }
    if (path === '/contacts/v5/contacts/count') return { count: data.reportedCount ?? data.contacts.length };
    if (path === '/ecom/v1/orders/search') {
      const cursor = (((body?.search as Json).cursorPaging as Json).cursor as string | undefined) ?? undefined;
      const { slice, paging } = page(data.orders, cursor, 100);
      return { orders: slice, metadata: paging };
    }
    if (path === '/pricing-plans/v2/orders') {
      const offset = Number(new URL(url).searchParams.get('offset') ?? 0);
      const rows = data.planOrders.slice(offset, offset + 50);
      return { orders: rows, pagingMetadata: { count: rows.length, offset, total: data.planOrders.length, hasNext: offset + 50 < data.planOrders.length } };
    }
    const cursorField = data.cursorField ?? 'metadata';
    // Real Wix returns only the next cursor on these endpoints, no `hasNext`, so the fake does the same.
    const cursorOnly = (paging: { cursors: { next?: string } }) => ({ [cursorField]: { cursors: paging.cursors } });
    if (path === '/bookings/bookings-reader/v2/extended-bookings/query') {
      const paging = ((body?.query as Json).cursorPaging ?? {}) as Json;
      const { slice, paging: meta } = page(data.bookings ?? [], paging.cursor as string | undefined, (paging.limit as number | undefined) ?? 50);
      return { extendedBookings: slice, ...cursorOnly(meta) };
    }
    if (path === '/bookings/bookings-reader/v2/extended-bookings/count') return { count: data.bookingsReportedCount ?? (data.bookings ?? []).length };
    if (path === '/form-schema-service/v4/forms/query') {
      const filter = ((body?.query as Json | undefined)?.filter ?? {}) as Json;
      if (!filter.namespace) throw new WixHttpError(400, url, JSON.stringify({ message: 'namespace filter is required' }));
      return { forms: (data.forms ?? []).map((form) => ({ id: form.id, name: form.name, namespace: filter.namespace })) };
    }
    if (path === '/form-submission-service/v4/submissions/query') {
      const paging = ((body?.query as Json).cursorPaging ?? {}) as Json;
      const raw = paging.cursor as string | undefined;
      let formId: string;
      let offset = 0;
      if (raw) {
        const [id, at] = raw.split('|');
        formId = id!;
        offset = Number(at);
      } else {
        const filter = ((body?.query as Json).filter ?? {}) as Json;
        if (!filter.namespace || !filter.formId) throw new WixHttpError(400, url, JSON.stringify({ message: 'namespace and formId filters are required' }));
        formId = filter.formId as string;
      }
      const rows = data.submissions?.[formId] ?? [];
      const size = (paging.limit as number | undefined) ?? 100;
      const end = offset + size;
      return { submissions: rows.slice(offset, end), [cursorField]: { cursors: end < rows.length ? { next: `${formId}|${end}` } : {} } };
    }
    if (path === '/members/v1/members/query') {
      if (!((body?.fieldsets as string[] | undefined) ?? []).includes('FULL')) throw new WixHttpError(400, url, JSON.stringify({ message: 'login email and status are only returned with the FULL fieldset' }));
      const paging = ((body?.query as Json | undefined)?.paging ?? {}) as Json;
      const offset = (paging.offset as number | undefined) ?? 0;
      const limit = (paging.limit as number | undefined) ?? 50;
      const rows = data.members ?? [];
      return { members: rows.slice(offset, offset + limit), metadata: { count: Math.min(limit, Math.max(0, rows.length - offset)), offset, total: rows.length } };
    }
    if (path === '/stores/v2/coupons/query') {
      const paging = ((body?.query as Json | undefined)?.paging ?? {}) as Json;
      const offset = (paging.offset as number | undefined) ?? 0;
      const limit = (paging.limit as number | undefined) ?? 100;
      const rows = data.coupons ?? [];
      return { coupons: rows.slice(offset, offset + limit), totalResults: rows.length };
    }
    if (path === '/ecom/v1/payments/list-by-ids') {
      const ids = (body?.orderIds as string[] | undefined) ?? [];
      if (ids.length < 1 || ids.length > 100) throw new WixHttpError(400, url, JSON.stringify({ message: 'orderIds must hold 1 to 100 ids' }));
      return { orderTransactions: ids.map((orderId) => ({ orderId, payments: data.transactions?.[orderId]?.payments ?? [], refunds: data.transactions?.[orderId]?.refunds ?? [] })) };
    }
    throw new Error(`Fake source has no route for ${method} ${path}`);
  };

  const http: WixHttp = {
    siteId: 'fake-production-site',
    request: (async (method: HttpMethod, url: string, body?: unknown) => route(method, url, body as Json | undefined)) as WixHttp['request'],
  };
  return { http, calls };
}
