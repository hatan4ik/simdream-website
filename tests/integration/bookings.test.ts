import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, basicAuth, bearer, readJson } from '../support/http';
import { TEST_ADMIN } from '../support/test-env';
import {
  adminRequest,
  collectKeys,
  createVoucherFundedBooking,
  EMPTY_DAY,
  isSlotOpen,
  PRIVATE_NO_STORE,
  SEED_FULL_VOUCHER,
} from './api-helpers';
import { booking as bookingContract, errorBody, expectContract, publicBooking, validationErrorBody } from './contracts';

const DAY = EMPTY_DAY.sunday;
const REFERENCE_PATTERN = /^SD-737-[A-Z2-9]{16}$/;

async function lookup(app: TestApp, query: string, headers: Record<string, string> = {}) {
  const { GET } = await app.routes.bookings();
  return readJson(await GET(apiRequest(`/api/bookings${query}`, { headers })));
}

async function adminLookup(app: TestApp, query = '') {
  const { GET } = await app.routes.bookings();
  return readJson(await GET(adminRequest(`/api/bookings${query}`)));
}

async function patchBooking(app: TestApp, body: unknown) {
  const { PATCH } = await app.routes.bookings();
  return readJson(await PATCH(adminRequest('/api/bookings', { method: 'PATCH', body })));
}

describe('GET /api/bookings?ref (public success page lookup)', () => {
  it('returns only the narrow public projection, privately, for a valid reference', async () => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, {
      date: DAY,
      pilotEmail: 'lookup.pilot@pilots.test',
      pilotPhone: '+972500000123',
      notes: 'Window seat for my partner',
    });

    const response = await lookup(app, `?ref=${created.bookingReference}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(publicBooking, response.body)).toEqual({
      bookingReference: created.bookingReference,
      packageId: created.packageId,
      packageTitle: created.packageTitle,
      durationMinutes: created.durationMinutes,
      bookingDate: DAY,
      startTime: created.startTime,
      endTime: created.endTime,
      pilotName: created.pilotName,
      addons: [],
      totalIls: 0,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
    const keys = collectKeys(response.body);
    for (const privateKey of ['id', 'userId', 'pilotEmail', 'pilotPhone', 'stripePaymentIntentId', 'voucherCode', 'notes']) {
      expect(keys.has(privateKey), privateKey).toBe(false);
    }
  });

  it('refuses a short legacy reference with 404 even though such a booking exists', async () => {
    const app = await loadApp();
    // Seed bookings now use the capability format (E2E-7), so make a legacy-format record
    // explicitly: the in-memory store hands back its own booking object.
    const legacy = 'SD-737-4821';
    const stored = await createVoucherFundedBooking(app, { date: EMPTY_DAY.sunday });
    stored.bookingReference = legacy;
    expect(await app.store.getBookingByRef(legacy)).toBeDefined();

    const response = await lookup(app, `?ref=${legacy}`);

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found');
  });

  it.each([
    { name: 'a lowercase reference', transform: (ref: string) => ref.toLowerCase() },
    { name: 'a reference with a trailing space', transform: (ref: string) => `${ref} ` },
    { name: 'a reference one character too long', transform: (ref: string) => `${ref}A` },
    { name: 'a reference using excluded look-alike characters', transform: (ref: string) => `${ref.slice(0, -2)}O0` },
  ])('answers 404 to $name of an existing booking', async ({ transform }) => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY });

    const response = await lookup(app, `?ref=${encodeURIComponent(transform(created.bookingReference))}`);

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found');
  });

  it('answers 404 to a well-formed reference that does not exist', async () => {
    const app = await loadApp();

    const response = await lookup(app, '?ref=SD-737-ABCDEFGHJKLMNPQR');

    expect(response.status).toBe(404);
    expectContract(errorBody, response.body);
  });

  it('answers 404 to any reference that does not match the capability format (property)', async () => {
    const app = await loadApp();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((ref) => !REFERENCE_PATTERN.test(ref)),
        async (ref) => {
          const response = await lookup(app, `?ref=${encodeURIComponent(ref)}`);

          expect(response.status).toBe(404);
          expect(response.body).toEqual({ error: 'Booking not found' });
        }
      ),
      { numRuns: 150 }
    );
  });
});

describe('GET /api/bookings (admin)', () => {
  it.each([
    { name: 'no credentials', headers: {} },
    { name: 'a wrong password', headers: { authorization: basicAuth(TEST_ADMIN.user, 'not-the-password-123456') } },
    { name: 'a member bearer token', headers: bearer('token-ada') },
  ])('challenges $name with 401 and a Basic auth prompt', async ({ headers }) => {
    const app = await loadApp();

    const response = await lookup(app, '', headers);

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Basic realm="Sim Dream Admin", charset="UTF-8"');
    expect(expectContract(errorBody, response.body).error).toBe('Admin authentication required');
  });

  it('answers 503 when admin credentials are not configured', async () => {
    const app = await loadApp({ env: { ADMIN_USER: '', ADMIN_PASSWORD: '' } });

    const response = await adminLookup(app);

    expect(response.status).toBe(503);
    expectContract(errorBody, response.body);
  });

  it('lists every booking for an admin under the booking contract, privately', async () => {
    const app = await loadApp();
    await createVoucherFundedBooking(app, { date: DAY });

    const response = await adminLookup(app);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const bookings = expectContract(bookingContract.array(), response.body);
    expect(bookings.map((item) => item.id)).toEqual((await app.store.getBookings()).map((item) => item.id));
  });

  it('returns one full booking by id, privately', async () => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: 'by.id@pilots.test' });

    const response = await adminLookup(app, `?id=${created.id}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(bookingContract, response.body)).toMatchObject({
      id: created.id,
      bookingReference: created.bookingReference,
      pilotEmail: 'by.id@pilots.test',
    });
  });

  it('answers 404 for an unknown booking id', async () => {
    const app = await loadApp();

    const response = await adminLookup(app, '?id=book-does-not-exist');

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found');
  });

  it('filters bookings by pilot email, ignoring letter case', async () => {
    const app = await loadApp();
    const expected = (await app.store.getBookings()).filter((item) => item.pilotEmail === 'pilot@simdream.co.il');
    expect(expected.length).toBeGreaterThan(0);

    const response = await adminLookup(app, `?email=${encodeURIComponent('PILOT@SimDream.co.il')}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const bookings = expectContract(bookingContract.array(), response.body);
    expect(bookings.map((item) => item.id)).toEqual(expected.map((item) => item.id));
  });
});

describe('POST /api/bookings', () => {
  it('refuses direct booking creation with 405 and points callers to /api/checkout', async () => {
    const app = await loadApp();
    const before = (await app.store.getBookings()).length;
    const { POST } = await app.routes.bookings();

    const response = await readJson(await POST());

    expect(response.status).toBe(405);
    expect(expectContract(errorBody, response.body).error).toBe('Create bookings through /api/checkout.');
    expect((await app.store.getBookings()).length).toBe(before);
  });
});

describe('PATCH /api/bookings (admin)', () => {
  it('updates a booking status and returns the full booking', async () => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY });

    const response = await patchBooking(app, { id: created.id, status: 'completed' });

    expect(response.status).toBe(200);
    expect(expectContract(bookingContract, response.body)).toMatchObject({ id: created.id, status: 'completed' });
    expect((await app.store.getBookingById(created.id))?.status).toBe('completed');
  });

  it('reschedules a booking to a free time, recomputes its end time and frees the old slot', async () => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY });
    expect(created.startTime).toBe('10:00');

    const response = await patchBooking(app, { id: created.id, startTime: '18:00' });

    expect(response.status).toBe(200);
    expect(expectContract(bookingContract, response.body)).toMatchObject({ startTime: '18:00', endTime: '18:20' });
    expect(await isSlotOpen(app, DAY, 20, '10:00')).toBe(true);
    expect(await isSlotOpen(app, DAY, 20, '18:00')).toBe(false);
  });

  it('rejects a reschedule that overlaps another booking with 409 and leaves both untouched', async () => {
    const app = await loadApp();
    const first = await createVoucherFundedBooking(app, { date: DAY });
    const second = await createVoucherFundedBooking(app, { date: DAY, voucherCode: SEED_FULL_VOUCHER.code });

    const response = await patchBooking(app, { id: second.id, startTime: '10:15' });

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('The proposed time conflicts with another booking.');
    expect((await app.store.getBookingById(second.id))?.startTime).toBe(second.startTime);
    expect((await app.store.getBookingById(first.id))?.startTime).toBe('10:00');
  });

  it.each([
    { name: 'before opening', startTime: '09:30' },
    { name: 'so late that the reserved block passes closing time', startTime: '22:30' },
  ])('rejects a reschedule $name with 409', async ({ startTime }) => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY });

    const response = await patchBooking(app, { id: created.id, startTime });

    expect(response.status).toBe(409);
    expect(expectContract(errorBody, response.body).error).toBe('The proposed time is outside operating hours.');
    expect((await app.store.getBookingById(created.id))?.startTime).toBe(created.startTime);
  });

  it('answers 404 when updating the status of an unknown booking', async () => {
    const app = await loadApp();

    const response = await patchBooking(app, { id: 'book-does-not-exist', status: 'cancelled' });

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Booking not found');
  });

  it('answers 404 when rescheduling an unknown booking (API-8)', async () => {
    const app = await loadApp();

    const response = await patchBooking(app, { id: 'book-does-not-exist', startTime: '18:00' });

    expect(response.status).toBe(404);
    expectContract(errorBody, response.body);
  });

  it('refuses to reactivate a cancelled booking whose departure was re-sold (API-11)', async () => {
    const app = await loadApp();
    const cancelled = await createVoucherFundedBooking(app, { date: DAY, pilotEmail: 'first.buyer@pilots.test' });
    expect((await patchBooking(app, { id: cancelled.id, status: 'cancelled' })).status).toBe(200);
    const resold = await createVoucherFundedBooking(app, {
      date: DAY,
      voucherCode: SEED_FULL_VOUCHER.code,
      pilotEmail: 'second.buyer@pilots.test',
    });
    expect(resold.startTime).toBe(cancelled.startTime);

    const response = await patchBooking(app, { id: cancelled.id, status: 'confirmed' });

    expect(response.status).toBe(409);
    expectContract(errorBody, response.body);
    expect((await app.store.getBookingById(cancelled.id))?.status).toBe('cancelled');
  });

  it.each([
    { name: 'neither a status nor a start time', body: { id: 'book-101' }, field: 'request' },
    { name: 'an unknown status', body: { id: 'book-101', status: 'archived' }, field: 'status' },
    { name: 'a malformed start time', body: { id: 'book-101', startTime: '7pm' }, field: 'startTime' },
    { name: 'a missing id', body: { status: 'confirmed' }, field: 'id' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp();

    const response = await patchBooking(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const app = await loadApp();
    const { PATCH } = await app.routes.bookings();

    const response = await readJson(await PATCH(adminRequest('/api/bookings', { method: 'PATCH', rawBody: '{"id":' })));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });

  it('requires admin credentials and changes nothing without them', async () => {
    const app = await loadApp();
    const created = await createVoucherFundedBooking(app, { date: DAY });
    const { PATCH } = await app.routes.bookings();

    const response = await readJson(
      await PATCH(apiRequest('/api/bookings', { method: 'PATCH', body: { id: created.id, status: 'cancelled' } }))
    );

    expect(response.status).toBe(401);
    expect((await app.store.getBookingById(created.id))?.status).toBe('confirmed');
  });
});
