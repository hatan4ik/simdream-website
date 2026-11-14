import { toContactCreateItem, isCreatable } from './contact-mapper';
import { assertAutomationsQuiet } from './automations';
import { readOrdersToMigrate } from './exclusions';
import { FILES, pathIn, readJson, readNdjson, writeJson } from './io';
import { toOrderImportBody, type OrderVariant } from './order-mapper';
import type { MergedPerson, SourceOrder } from './types';
import { WixHttpError, type WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const BATCH = 100;

export interface LoadState {
  /** personId (the survivor's source contact id) → contact id on the target. */
  contacts: Record<string, string>;
  /** People who already existed on the target; matched, never overwritten. */
  adopted: string[];
  /** People created with identity fields only because Wix rejected an optional field. */
  minimal: string[];
  contactFailures: Record<string, string>;
  /** Label display name → label key on the target. */
  labels: Record<string, string>;
  labelsDone: string[];
  /** Source order id → imported order id on the target. */
  orders: Record<string, string>;
  /** Source order ids imported with the `core` variant because nothing richer was accepted. */
  coreOrders: string[];
  /** Source order id → the simpler variant (`no-coupon-ids`, `global-discount`, `no-discounts`) Wix accepted when it refused `full`. */
  adjustedOrders: Record<string, string>;
  orderFailures: Record<string, string>;
}

export const emptyState = (): LoadState => ({
  contacts: {},
  adopted: [],
  minimal: [],
  contactFailures: {},
  labels: {},
  labelsDone: [],
  orders: {},
  coreOrders: [],
  adjustedOrders: {},
  orderFailures: {},
});

export type LoadStage = 'contacts' | 'labels' | 'orders';

export interface LoadOptions {
  /** Without this the stage only reports what it would do and never calls Wix. */
  apply: boolean;
  /** Run one stage; default is all three in order. */
  only?: LoadStage;
  /** Process at most this many people / orders in this run (for a first small probe). */
  limit?: number;
  orderVariant?: OrderVariant;
  /** Continue after the first imported order even if Wix did not keep its number, date or status. */
  acceptMismatch?: boolean;
  /** Pause between retries; injectable so tests do not wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Import only the orders purchased in this month (YYYY-MM, UTC), so a long history goes in one month at a time. */
  month?: string;
  /** Before the orders stage writes anything, require every automation that could email a customer to be off. */
  guardAutomations?: boolean;
}

export interface LoadSummary {
  mode: 'dry-run' | 'apply';
  contacts: { planned: number; created: number; adopted: number; withoutIdentity: number; failed: number };
  labels: { planned: number; created: number; assigned: number };
  orders: { planned: number; imported: number; core: number; adjusted: number; failed: number; withoutContact: number; maxNumber: number | null };
  warnings: string[];
  stopped?: string;
}

const text = (error: unknown): string => (error instanceof WixHttpError ? `${error.status} ${error.body.slice(0, 240)}` : String(error instanceof Error ? error.message : error).slice(0, 240));

interface BulkResult {
  itemMetadata?: { id?: string; success?: boolean; originalIndex?: number; error?: { code?: string; description?: string } };
}

async function bulkCreate(http: WixHttp, items: ReadonlyArray<Record<string, unknown>>): Promise<BulkResult[]> {
  const response = await http.request<{ results?: BulkResult[] }>('POST', `${API}/contacts/v5/bulk/contacts/create`, {
    contacts: items,
    allowDuplicates: false,
    returnEntity: false,
  });
  return response.results ?? [];
}

/** Finds the contact already on the target that Wix matched, by the identifiers Wix matches on. */
async function findExisting(http: WixHttp, person: MergedPerson): Promise<string | null> {
  const filters: Array<Record<string, string>> = [{ externalId: person.personId }];
  if (person.email) filters.push({ 'email.email': person.email });
  if (person.phone) filters.push({ 'phone.phone': person.phone });
  for (const filter of filters) {
    const response = await http.request<{ contacts?: Array<{ id: string }> }>('POST', `${API}/contacts/v5/contacts/query`, {
      query: { filter, cursorPaging: { limit: 1 } },
    });
    const id = response.contacts?.[0]?.id;
    if (id) return id;
  }
  return null;
}

async function loadContacts(http: WixHttp, people: readonly MergedPerson[], state: LoadState, options: LoadOptions, save: () => void, log: (message: string) => void): Promise<void> {
  const todo = people.filter((person) => !state.contacts[person.personId]).slice(0, options.limit ?? Number.POSITIVE_INFINITY);
  for (let start = 0; start < todo.length; start += BATCH) {
    const batch = todo.slice(start, start + BATCH).filter((person) => isCreatable(toContactCreateItem(person)));
    if (batch.length === 0) continue;
    const results = await bulkCreate(http, batch.map((person) => toContactCreateItem(person)));
    for (const [index, person] of batch.entries()) {
      const result = results.find((entry) => entry.itemMetadata?.originalIndex === index) ?? results[index];
      const meta = result?.itemMetadata;
      if (meta?.success && meta.id) {
        state.contacts[person.personId] = meta.id;
        delete state.contactFailures[person.personId];
        continue;
      }
      if (meta?.error?.code === 'DUPLICATE_CONTACT_EXISTS') {
        const existing = await findExisting(http, person);
        if (existing) {
          state.contacts[person.personId] = existing;
          state.adopted.push(person.personId);
        } else {
          state.contactFailures[person.personId] = 'Wix reports a duplicate, but no matching contact was found on the target.';
        }
        continue;
      }
      // Something in an optional field was rejected: retry with identity fields only rather than lose the person.
      try {
        const [retry] = await bulkCreate(http, [toContactCreateItem(person, 'minimal')]);
        if (retry?.itemMetadata?.success && retry.itemMetadata.id) {
          state.contacts[person.personId] = retry.itemMetadata.id;
          state.minimal.push(person.personId);
          delete state.contactFailures[person.personId];
        } else {
          state.contactFailures[person.personId] = `${meta?.error?.code ?? 'unknown'}: ${meta?.error?.description ?? ''} | retry: ${retry?.itemMetadata?.error?.code ?? 'unknown'}`.slice(0, 300);
        }
      } catch (error) {
        state.contactFailures[person.personId] = text(error);
      }
    }
    save();
    log(`  contacts: ${Object.keys(state.contacts).length}/${people.length}`);
  }
}

export async function waitForJob(http: WixHttp, jobId: string): Promise<{ failed: number }> {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const response = await http.request<{ job?: { status?: string; failedTotal?: number } }>('GET', `${API}/contacts/v4/bulk/jobs/${jobId}`);
    if (response.job?.status === 'COMPLETED') return { failed: response.job.failedTotal ?? 0 };
    if (response.job?.status === 'FAILED') throw new Error(`Bulk job ${jobId} failed`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Bulk job ${jobId} did not finish in time`);
}

/**
 * Seen on the real staging site: right after a label is created, Wix answers the first assign calls with
 * 400 EMPTY_ASSIGN_AND_UNASSIGN_LISTS, as if the new key were unknown, and accepts it moments later. That error
 * is retried with growing pauses; any other error, and a label Wix never accepts, stops the stage.
 */
const LABEL_NOT_READY_PAUSES_MS = [1000, 2000, 4000, 8000, 16000];

const isLabelNotReady = (error: unknown): error is WixHttpError => error instanceof WixHttpError && error.status === 400 && error.body.includes('EMPTY_ASSIGN_AND_UNASSIGN_LISTS');

async function startLabelJob(http: WixHttp, name: string, key: string, ids: string[], sleep: (ms: number) => Promise<void>): Promise<{ jobId?: string }> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await http.request<{ jobId?: string }>('POST', `${API}/contacts/v4/bulk/contacts/add-remove-labels`, { filter: { id: { $in: ids } }, labelKeysToAdd: [key] });
    } catch (error) {
      if (!isLabelNotReady(error)) throw error;
      const pause = LABEL_NOT_READY_PAUSES_MS[attempt];
      if (pause === undefined) throw new Error(`Wix still does not accept the new label "${name}" after ${attempt} retries: ${error.message}`);
      await sleep(pause);
    }
  }
}

async function loadLabels(
  http: WixHttp,
  people: readonly MergedPerson[],
  state: LoadState,
  save: () => void,
  log: (message: string) => void,
  summary: LoadSummary,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const holders = new Map<string, string[]>();
  for (const person of people) {
    const target = state.contacts[person.personId];
    if (!target) continue;
    for (const label of person.labels) holders.set(label, [...(holders.get(label) ?? []), target]);
  }
  for (const [name, ids] of [...holders].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (state.labelsDone.includes(name)) continue;
    if (!state.labels[name]) {
      const created = await http.request<{ label?: { key?: string } }>('POST', `${API}/contacts/v4/labels`, { displayName: name });
      if (!created.label?.key) throw new Error(`Wix returned no key for label "${name}"`);
      state.labels[name] = created.label.key;
      summary.labels.created += 1;
      save();
    }
    for (let start = 0; start < ids.length; start += BATCH) {
      const job = await startLabelJob(http, name, state.labels[name]!, ids.slice(start, start + BATCH), sleep);
      if (!job.jobId) throw new Error(`Wix returned no job id while labelling "${name}"`);
      const { failed } = await waitForJob(http, job.jobId);
      if (failed > 0) summary.warnings.push(`label "${name}": ${failed} contact(s) could not be labelled`);
    }
    state.labelsDone.push(name);
    summary.labels.assigned += ids.length;
    save();
    log(`  label "${name}": ${ids.length} contact(s)`);
  }
}

const orderNumber = (order: SourceOrder): number => Number(order.number ?? 0) || 0;

function byPurchase(a: SourceOrder, b: SourceOrder): number {
  const dateA = a.purchasedDate ?? a.createdDate ?? '';
  const dateB = b.purchasedDate ?? b.createdDate ?? '';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return orderNumber(a) - orderNumber(b);
}

interface ImportedOrder {
  id?: string;
  number?: string | number;
  purchasedDate?: string;
  status?: string;
  paymentStatus?: string;
}

/** What Wix did not keep of the history we sent. Empty means the import honoured it. */
function dishonoured(sent: SourceOrder, got: ImportedOrder): string[] {
  const problems: string[] = [];
  if (sent.number !== undefined && String(got.number) !== String(sent.number)) problems.push(`number (sent ${sent.number}, stored ${got.number})`);
  const sentDate = sent.purchasedDate ?? sent.createdDate;
  if (sentDate && got.purchasedDate && Date.parse(got.purchasedDate) !== Date.parse(sentDate)) problems.push(`purchasedDate (sent ${sentDate}, stored ${got.purchasedDate})`);
  if (sent.status !== undefined && got.status !== sent.status) problems.push(`status (sent ${String(sent.status)}, stored ${got.status})`);
  if (sent.paymentStatus !== undefined && got.paymentStatus !== sent.paymentStatus) problems.push(`paymentStatus (sent ${String(sent.paymentStatus)}, stored ${got.paymentStatus})`);
  return problems;
}

/** From the richest version to the plainest; each step gives up as little of the order as Wix will accept. */
const ORDER_LADDER: readonly OrderVariant[] = ['full', 'no-coupon-ids', 'global-discount', 'no-discounts', 'core'];

/** A refusal worth trying a simpler version for: a 4xx (a field was refused) or a persistent 5xx. Not throttling. */
const refused = (error: unknown): boolean => error instanceof WixHttpError && error.status !== 429 && error.status >= 400;

async function importOrder(http: WixHttp, order: SourceOrder, targetContactId: string | undefined, preferred: OrderVariant): Promise<{ imported: ImportedOrder; variant: OrderVariant }> {
  const rungs = preferred === 'full' ? ORDER_LADDER : [preferred];
  const tried = new Set<string>();
  let lastError: unknown;
  for (const variant of rungs) {
    const body = toOrderImportBody(order, targetContactId, variant);
    const key = JSON.stringify(body);
    if (tried.has(key)) continue; // an order without coupons has the same body for every coupon variant
    tried.add(key);
    try {
      const response = await http.request<{ order?: ImportedOrder }>('POST', `${API}/ecom/v1/orders/import`, body);
      if (!response.order?.id) throw new Error('Wix returned no order id');
      return { imported: response.order, variant };
    } catch (error) {
      lastError = error;
      if (!refused(error)) throw error;
    }
  }
  throw lastError;
}

async function loadOrders(
  http: WixHttp,
  orders: readonly SourceOrder[],
  contactToPerson: Readonly<Record<string, string>>,
  state: LoadState,
  options: LoadOptions,
  save: () => void,
  log: (message: string) => void,
  summary: LoadSummary,
): Promise<void> {
  const todo = [...orders].sort(byPurchase).filter((order) => !state.orders[order.id]).slice(0, options.limit ?? Number.POSITIVE_INFINITY);
  let first = true;
  for (const [index, order] of todo.entries()) {
    const person = order.buyerInfo?.contactId ? contactToPerson[order.buyerInfo.contactId] : undefined;
    const target = person ? state.contacts[person] : undefined;
    try {
      const { imported, variant } = await importOrder(http, order, target, options.orderVariant ?? 'full');
      state.orders[order.id] = imported.id!;
      delete state.orderFailures[order.id];
      if (variant === 'core') state.coreOrders.push(order.id);
      else if (variant !== 'full') state.adjustedOrders[order.id] = variant;
      if (first) {
        first = false;
        const problems = dishonoured(order, imported);
        if (problems.length > 0) {
          summary.warnings.push(`Wix did not keep: ${problems.join('; ')}`);
          if (!options.acceptMismatch) {
            summary.stopped = `Stopped after the first order: Wix did not keep ${problems.join('; ')}. Review it, then re-run with --accept-mismatch to continue, or run rollback.`;
            save();
            return;
          }
        }
      }
    } catch (error) {
      state.orderFailures[order.id] = text(error);
    }
    save();
    if ((index + 1) % 50 === 0) log(`  orders: ${index + 1}/${todo.length}`);
  }
}

/**
 * Writes the deduplicated people and the purchase history to the staging site.
 *
 * Idempotent and resumable: everything created is recorded in load-state.json as it
 * happens, so a re-run skips what exists. Without `apply` it is a dry run that never calls
 * Wix. Staging only: the target client is pinned to the staging site id.
 */
/** The month an order was purchased, as YYYY-MM in UTC; empty when it has no date (and so belongs to no month). */
const purchaseMonth = (order: SourceOrder): string => String(order.purchasedDate ?? order.createdDate ?? '').slice(0, 7);

export async function runLoad(http: WixHttp, dir: string, options: LoadOptions, log: (message: string) => void = () => undefined): Promise<LoadSummary> {
  if (options.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month)) throw new Error('--month must be YYYY-MM, for example 2024-08.');
  const people = readNdjson<MergedPerson>(pathIn(dir, FILES.people));
  const orders = readOrdersToMigrate(dir);
  const inMonth = (order: SourceOrder): boolean => options.month === undefined || purchaseMonth(order) === options.month;
  const contactToPerson = readJson<Record<string, string>>(pathIn(dir, FILES.contactMap));
  const statePath = pathIn(dir, FILES.loadState);
  // A state file written before a field existed lacks it; start from the empty state so every field is present.
  const state: LoadState = { ...emptyState(), ...readJson<Partial<LoadState>>(statePath, {}) };
  const save = () => writeJson(statePath, state);

  const creatable = people.filter((person) => isCreatable(toContactCreateItem(person)));
  const labelNames = new Set(people.flatMap((person) => person.labels));
  const todoOrders = orders.filter((order) => !state.orders[order.id] && inMonth(order));
  const numbers = orders.map(orderNumber).filter((value) => value > 0);

  const summary: LoadSummary = {
    mode: options.apply ? 'apply' : 'dry-run',
    contacts: { planned: creatable.filter((person) => !state.contacts[person.personId]).length, created: 0, adopted: 0, withoutIdentity: people.length - creatable.length, failed: 0 },
    labels: { planned: labelNames.size, created: 0, assigned: 0 },
    orders: { planned: todoOrders.length, imported: 0, core: 0, adjusted: 0, failed: 0, withoutContact: 0, maxNumber: numbers.length > 0 ? Math.max(...numbers) : null },
    warnings: [],
  };
  if (!options.apply) return summary;

  const stages = options.only ? [options.only] : (['contacts', 'labels', 'orders'] as const);
  const contactsBefore = Object.keys(state.contacts).length;
  if (stages.includes('contacts')) {
    log('Creating contacts on staging…');
    await loadContacts(http, creatable, state, options, save, log);
  }
  if (stages.includes('labels')) {
    log('Creating labels and labelling contacts…');
    await loadLabels(http, people, state, save, log, summary, options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms))));
  }
  if (stages.includes('orders')) {
    if (options.guardAutomations) {
      const quiet = await assertAutomationsQuiet(http, dir);
      log(`Automation guard passed (${quiet.acknowledgedLocked} locked system automation(s) acknowledged, none can fire from an order).`);
    }
    log(`Importing orders${options.month ? ` of ${options.month}` : ''}…`);
    await loadOrders(http, orders.filter(inMonth), contactToPerson, state, options, save, log, summary);
  }

  summary.contacts.created = Object.keys(state.contacts).length - contactsBefore;
  summary.contacts.adopted = state.adopted.length;
  summary.contacts.failed = Object.keys(state.contactFailures).length;
  summary.orders.imported = Object.keys(state.orders).length;
  summary.orders.core = state.coreOrders.length;
  summary.orders.adjusted = Object.keys(state.adjustedOrders).length;
  summary.orders.failed = Object.keys(state.orderFailures).length;
  summary.orders.withoutContact = orders.filter((order) => {
    const person = order.buyerInfo?.contactId ? contactToPerson[order.buyerInfo.contactId] : undefined;
    return !person || !state.contacts[person];
  }).length;
  if (state.minimal.length > 0) summary.warnings.push(`${state.minimal.length} contact(s) were created with identity fields only because Wix rejected an optional field.`);
  save();
  return summary;
}
