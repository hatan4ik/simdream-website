import { FILES, pathIn, readJson, writeJson } from './io';
import { emptyState, waitForJob, type LoadState } from './load';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const BATCH = 100;

export interface RollbackSummary {
  mode: 'dry-run' | 'apply';
  orders: { planned: number; removed: number };
  contacts: { planned: number; removed: number; keptBecauseTheyExistedBefore: number };
  warnings: string[];
}

async function remainingImported(http: WixHttp, wanted: ReadonlySet<string>): Promise<Set<string>> {
  const left = new Set<string>();
  for (let cursor: string | undefined, page = 0; page < 1000; page += 1) {
    const response = await http.request<{ orders?: Array<{ imported?: boolean; channelInfo?: { externalOrderId?: string } }>; metadata?: { hasNext?: boolean; cursors?: { next?: string } } }>(
      'POST',
      `${API}/ecom/v1/orders/search`,
      { search: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } },
    );
    for (const order of response.orders ?? []) {
      const sourceId = order.channelInfo?.externalOrderId;
      if (order.imported && sourceId && wanted.has(sourceId)) left.add(sourceId);
    }
    const next = response.metadata?.cursors?.next;
    if (!response.metadata?.hasNext || !next || next === cursor) break;
    cursor = next;
  }
  return left;
}

/**
 * Undoes what the load stage wrote, using only the ids it recorded: the imported orders
 * (Bulk Delete Imported Orders refuses anything not created by Import Order) and the
 * contacts it created. Contacts that already existed on the target (`adopted`) are never
 * touched. Labels are kept: they are harmless and may be in use. With `ordersOnly`, the contacts are left in place.
 * Dry run unless `apply`.
 */
export async function runRollback(http: WixHttp, dir: string, apply: boolean, log: (message: string) => void = () => undefined, options: { ordersOnly?: boolean } = {}): Promise<RollbackSummary> {
  const statePath = pathIn(dir, FILES.loadState);
  const state: LoadState = { ...emptyState(), ...readJson<LoadState>(statePath) };
  const adopted = new Set(state.adopted);
  const orderEntries = Object.entries(state.orders);
  const contactEntries = options.ordersOnly ? [] : Object.entries(state.contacts).filter(([personId]) => !adopted.has(personId));
  const summary: RollbackSummary = {
    mode: apply ? 'apply' : 'dry-run',
    orders: { planned: orderEntries.length, removed: 0 },
    contacts: { planned: contactEntries.length, removed: 0, keptBecauseTheyExistedBefore: adopted.size },
    warnings: [],
  };
  if (!apply) return summary;

  if (orderEntries.length > 0) {
    log('Deleting imported orders…');
    for (let start = 0; start < orderEntries.length; start += BATCH) {
      await http.request('POST', `${API}/ecom/v1/orders/import/bulk-delete-imported-orders`, { orderIds: orderEntries.slice(start, start + BATCH).map(([, targetId]) => targetId) });
    }
    // The delete runs as an asynchronous job: poll the site until none of our orders remain.
    const wanted = new Set(orderEntries.map(([sourceId]) => sourceId));
    let left = wanted;
    for (let attempt = 0; attempt < 30 && left.size > 0; attempt += 1) {
      left = await remainingImported(http, wanted);
      if (left.size > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    for (const [sourceId] of orderEntries) {
      if (left.has(sourceId)) continue;
      delete state.orders[sourceId];
      state.coreOrders = state.coreOrders.filter((id) => id !== sourceId);
      delete state.adjustedOrders[sourceId];
      summary.orders.removed += 1;
    }
    if (left.size > 0) summary.warnings.push(`${left.size} imported order(s) were still on staging when polling stopped; run rollback again.`);
    writeJson(statePath, state);
  }

  if (contactEntries.length > 0 && Object.keys(state.orders).length === 0) {
    log('Deleting copied contacts…');
    for (let start = 0; start < contactEntries.length; start += BATCH) {
      const slice = contactEntries.slice(start, start + BATCH);
      const job = await http.request<{ jobId?: string }>('POST', `${API}/contacts/v4/bulk/contacts/delete`, { filter: { id: { $in: slice.map(([, targetId]) => targetId) } } });
      if (!job.jobId) throw new Error('Wix returned no job id for the contact delete');
      const { failed } = await waitForJob(http, job.jobId);
      if (failed > 0) {
        // Wix does not say which ones: keep the whole batch recorded so a re-run retries it.
        summary.warnings.push(`${failed} contact(s) in one batch could not be deleted (site members and contacts with billing subscriptions are refused); the batch stays recorded.`);
        continue;
      }
      for (const [personId] of slice) delete state.contacts[personId];
      summary.contacts.removed += slice.length;
      writeJson(statePath, state);
    }
    state.labelsDone = [];
    writeJson(statePath, state);
  } else if (contactEntries.length > 0) {
    summary.warnings.push('Contacts were kept because some imported orders could not be removed first.');
  }
  return summary;
}
