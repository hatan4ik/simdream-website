import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { adminRequest } from './api-helpers';
import { apiRequest, readJson } from '../support/http';
import { MAIL_ENV } from '../reliability/helpers';

/**
 * POST /api/refund-requests and /lookup: validation, honeypot, the order check that must not leak,
 * idempotency, throttling, email, and the admin listing. Development rules: in-memory storage.
 * Production and fail-closed behaviour is in refund-requests-production.test.ts.
 */
const REFERENCE = /^RF-[A-HJ-NP-Z2-9]{6}$/;

function submission(overrides: Record<string, unknown> = {}) {
  return {
    clientRequestId: crypto.randomUUID(),
    language: 'en',
    productKind: 'flight',
    orderReference: 'WIX-10234',
    contactName: 'Dana Pilot',
    email: 'dana@pilots.test',
    phone: '+972501234567',
    sessionDate: '2026-11-20',
    sessionTime: '18:30',
    reason: 'change_of_plans',
    message: 'I cannot make it that evening.',
    acceptedTruth: true,
    acceptedRules: true,
    website: '',
    ...overrides,
  };
}

async function routes() {
  const [submit, lookup, server] = await Promise.all([
    import('@/app/api/refund-requests/route'),
    import('@/app/api/refund-requests/lookup/route'),
    import('@/lib/refund/server'),
  ]);
  // loadApp() clears the order store but knows nothing about this module's in-memory requests.
  server.resetRefundRequestsForTests();
  return {
    post: async (body: unknown, headers: Record<string, string> = {}) =>
      readJson<Record<string, unknown>>(await submit.POST(apiRequest('/api/refund-requests', { body, headers }))),
    lookup: async (body: unknown, headers: Record<string, string> = {}) =>
      readJson<Record<string, unknown>>(await lookup.POST(apiRequest('/api/refund-requests/lookup', { body, headers }))),
    list: async (admin: boolean) =>
      readJson<unknown>(
        await submit.GET(admin ? adminRequest('/api/refund-requests') : apiRequest('/api/refund-requests'))
      ),
    stored: () => server.listRefundRequests(50),
  };
}

function paidBooking(app: TestApp) {
  const booking = app.seed.DEMO_BOOKINGS.find((item) => item.paymentStatus === 'paid');
  if (!booking) throw new Error('The seed has no paid booking.');
  return booking;
}

let sent: Array<{ to: string; replyTo?: string; subject: string; html: string }>;
function mockMail(failures: { staff?: boolean; customer?: boolean } = {}) {
  sent = [];
  const send = vi.fn(async (message: { to: string; replyTo?: string; subject: string; html: string }) => {
    const toStaff = message.to === 'desk@simdream.co.il';
    if ((toStaff && failures.staff) || (!toStaff && failures.customer)) throw new Error('SendGrid responded 503 for secret@example.test');
    sent.push(message);
    return [{ statusCode: 202 }, {}];
  });
  vi.doMock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send } }));
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});
afterEach(() => vi.doUnmock('@sendgrid/mail'));

describe('POST /api/refund-requests', () => {
  it('stores an unverified request, returns a readable reference and the likely outcome, never a refund', async () => {
    await loadApp();
    const api = await routes();

    const response = await api.post(submission());

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.body.reference).toMatch(REFERENCE);
    expect(response.body).toMatchObject({
      duplicate: false,
      acknowledged: false,
      evaluation: { outcome: 'full_refund_possible', clauses: ['4.3', '4.1'], alsoPossible: ['reschedule_free'], urgent: false },
    });
    const [record] = await api.stored();
    expect(record).toMatchObject({
      reference: response.body.reference,
      status: 'new',
      verification: 'unverified',
      orderReference: 'WIX-10234',
      email: 'dana@pilots.test',
      sessionDate: '2026-11-20',
      sessionTime: '18:30',
      language: 'en',
    });
    expect(record.evaluation.staff.flags).toEqual(expect.arrayContaining(['order_not_verified', 'order_date_unknown']));
  });

  it('verifies a paid booking by reference AND email and then trusts the order, not the form', async () => {
    const app = await loadApp();
    const api = await routes();
    const booking = paidBooking(app);

    const response = await api.post(
      submission({
        orderReference: booking.bookingReference.toLowerCase(),
        email: booking.pilotEmail.toUpperCase(),
        sessionDate: '2030-01-01',
        sessionTime: '09:00',
      })
    );

    expect(response.status).toBe(201);
    const [record] = await api.stored();
    expect(record).toMatchObject({
      verification: 'verified',
      verifiedOrderId: booking.id,
      sessionDate: booking.bookingDate,
      sessionTime: booking.startTime,
      packageTitle: booking.packageTitle,
    });
    expect(record.evaluation.staff.flags).not.toContain('order_not_verified');
  });

  it('keeps a request unverified when the email does not match the booking', async () => {
    const app = await loadApp();
    const api = await routes();
    const booking = paidBooking(app);

    await api.post(submission({ orderReference: booking.bookingReference, email: 'someone.else@pilots.test' }));

    const [record] = await api.stored();
    expect(record.verification).toBe('unverified');
    expect(record.verifiedOrderId).toBeNull();
    expect(record.sessionDate).toBe('2026-11-20');
  });

  it('returns the same reference for a retry with the same clientRequestId and stores one request', async () => {
    await loadApp();
    const api = await routes();
    const body = submission();

    const first = await api.post(body);
    const second = await api.post(body);

    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ reference: first.body.reference, duplicate: true });
    expect(await api.stored()).toHaveLength(1);
  });

  it('flags a session inside 48 hours as urgent', async () => {
    await loadApp();
    const api = await routes();

    const response = await api.post(submission({ sessionDate: '2026-11-02', sessionTime: '10:00' }));

    expect(response.body.evaluation).toMatchObject({ urgent: true });
  });

  describe('rejects what it should', () => {
    it('answers 400 for a filled honeypot and stores nothing', async () => {
      await loadApp();
      const api = await routes();

      const response = await api.post(submission({ website: 'https://spam.example' }));

      expect(response.status).toBe(400);
      expect(Object.keys(response.body.fields as object)).toEqual(['website']);
      expect(await api.stored()).toEqual([]);
    });

    it.each([
      { name: 'an invalid email', overrides: { email: 'dana-at-pilots' }, field: 'email' },
      { name: 'a missing truth declaration', overrides: { acceptedTruth: false }, field: 'acceptedTruth' },
      { name: 'a missing rules acknowledgement', overrides: { acceptedRules: undefined }, field: 'acceptedRules' },
      { name: 'a short phone number', overrides: { phone: '12' }, field: 'phone' },
      { name: 'a blank name', overrides: { contactName: '   ' }, field: 'contactName' },
      { name: 'an unknown reason', overrides: { reason: 'because' }, field: 'reason' },
      { name: 'a voucher reason on a flight', overrides: { reason: 'gift_voucher' }, field: 'reason' },
      { name: 'an impossible session date', overrides: { sessionDate: '2026-02-30' }, field: 'sessionDate' },
      { name: 'a session time without a date', overrides: { sessionDate: undefined }, field: 'sessionDate' },
      { name: 'a malformed client request id', overrides: { clientRequestId: 'not-a-uuid' }, field: 'clientRequestId' },
      { name: 'an unsupported language', overrides: { language: 'xx' }, field: 'language' },
      { name: 'a message over 1,000 characters', overrides: { message: 'x'.repeat(1_001) }, field: 'message' },
      { name: 'an order reference with markup', overrides: { orderReference: '<script>' }, field: 'orderReference' },
    ])('answers 400 for $name and stores nothing', async ({ overrides, field }) => {
      await loadApp();
      const api = await routes();

      const response = await api.post(submission(overrides));

      expect(response.status).toBe(400);
      expect(Object.keys(response.body.fields as object)).toContain(field);
      expect(await api.stored()).toEqual([]);
    });

    it('answers 403 to a cross-origin browser request', async () => {
      await loadApp();
      const api = await routes();
      expect((await api.post(submission(), { origin: 'https://evil.example' })).status).toBe(403);
      expect((await api.post(submission(), { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
      expect((await api.post(submission(), { origin: 'http://localhost:3000' })).status).toBe(201);
    });

    it('answers 415 without a JSON content type, 413 for a huge body and 400 for broken JSON', async () => {
      await loadApp();
      const submit = await import('@/app/api/refund-requests/route');
      const send = async (init: { rawBody: string; headers?: Record<string, string> }) =>
        (await submit.POST(apiRequest('/api/refund-requests', { ...init, method: 'POST' }))).status;

      expect(await send({ rawBody: '{}', headers: { 'content-type': 'text/plain' } })).toBe(415);
      expect(await send({ rawBody: JSON.stringify({ pad: 'x'.repeat(20_000) }), headers: { 'content-type': 'application/json' } })).toBe(413);
      expect(await send({ rawBody: '{not json', headers: { 'content-type': 'application/json' } })).toBe(400);
    });
  });

  it('throttles a fifth request in an hour from the same email with 429 and Retry-After', async () => {
    await loadApp();
    const api = await routes();
    for (let index = 0; index < 4; index += 1) expect((await api.post(submission())).status).toBe(201);

    const response = await api.post(submission());

    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('POST /api/refund-requests/lookup (the order check must not leak)', () => {
  it('reveals only the package title, session date and time and order date for a matching booking', async () => {
    const app = await loadApp();
    const api = await routes();
    const booking = paidBooking(app);

    const response = await api.lookup({ productKind: 'flight', orderReference: booking.bookingReference, email: booking.pilotEmail });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['orderDate', 'packageTitle', 'productKind', 'sessionDate', 'sessionTime', 'verified']);
    expect(response.body).toMatchObject({
      verified: true,
      productKind: 'flight',
      packageTitle: booking.packageTitle,
      sessionDate: booking.bookingDate,
      sessionTime: booking.startTime,
    });
    const text = JSON.stringify(response.body);
    for (const secret of [booking.pilotName, booking.pilotPhone, booking.pilotEmail, String(booking.totalIls), booking.id]) {
      expect(text).not.toContain(secret);
    }
  });

  it('answers the identical { verified: false } for a wrong email, an unknown reference and a Wix order', async () => {
    const app = await loadApp();
    const api = await routes();
    const booking = paidBooking(app);

    const wrongEmail = await api.lookup({ productKind: 'flight', orderReference: booking.bookingReference, email: 'nobody@pilots.test' });
    const unknown = await api.lookup({ productKind: 'flight', orderReference: 'SD-737-AAAAAAAAAAAAAAAA', email: booking.pilotEmail });
    const wix = await api.lookup({ productKind: 'subscription', orderReference: '8f1c-wix-order', email: booking.pilotEmail });

    for (const response of [wrongEmail, unknown, wix]) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ verified: false });
    }
  });

  it('verifies a voucher for its buyer, not for its recipient', async () => {
    await loadApp();
    const api = await routes();
    const voucher = { orderReference: 'sd-vouch-df7qk3mn8r2v6x9lpa', productKind: 'voucher' };

    const buyer = await api.lookup({ ...voucher, email: 'michal@example.com' });
    const recipient = await api.lookup({ ...voucher, email: 'david@example.com' });

    expect(buyer.body).toMatchObject({ verified: true, productKind: 'voucher', sessionDate: null, sessionTime: null });
    expect(recipient.body).toEqual({ verified: false });
  });

  it('names the store by the reference prefix even when the wrong product was picked', async () => {
    await loadApp();
    const api = await routes();
    const response = await api.lookup({ productKind: 'flight', orderReference: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA', email: 'michal@example.com' });
    expect(response.body).toMatchObject({ verified: true, productKind: 'voucher' });
  });

  it('validates its input and its origin', async () => {
    await loadApp();
    const api = await routes();
    expect((await api.lookup({ productKind: 'flight', orderReference: '', email: 'a@b.test' })).status).toBe(400);
    expect((await api.lookup({ productKind: 'car', orderReference: 'SD-737-X', email: 'a@b.test' })).status).toBe(400);
    expect((await api.lookup({ productKind: 'flight', orderReference: 'SD-737-X', email: 'a@b.test' }, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('throttles guessing: the 11th try at one reference in 15 minutes answers 429', async () => {
    await loadApp();
    const api = await routes();
    const body = { productKind: 'flight', orderReference: 'SD-737-GUESSGUESSGUESSX', email: 'a@b.test' };
    for (let index = 0; index < 10; index += 1) expect((await api.lookup(body)).status).toBe(200);
    expect((await api.lookup(body)).status).toBe(429);
  });
});

describe('email', () => {
  it('emails the desk (Reply-To the customer) and acknowledges the customer in their language', async () => {
    mockMail();
    await loadApp({ env: MAIL_ENV });
    const api = await routes();

    const response = await api.post(submission({ language: 'fr', contactName: 'Zoé <b>Pilot</b>' }));

    expect(response.status).toBe(201);
    expect(response.body.acknowledged).toBe(true);
    const staff = sent.find((mail) => mail.to === 'desk@simdream.co.il');
    const customer = sent.find((mail) => mail.to === 'dana@pilots.test');
    expect(staff?.replyTo).toBe('dana@pilots.test');
    expect(staff?.subject).toContain(String(response.body.reference));
    expect(staff?.html).toContain('Nothing has been refunded or changed');
    expect(staff?.html).not.toContain('<b>Pilot</b>');
    expect(customer?.subject).toBe(`Votre demande de remboursement Sim Dream ${String(response.body.reference)}`);
    expect(customer?.html).toContain('dir="ltr"');
    const [record] = await api.stored();
    expect(record.staffNotifiedAt).not.toBeNull();
    expect(record.customerAcknowledgedAt).not.toBeNull();
  });

  it('writes Arabic and Hebrew acknowledgements right to left', async () => {
    mockMail();
    await loadApp({ env: MAIL_ENV });
    const api = await routes();
    await api.post(submission({ language: 'ar', email: 'ar@pilots.test' }));
    await api.post(submission({ language: 'he', email: 'he@pilots.test' }));
    for (const to of ['ar@pilots.test', 'he@pilots.test']) {
      expect(sent.find((mail) => mail.to === to)?.html).toContain('<div dir="rtl"');
    }
  });

  it('still answers 201 when the acknowledgement fails, and says so', async () => {
    mockMail({ customer: true });
    await loadApp({ env: MAIL_ENV });
    const api = await routes();

    const response = await api.post(submission());

    expect(response.status).toBe(201);
    expect(response.body.acknowledged).toBe(false);
    const [record] = await api.stored();
    expect(record.staffNotifiedAt).not.toBeNull();
    expect(record.customerAcknowledgedAt).toBeNull();
  });

  it('honours REFUND_NOTIFY_EMAIL for the team inbox', async () => {
    mockMail();
    await loadApp({ env: { ...MAIL_ENV, REFUND_NOTIFY_EMAIL: 'refunds@simdream.test' } });
    const api = await routes();
    await api.post(submission());
    expect(sent.some((mail) => mail.to === 'refunds@simdream.test')).toBe(true);
    expect(sent.some((mail) => mail.to === 'desk@simdream.co.il')).toBe(false);
  });

  it('keeps personal data out of the logs when mail fails', async () => {
    mockMail({ staff: true, customer: true });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await loadApp({ env: MAIL_ENV });
    const api = await routes();

    expect((await api.post(submission())).status).toBe(201);

    const logged = JSON.stringify([...errors.mock.calls, ...vi.mocked(console.info).mock.calls]);
    for (const secret of ['dana@pilots.test', 'secret@example.test', 'Dana Pilot', '+972501234567', 'WIX-10234', 'cannot make it']) {
      expect(logged.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });
});

describe('GET /api/refund-requests (staff)', () => {
  it('is closed to the public and lists the newest requests for an admin', async () => {
    await loadApp();
    const api = await routes();
    await api.post(submission({ email: 'first@pilots.test' }));
    await api.post(submission({ email: 'second@pilots.test' }));

    expect((await api.list(false)).status).toBe(401);
    const listed = await api.list(true);

    expect(listed.status).toBe(200);
    expect(listed.headers.get('cache-control')).toBe('private, no-store');
    expect((listed.body as Array<{ email: string }>).map((item) => item.email)).toEqual(['second@pilots.test', 'first@pilots.test']);
  });
});
