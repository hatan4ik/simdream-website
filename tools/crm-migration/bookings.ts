import { assertAutomationsQuiet } from './automations';
import { FILES, pathIn, readJson, readNdjson, writeJson } from './io';
import type { ServiceMap } from './services';
import { WixHttpError, type WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const DEFAULT_FROM = '2024-08-01';

export interface SourceBooking {
  id: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  totalParticipants?: number;
  contactDetails?: { contactId?: string; firstName?: string; lastName?: string; email?: string };
  bookedEntity?: { title?: string; slot?: { serviceId?: string; timezone?: string; resource?: { id?: string; name?: string } } };
}

export interface PlannedBooking {
  booking: SourceBooking;
  month: string;
  serviceId: string;
  scheduleId: string;
  targetContactId: string;
}

export interface BookingPlan {
  entries: PlannedBooking[];
  /** Why each booking that is not imported was left out, with how many. */
  skipped: Record<string, number>;
  perMonth: Record<string, number>;
}

export interface BookingState {
  /** Source booking id → booking id on staging. */
  bookings: Record<string, string>;
  failures: Record<string, string>;
}

const emptyState = (): BookingState => ({ bookings: {}, failures: {} });
const stateFile = (dir: string) => pathIn(dir, FILES.bookingState);
const readState = (dir: string): BookingState => ({ ...emptyState(), ...readJson<Partial<BookingState>>(stateFile(dir), {}) });

/** The Wix-extended booking wraps the booking in `booking`; the exported file keeps that shape. */
const unwrap = (row: { booking?: SourceBooking } & SourceBooking): SourceBooking => row.booking ?? row;

/**
 * What goes into the staging calendar: bookings that were CONFIRMED (the only ones the Booking Calendar shows),
 * starting inside the window, whose customer was copied to staging, who is not a contact you excluded, and whose
 * service has a home on staging. Everything else is counted with its reason, never dropped silently.
 */
export function planBookings(input: {
  bookings: readonly SourceBooking[];
  contactToPerson: Readonly<Record<string, string>>;
  copiedContacts: Readonly<Record<string, string>>;
  excludedContactIds: readonly string[];
  serviceMap: ServiceMap;
  from: string;
  through: string;
}): BookingPlan {
  const excluded = new Set(input.excludedContactIds);
  const plan: BookingPlan = { entries: [], skipped: {}, perMonth: {} };
  const skip = (reason: string) => {
    plan.skipped[reason] = (plan.skipped[reason] ?? 0) + 1;
  };
  for (const booking of input.bookings) {
    const day = (booking.startDate ?? '').slice(0, 10);
    const contactId = booking.contactDetails?.contactId;
    const person = contactId ? input.contactToPerson[contactId] : undefined;
    const target = person ? input.copiedContacts[person] : undefined;
    const service = input.serviceMap[booking.bookedEntity?.slot?.serviceId ?? ''];
    if (!day || day < input.from || day > input.through) skip('outside the date window');
    else if (booking.status !== 'CONFIRMED') skip(`not confirmed (${booking.status ?? 'no status'})`);
    else if (!contactId) skip('no contact on the booking');
    else if (excluded.has(contactId)) skip('under a contact you excluded');
    else if (!target) skip('customer not copied to staging');
    else if (!service?.serviceId || !service.scheduleId) skip('service not on staging yet');
    else {
      const month = day.slice(0, 7);
      plan.entries.push({ booking, month, serviceId: service.serviceId, scheduleId: service.scheduleId, targetContactId: target });
      plan.perMonth[month] = (plan.perMonth[month] ?? 0) + 1;
    }
  }
  return plan;
}

const normal = (name: string | undefined): string => (name ?? '').trim().toLowerCase();

export interface BookingBody {
  booking: {
    bookedEntity: { slot: { serviceId: string; scheduleId: string; startDate: string; endDate: string; timezone: string; location: { locationType: 'OWNER_BUSINESS' }; resource?: { id: string; name: string } } };
    contactDetails: { contactId: string; firstName?: string; lastName?: string; email?: string };
    totalParticipants: number;
    status: 'CONFIRMED';
  };
  flowControlSettings: { skipAvailabilityValidation: true };
  participantNotification: { notifyParticipants: false };
}

/**
 * One production booking as a Create Booking request: confirmed straight away (a created booking is not in the
 * calendar), no message to the customer, availability not checked (the day is long past). Who flew is kept when
 * that staff member exists on staging; the simulator and location are not copied.
 */
export function toBookingBody(source: SourceBooking, service: { serviceId: string; scheduleId: string }, targetContactId: string, staff: ReadonlyMap<string, { id: string; name: string }>): BookingBody {
  const slot = source.bookedEntity?.slot;
  const resource = staff.get(normal(slot?.resource?.name));
  return {
    booking: {
      bookedEntity: {
        slot: {
          serviceId: service.serviceId,
          scheduleId: service.scheduleId,
          startDate: source.startDate ?? '',
          endDate: source.endDate ?? '',
          timezone: slot?.timezone ?? 'Asia/Jerusalem',
          location: { locationType: 'OWNER_BUSINESS' },
          ...(resource ? { resource } : {}),
        },
      },
      contactDetails: { contactId: targetContactId, firstName: source.contactDetails?.firstName, lastName: source.contactDetails?.lastName, email: source.contactDetails?.email },
      totalParticipants: Math.max(1, source.totalParticipants ?? 1),
      status: 'CONFIRMED',
    },
    flowControlSettings: { skipAvailabilityValidation: true },
    participantNotification: { notifyParticipants: false },
  };
}

async function loadStaff(http: WixHttp): Promise<Map<string, { id: string; name: string }>> {
  const response = await http.request<{ staffMembers?: Array<{ name?: string; resourceId?: string }> }>('POST', `${API}/bookings/v1/staff-members/query`, { query: { paging: { limit: 100 } } });
  const staff = new Map<string, { id: string; name: string }>();
  for (const member of response.staffMembers ?? []) if (member.name && member.resourceId) staff.set(normal(member.name), { id: member.resourceId, name: member.name });
  return staff;
}

const text = (error: unknown): string => (error instanceof WixHttpError ? `${error.status} ${error.body.slice(0, 240)}` : String(error instanceof Error ? error.message : error).slice(0, 240));

interface Inputs {
  plan: BookingPlan;
  state: BookingState;
}

function readInputs(dir: string, options: { from?: string; through?: string }): Inputs {
  const serviceFile = pathIn(dir, FILES.serviceMap);
  const serviceMap = readJson<ServiceMap | null>(serviceFile, null);
  if (!serviceMap) throw new Error('No service map yet: run `npm run crm:migrate -- bookings services` first.');
  const loadState = readJson<{ contacts?: Record<string, string> }>(pathIn(dir, FILES.loadState), {});
  const excluded = readJson<{ contactIds?: string[] }>(pathIn(dir, FILES.excluded), {});
  const through = options.through ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const plan = planBookings({
    bookings: readNdjson<{ booking?: SourceBooking } & SourceBooking>(pathIn(dir, FILES.bookings)).map(unwrap),
    contactToPerson: readJson<Record<string, string>>(pathIn(dir, FILES.contactMap), {}),
    copiedContacts: loadState.contacts ?? {},
    excludedContactIds: excluded.contactIds ?? [],
    serviceMap,
    from: options.from ?? DEFAULT_FROM,
    through,
  });
  return { plan, state: readState(dir) };
}

export interface BookingImportSummary {
  mode: 'dry-run' | 'apply';
  planned: number;
  imported: number;
  failed: number;
  skipped: Record<string, number>;
  perMonth: Record<string, number>;
  stopped?: string;
}

/**
 * Imports confirmed past bookings into the staging calendar, one month at a time if asked. Before the first write it
 * requires every automation that could email a customer to be off; it remembers each booking it made (so a re-run
 * repeats nothing and `rollback` knows what to cancel); and after the first booking it stops if Wix did not keep it
 * confirmed on the right day. Dry run unless `apply`.
 */
export async function runBookingsImport(
  http: WixHttp,
  dir: string,
  options: { apply: boolean; month?: string; limit?: number; from?: string; through?: string },
  log: (message: string) => void = () => undefined,
): Promise<BookingImportSummary> {
  if (options.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month)) throw new Error('--month must be YYYY-MM, for example 2024-08.');
  const { plan, state } = readInputs(dir, options);
  const todo = plan.entries.filter((entry) => !state.bookings[entry.booking.id] && (options.month === undefined || entry.month === options.month)).slice(0, options.limit ?? Number.POSITIVE_INFINITY);
  const summary: BookingImportSummary = { mode: options.apply ? 'apply' : 'dry-run', planned: todo.length, imported: 0, failed: 0, skipped: plan.skipped, perMonth: plan.perMonth };
  if (!options.apply) return summary;

  const quiet = await assertAutomationsQuiet(http, dir);
  log(`Automation guard passed (${quiet.acknowledgedLocked} locked system automation(s) acknowledged).`);
  const staff = await loadStaff(http);
  const serviceFor = (entry: PlannedBooking) => ({ serviceId: entry.serviceId, scheduleId: entry.scheduleId });
  let first = true;
  for (const [index, entry] of todo.entries()) {
    try {
      const response = await http.request<{ booking?: { id?: string; status?: string; startDate?: string } }>('POST', `${API}/bookings/v2/bookings`, toBookingBody(entry.booking, serviceFor(entry), entry.targetContactId, staff));
      if (!response.booking?.id) throw new Error('Wix returned no booking id');
      state.bookings[entry.booking.id] = response.booking.id;
      delete state.failures[entry.booking.id];
      if (first) {
        first = false;
        const kept = response.booking.status === 'CONFIRMED' && Date.parse(response.booking.startDate ?? '') === Date.parse(entry.booking.startDate ?? '');
        if (!kept) {
          summary.stopped = `Stopped after the first booking: Wix did not keep it as confirmed on ${entry.booking.startDate} (status ${response.booking.status}, start ${response.booking.startDate}). It is recorded, so rollback can cancel it.`;
          writeJson(stateFile(dir), state);
          break;
        }
      }
    } catch (error) {
      state.failures[entry.booking.id] = text(error);
    }
    writeJson(stateFile(dir), state);
    if ((index + 1) % 50 === 0) log(`  bookings: ${index + 1}/${todo.length}`);
  }
  summary.imported = Object.keys(state.bookings).length;
  summary.failed = Object.keys(state.failures).length;
  return summary;
}

interface StagedBooking {
  id: string;
  revision?: string;
  status?: string;
  startDate?: string;
  contactDetails?: { contactId?: string };
}

/** Every booking on staging, by id. Follows the cursor wherever Wix puts it. */
async function stagedBookings(http: WixHttp): Promise<Map<string, StagedBooking>> {
  const found = new Map<string, StagedBooking>();
  let cursor: string | undefined;
  for (let page = 0; page < 1000; page += 1) {
    const response = await http.request<{ extendedBookings?: Array<{ booking?: StagedBooking }>; metadata?: { cursors?: { next?: string } }; pagingMetadata?: { cursors?: { next?: string } } }>(
      'POST',
      `${API}/bookings/bookings-reader/v2/extended-bookings/query`,
      { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } },
    );
    for (const entry of response.extendedBookings ?? []) if (entry.booking?.id) found.set(entry.booking.id, entry.booking);
    const next = response.metadata?.cursors?.next ?? response.pagingMetadata?.cursors?.next;
    if (!next || next === cursor) return found;
    cursor = next;
  }
  throw new Error('Still more bookings after 1000 pages; refusing to act on a partial list.');
}

export interface BookingVerifyReport {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}

/** Reads staging back: every imported booking is there, still confirmed, on the right day, under the right customer. */
export async function verifyBookings(http: WixHttp, dir: string): Promise<BookingVerifyReport> {
  const { plan, state } = readInputs(dir, { through: '9999-12-31', from: '0000-01-01' });
  const source = new Map(plan.entries.map((entry) => [entry.booking.id, entry] as const));
  const staged = await stagedBookings(http);
  const wanted = Object.entries(state.bookings);
  let missing = 0;
  let notConfirmed = 0;
  let moved = 0;
  let wrongCustomer = 0;
  for (const [sourceId, stagingId] of wanted) {
    const on = staged.get(stagingId);
    if (!on) {
      missing += 1;
      continue;
    }
    const entry = source.get(sourceId);
    if (on.status !== 'CONFIRMED') notConfirmed += 1;
    if (entry && Date.parse(on.startDate ?? '') !== Date.parse(entry.booking.startDate ?? '')) moved += 1;
    if (entry && on.contactDetails?.contactId !== entry.targetContactId) wrongCustomer += 1;
  }
  const checks = [
    { name: 'every imported booking is on staging', ok: missing === 0, detail: `${wanted.length - missing}/${wanted.length}` },
    { name: 'imported bookings are still confirmed', ok: notConfirmed === 0, detail: `${notConfirmed} not confirmed` },
    { name: 'start dates preserved', ok: moved === 0, detail: `${moved} differ` },
    { name: 'bookings are under their customer’s staging contact', ok: wrongCustomer === 0, detail: `${wrongCustomer} differ` },
    { name: 'no recorded failures', ok: Object.keys(state.failures).length === 0, detail: `${Object.keys(state.failures).length} failed` },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

/**
 * Cancels the bookings this tool imported, using only the ids it recorded. The cancellation policy is ignored
 * (the sessions are in the past) and nobody is told. Needs the automation guard as well: a cancellation is an event too.
 */
export async function runBookingsRollback(http: WixHttp, dir: string, apply: boolean, log: (message: string) => void = () => undefined): Promise<{ planned: number; removed: number; warnings: string[] }> {
  const state = readState(dir);
  const entries = Object.entries(state.bookings);
  const summary = { planned: entries.length, removed: 0, warnings: [] as string[] };
  if (!apply || entries.length === 0) return summary;
  await assertAutomationsQuiet(http, dir);
  const staged = await stagedBookings(http);
  for (const [sourceId, stagingId] of entries) {
    const on = staged.get(stagingId);
    try {
      if (on && on.status !== 'CANCELED') {
        await http.request('POST', `${API}/bookings/v2/bookings/${stagingId}/cancel`, {
          bookingId: stagingId,
          revision: on.revision,
          participantNotification: { notifyParticipants: false },
          flowControlSettings: { ignoreCancellationPolicy: true, waiveCancellationFee: true },
        });
      }
      delete state.bookings[sourceId];
      summary.removed += 1;
    } catch (error) {
      summary.warnings.push(`${sourceId}: ${text(error)}`);
    }
    writeJson(stateFile(dir), state);
    if (summary.removed % 100 === 0 && summary.removed > 0) log(`  cancelled ${summary.removed}/${entries.length}`);
  }
  return summary;
}
