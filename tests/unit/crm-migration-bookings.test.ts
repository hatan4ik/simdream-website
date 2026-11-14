import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planBookings, runBookingsImport, runBookingsRollback, toBookingBody, verifyBookings, type SourceBooking } from '../../tools/crm-migration/bookings';
import { FILES, ensureDataDir, pathIn, readJson, writeJson, writeNdjson } from '../../tools/crm-migration/io';
import { createServices, proposeServiceMap, type ServiceMap } from '../../tools/crm-migration/services';
import { createFakeTarget } from './_support/crm-fake-wix';

/** Synthetic customers only. */
const booking = (id: string, start: string, fields: Partial<SourceBooking> = {}): SourceBooking => ({
  id,
  status: 'CONFIRMED',
  startDate: start,
  endDate: new Date(Date.parse(start) + 60 * 60000).toISOString(),
  totalParticipants: 1,
  contactDetails: { contactId: 'pc1', firstName: 'Dana', lastName: 'Levi', email: 'dana@example.com' },
  bookedEntity: { title: '60 דקות', slot: { serviceId: 'prod-60', timezone: 'Asia/Jerusalem', resource: { id: 'prod-res', name: 'Mike' } } },
  ...fields,
});
const stagingServices = [
  { id: 's-cap', name: "Captain's Command Flight (60m)", scheduleId: 'sch-cap' },
  { id: 's-disc', name: 'Discovery Flight — 30-Minute Boeing 737 Experience', scheduleId: 'sch-disc' },
  { id: 's-pro60', name: 'Airline Interview Prep 60 PRO', scheduleId: 'sch-pro60' },
];

describe('proposeServiceMap and createServices', () => {
  it('maps production titles to staging services by what the title says, and lists the rest to create with their own title and usual length', () => {
    const bookings = [
      booking('b1', '2025-01-01T10:00:00Z'),
      booking('b2', '2025-01-02T10:00:00Z', { bookedEntity: { title: 'קברניט לשעה', slot: { serviceId: 'prod-hour' } } }),
      booking('b3', '2025-01-03T10:00:00Z', { bookedEntity: { title: '30 דקות', slot: { serviceId: 'prod-30' } } }),
      booking('b4', '2025-01-04T10:00:00Z', { bookedEntity: { title: 'טעימה', slot: { serviceId: 'prod-taste' } }, endDate: '2025-01-04T10:30:00Z' }),
      booking('b5', '2025-01-05T10:00:00Z', { bookedEntity: { title: 'טעימה', slot: { serviceId: 'prod-taste' } }, endDate: '2025-01-05T10:30:00Z' }),
    ];
    const { map, toCreate } = proposeServiceMap(bookings, stagingServices);
    expect(map['prod-60']).toMatchObject({ serviceId: 's-cap', scheduleId: 'sch-cap' });
    expect(map['prod-hour']).toMatchObject({ serviceId: 's-cap' });
    expect(map['prod-30']).toMatchObject({ serviceId: 's-disc' });
    expect(toCreate).toEqual([{ key: 'prod-taste', name: 'טעימה', minutes: 30 }]);
    expect(map['prod-taste']?.serviceId).toBeUndefined();
  });

  it('reuses a staging service that already carries the production title, so a re-run creates nothing', () => {
    const withTaste = [...stagingServices, { id: 's-taste', name: 'טעימה', scheduleId: 'sch-taste' }];
    const { map, toCreate } = proposeServiceMap([booking('b4', '2025-01-04T10:00:00Z', { bookedEntity: { title: 'טעימה', slot: { serviceId: 'prod-taste' } } })], withTaste);
    expect(toCreate).toEqual([]);
    expect(map['prod-taste']).toMatchObject({ serviceId: 's-taste', scheduleId: 'sch-taste' });
  });

  it('creates one staging service per title when production has several services with the same name', () => {
    const twice = [
      booking('b1', '2025-01-04T10:00:00Z', { bookedEntity: { title: 'מבוא', slot: { serviceId: 'intro-a' } } }),
      booking('b2', '2025-01-05T10:00:00Z', { bookedEntity: { title: 'מבוא', slot: { serviceId: 'intro-b' } } }),
    ];
    const { toCreate } = proposeServiceMap(twice, stagingServices);
    expect(toCreate).toEqual([{ key: 'intro-a', name: 'מבוא', minutes: 60, alsoKeys: ['intro-b'] }]);
  });

  it('puts a service to create on the list when its rule matches but staging does not have it', () => {
    const { toCreate } = proposeServiceMap([booking('b1', '2025-01-01T10:00:00Z', { bookedEntity: { title: 'Airline Interview Prep 90 PRO', slot: { serviceId: 'prod-p90' } } })], stagingServices);
    expect(toCreate.map((entry) => entry.key)).toEqual(['prod-p90']);
  });

  it('creates hidden services that cannot be booked online, with no category and no fee', async () => {
    const target = createFakeTarget();
    const created = await createServices(target.http, [{ key: 'prod-taste', name: 'טעימה', minutes: 30 }], 'staff-resource-1');
    const sent = target.services[0] as Record<string, any>;
    expect(sent).toMatchObject({ name: 'טעימה', type: 'APPOINTMENT', hidden: true, onlineBooking: { enabled: false }, staffMemberIds: ['staff-resource-1'], payment: { rateType: 'NO_FEE', options: { inPerson: true } } });
    expect(sent.schedule.availabilityConstraints.sessionDurations).toEqual([30]);
    expect(sent.category).toBeUndefined();
    expect(created['prod-taste']).toMatchObject({ serviceId: 'new-service-1', scheduleId: 'new-schedule-1' });
  });

  it('stops with the reason when Wix refuses a service', async () => {
    await expect(createServices(createFakeTarget().http, [{ key: 'k', name: 'FAIL', minutes: 30 }], 'r')).rejects.toThrow(/FAIL|INVALID_ARGUMENT/);
  });
});

describe('planBookings', () => {
  const serviceMap: ServiceMap = { 'prod-60': { title: '60 דקות', stagingName: 'Captain', serviceId: 's-cap', scheduleId: 'sch-cap' }, 'prod-new': { title: 'x', stagingName: 'x' } };
  const input = (bookings: SourceBooking[]) => ({ bookings, contactToPerson: { pc1: 'p1', pc2: 'p2' }, copiedContacts: { p1: 't1' } as Record<string, string>, excludedContactIds: ['pc-test'], serviceMap, from: '2024-08-01', through: '2026-11-07' });

  it('keeps confirmed bookings of copied customers in the window, and counts why each other one was left out', () => {
    const plan = planBookings(
      input([
        booking('ok', '2025-03-10T10:00:00Z'),
        booking('created', '2025-03-10T10:00:00Z', { status: 'CREATED' }),
        booking('canceled', '2025-03-10T10:00:00Z', { status: 'CANCELED' }),
        booking('test', '2025-03-10T10:00:00Z', { contactDetails: { contactId: 'pc-test' } }),
        booking('not-copied', '2025-03-10T10:00:00Z', { contactDetails: { contactId: 'pc2' } }),
        booking('no-contact', '2025-03-10T10:00:00Z', { contactDetails: {} }),
        booking('too-old', '2024-07-31T10:00:00Z'),
        booking('too-new', '2026-11-08T10:00:00Z'),
        booking('no-service', '2025-03-10T10:00:00Z', { bookedEntity: { title: 'x', slot: { serviceId: 'prod-new' } } }),
      ]),
    );
    expect(plan.entries.map((entry) => entry.booking.id)).toEqual(['ok']);
    expect(plan.skipped).toEqual({ 'not confirmed (CREATED)': 1, 'not confirmed (CANCELED)': 1, 'under a contact you excluded': 1, 'customer not copied to staging': 1, 'no contact on the booking': 1, 'outside the date window': 2, 'service not on staging yet': 1 });
  });

  it('includes both ends of the window and groups by month', () => {
    const plan = planBookings(input([booking('first', '2024-08-01T00:00:00Z'), booking('last', '2026-11-07T23:59:59Z'), booking('mid', '2025-03-10T10:00:00Z'), booking('mid2', '2025-03-20T10:00:00Z')]));
    expect(plan.perMonth).toEqual({ '2024-08': 1, '2025-03': 2, '2026-11': 1 });
  });
});

describe('toBookingBody', () => {
  const entry = { serviceId: 's-cap', scheduleId: 'sch-cap' };
  const staff = new Map([['mike', { id: 'res-mike', name: 'Mike' }]]);

  it('creates a confirmed booking for the copied contact, with every notification off and availability skipped', () => {
    const body = toBookingBody(booking('b', '2025-03-10T10:00:00Z'), entry, 't1', staff);
    expect(body.booking).toMatchObject({ status: 'CONFIRMED', totalParticipants: 1, contactDetails: { contactId: 't1', firstName: 'Dana', lastName: 'Levi', email: 'dana@example.com' } });
    expect(body.booking.bookedEntity.slot).toMatchObject({ serviceId: 's-cap', scheduleId: 'sch-cap', startDate: '2025-03-10T10:00:00Z', timezone: 'Asia/Jerusalem', location: { locationType: 'OWNER_BUSINESS' } });
    expect(body.participantNotification).toEqual({ notifyParticipants: false });
    expect(body.flowControlSettings).toEqual({ skipAvailabilityValidation: true });
  });

  it('keeps who flew when that staff member exists on staging (ignoring case and spaces), and leaves it out when not', () => {
    expect(toBookingBody(booking('b', '2025-03-10T10:00:00Z', { bookedEntity: { title: 't', slot: { serviceId: 'x', resource: { name: ' MIKE ' } } } }), entry, 't1', staff).booking.bookedEntity.slot.resource).toEqual({ id: 'res-mike', name: 'Mike' });
    expect(toBookingBody(booking('b', '2025-03-10T10:00:00Z'), entry, 't1', new Map()).booking.bookedEntity.slot.resource).toBeUndefined();
  });
});

describe('the booking import, rollback and verify', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'crm-bookings-'));
    ensureDataDir(dir);
    writeNdjson(pathIn(dir, FILES.bookings), [
      { booking: booking('a1', '2025-03-10T10:00:00Z') },
      { booking: booking('a2', '2025-03-20T10:00:00Z') },
      { booking: booking('b1', '2025-04-05T10:00:00Z') },
    ]);
    writeJson(pathIn(dir, FILES.contactMap), { pc1: 'p1' });
    writeJson(pathIn(dir, FILES.loadState), { contacts: { p1: 'staging-p1' }, adopted: [], minimal: [], contactFailures: {}, labels: {}, labelsDone: [], orders: {}, coreOrders: [], adjustedOrders: {}, orderFailures: {} });
    writeJson(pathIn(dir, FILES.excluded), { emails: [], contactIds: [], orderIds: [] });
    writeJson(pathIn(dir, FILES.serviceMap), { 'prod-60': { title: '60 דקות', stagingName: 'Captain', serviceId: 's-cap', scheduleId: 'sch-cap' } });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const stateOf = () => readJson<{ bookings: Record<string, string>; failures: Record<string, string> }>(pathIn(dir, FILES.bookingState));
  const options = { apply: true, through: '2026-11-07' };

  it('a dry run makes no call and reports the plan', async () => {
    const target = createFakeTarget();
    const summary = await runBookingsImport(target.http, dir, { apply: false, through: '2026-11-07' });
    expect(summary.planned).toBe(3);
    expect(target.calls).toEqual([]);
  });

  it('imports one month at a time, remembers what it did, and resumes without repeating', async () => {
    const target = createFakeTarget({ staff: [{ name: 'Mike', resourceId: 'res-mike' }] });
    await runBookingsImport(target.http, dir, { ...options, month: '2025-03' });
    expect(Object.keys(stateOf().bookings).sort()).toEqual(['a1', 'a2']);
    await runBookingsImport(target.http, dir, { ...options, month: '2025-03' });
    expect(target.bookings.size).toBe(2);
    await runBookingsImport(target.http, dir, { ...options, month: '2025-04' });
    expect(target.bookings.size).toBe(3);
    const stored = [...target.bookings.values()][0] as Record<string, any>;
    expect(stored.notify).toEqual({ notifyParticipants: false });
    expect(stored.contactDetails.contactId).toBe('staging-p1');
  });

  it('writes nothing while an automation that could email a customer is active', async () => {
    const target = createFakeTarget({ automations: [{ id: 'confirm', name: 'Send clients an email confirmation when they book', triggerKey: 'wix_bookings-sessions_booked', status: 'ACTIVE' }] });
    await expect(runBookingsImport(target.http, dir, options)).rejects.toThrow(/Send clients an email confirmation/);
    expect(target.bookings.size).toBe(0);
  });

  it('records a refused booking, carries on with the rest, and a later run retries it', async () => {
    const first = createFakeTarget({ failBooking: (body) => ((body.booking as any).bookedEntity.slot.startDate.startsWith('2025-03-20') ? 500 : undefined) });
    await runBookingsImport(first.http, dir, options);
    expect(Object.keys(stateOf().failures)).toEqual(['a2']);
    expect(Object.keys(stateOf().bookings).sort()).toEqual(['a1', 'b1']);
    const second = createFakeTarget();
    await runBookingsImport(second.http, dir, options);
    expect(stateOf().failures).toEqual({});
    expect(Object.keys(stateOf().bookings).sort()).toEqual(['a1', 'a2', 'b1']);
  });

  it('stops after the first booking, and says why, when Wix did not keep it as confirmed', async () => {
    const target = createFakeTarget({ alterBookingStatus: 'CREATED' });
    const summary = await runBookingsImport(target.http, dir, options);
    expect(summary.stopped).toMatch(/confirmed/i);
    expect(target.bookings.size).toBe(1);
  });

  it('asks for the service map first when there is none', async () => {
    rmSync(pathIn(dir, FILES.serviceMap));
    await expect(runBookingsImport(createFakeTarget().http, dir, options)).rejects.toThrow(/bookings services/);
  });

  it('verify passes after an import, and fails when a booking on staging changed or was cancelled', async () => {
    const target = createFakeTarget();
    await runBookingsImport(target.http, dir, options);
    expect((await verifyBookings(target.http, dir)).ok).toBe(true);
    const stored = [...target.bookings.values()][0] as Record<string, any>;
    stored.startDate = '2030-01-01T00:00:00Z';
    expect((await verifyBookings(target.http, dir)).ok).toBe(false);
    stored.startDate = stored.bookedEntity.slot.startDate;
    stored.status = 'CANCELED';
    expect((await verifyBookings(target.http, dir)).ok).toBe(false);
  });

  it('rollback cancels only what was imported, ignoring the cancellation policy and notifying nobody', async () => {
    const target = createFakeTarget();
    await runBookingsImport(target.http, dir, options);
    const summary = await runBookingsRollback(target.http, dir, true);
    expect(summary.removed).toBe(3);
    for (const entry of target.bookings.values()) {
      expect(entry.status).toBe('CANCELED');
      expect(entry.cancel).toMatchObject({ participantNotification: { notifyParticipants: false }, flowControlSettings: { ignoreCancellationPolicy: true } });
    }
    expect(stateOf().bookings).toEqual({});
  });

  it('rollback also refuses while an automation that could email a customer is active', async () => {
    const target = createFakeTarget();
    await runBookingsImport(target.http, dir, options);
    const loud = createFakeTarget({ automations: [{ id: 'c', name: 'Notify clients when their booking is canceled', triggerKey: 'wix_bookings-booking_canceled', status: 'ACTIVE' }] });
    await expect(runBookingsRollback(loud.http, dir, true)).rejects.toThrow(/Notify clients/);
  });
});
