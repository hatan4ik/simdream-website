import { describe, expect, it, vi } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { HONEYPOT_FIELD } from '@/lib/security/honeypot';
import { adminRequest, PRIVATE_NO_STORE } from './api-helpers';
import { corporateInquiry, errorBody, expectContract, validationErrorBody, workshopCreated } from './contracts';

function inquiryBody(overrides: Record<string, unknown> = {}) {
  return {
    companyName: 'Contract Probe Ltd',
    contactName: 'Dana Probe',
    email: 'dana@probe.test',
    phone: '+972501112233',
    teamSize: 8,
    targetDate: '2026-12-20',
    primaryGoal: 'team_communication',
    message: 'Leadership offsite for the platform team.',
    ...overrides,
  };
}

async function submitInquiry(app: TestApp, body: unknown) {
  const { POST } = await app.routes.workshops();
  return readJson(await POST(apiRequest('/api/workshops', { body })));
}

async function submitRaw(app: TestApp, init: { rawBody?: string; body?: unknown; headers?: Record<string, string> }) {
  const { POST } = await app.routes.workshops();
  return readJson(await POST(apiRequest('/api/workshops', { method: 'POST', ...init })));
}

async function patchInquiry(app: TestApp, body: unknown) {
  const { PATCH } = await app.routes.workshops();
  return readJson(await PATCH(adminRequest('/api/workshops', { method: 'PATCH', body })));
}

describe('POST /api/workshops (public inquiry)', () => {
  it('accepts an inquiry with 201, answers only its id and status, and stores the submission', async () => {
    const app = await loadApp();

    const response = await submitInquiry(app, inquiryBody({ companyName: '  Contract Probe Ltd  ' }));

    expect(response.status).toBe(201);
    const created = expectContract(workshopCreated, response.body);
    const stored = (await app.store.getCorporateInquiries()).find((inquiry) => inquiry.id === created.id);
    expect(stored).toMatchObject({ ...inquiryBody(), status: 'new' });
  });

  it.each([
    { name: 'a team of zero', overrides: { teamSize: 0 }, field: 'teamSize' },
    { name: 'a team larger than 500', overrides: { teamSize: 501 }, field: 'teamSize' },
    { name: 'a fractional team size', overrides: { teamSize: 2.5 }, field: 'teamSize' },
    { name: 'an unknown goal', overrides: { primaryGoal: 'fun' }, field: 'primaryGoal' },
    { name: 'an invalid email', overrides: { email: 'dana-at-probe' }, field: 'email' },
    { name: 'a too-short phone', overrides: { phone: '12' }, field: 'phone' },
    { name: 'a non-ISO target date', overrides: { targetDate: '20/12/2026' }, field: 'targetDate' },
    { name: 'a blank company name', overrides: { companyName: '  ' }, field: 'companyName' },
    { name: 'a message over 2,000 characters', overrides: { message: 'x'.repeat(2_001) }, field: 'message' },
  ])('rejects $name with 400 and stores nothing', async ({ overrides, field }) => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitInquiry(app, inquiryBody(overrides));

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.workshops();

    const response = await readJson(
      await POST(apiRequest('/api/workshops', { method: 'POST', rawBody: '{', headers: { 'content-type': 'application/json' } }))
    );

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });
});

describe('POST /api/workshops abuse protection', () => {
  const TOO_LARGE = { error: 'Request body is too large.' };

  it('refuses a body over 8 KiB with 413 before it is parsed, whether declared or actual, and stores nothing', async () => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;
    const oversized = JSON.stringify(inquiryBody({ message: 'x'.repeat(8_193) }));

    const actual = await submitRaw(app, { rawBody: oversized, headers: { 'content-type': 'application/json' } });
    const declared = await submitRaw(app, {
      rawBody: JSON.stringify(inquiryBody()),
      headers: { 'content-type': 'application/json', 'content-length': '8193' },
    });

    for (const response of [actual, declared]) {
      expect(response.status).toBe(413);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(expectContract(errorBody, response.body)).toEqual(TOO_LARGE);
    }
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it('still takes a body of exactly 8 KiB', async () => {
    const app = await loadApp();
    // Unknown keys are ignored by the schema, so one of them pads the body to the cap.
    const unpadded = JSON.stringify({ ...inquiryBody(), padding: '' });
    const padded = JSON.stringify({ ...inquiryBody(), padding: 'x'.repeat(8_192 - unpadded.length) });
    expect(new TextEncoder().encode(padded).byteLength).toBe(8_192);

    const response = await submitRaw(app, { rawBody: padded, headers: { 'content-type': 'application/json' } });

    expect(response.status).toBe(201);
  });

  it('rejects malformed JSON with 400 and no-store, storing nothing', async () => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitRaw(app, { rawBody: '{"companyName":', headers: { 'content-type': 'application/json' } });

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it.each<{ name: string; headers: Record<string, string> }>([
    { name: 'no content type', headers: {} },
    { name: 'text/plain', headers: { 'content-type': 'text/plain' } },
    { name: 'a form encoding', headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  ])('answers 415 no-store to a body sent with $name, and stores nothing', async ({ headers }) => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitRaw(app, { rawBody: JSON.stringify(inquiryBody()), headers });

    expect(response.status).toBe(415);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(expectContract(errorBody, response.body).error).toBe('Send the request as application/json.');
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it.each<{ name: string; headers: Record<string, string> }>([
    { name: 'a foreign Origin', headers: { origin: 'https://evil.example' } },
    { name: 'a lookalike Origin on another port', headers: { origin: 'http://localhost:4000' } },
    { name: 'an unparseable Origin', headers: { origin: 'not a url' } },
    { name: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
  ])('refuses a cross-site browser request ($name) with 403 and stores nothing', async ({ headers }) => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitRaw(app, { body: inquiryBody(), headers });

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(expectContract(errorBody, response.body).error).toBe('Cross-origin requests are not allowed.');
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it('takes a same-origin browser request and a script that sends no Origin', async () => {
    const app = await loadApp();

    const browser = await submitRaw(app, {
      body: inquiryBody(),
      headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' },
    });
    const script = await submitRaw(app, { body: inquiryBody({ email: 'script@probe.test' }) });

    expect([browser.status, script.status]).toEqual([201, 201]);
  });

  it('answers a filled honeypot exactly like a real submission, and stores and counts nothing', async () => {
    const app = await loadApp();
    const real = await submitRaw(app, { body: inquiryBody({ email: 'real@probe.test' }) });
    const storedBefore = await app.store.getCorporateInquiries();

    const trapped = await submitRaw(app, {
      body: inquiryBody({ companyName: 'Trapped Bot Ltd', [HONEYPOT_FIELD]: 'https://spam.example' }),
    });

    expect(trapped.status).toBe(real.status);
    expect([...trapped.headers.keys()].sort()).toEqual([...real.headers.keys()].sort());
    expect(Object.keys(trapped.body as object).sort()).toEqual(Object.keys(real.body as object).sort());
    expect(trapped.headers.get('cache-control')).toBe('no-store');
    expectContract(workshopCreated, trapped.body);
    const inquiries = await app.store.getCorporateInquiries();
    expect(inquiries).toHaveLength(storedBefore.length);
    expect(inquiries.some((inquiry) => inquiry.companyName === 'Trapped Bot Ltd')).toBe(false);
    expect(inquiries.some((inquiry) => inquiry.id === (trapped.body as { id: string }).id)).toBe(false);
  });

  it('does not spend the client allowance on a trapped submission', async () => {
    const app = await loadApp();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await submitRaw(app, { body: inquiryBody({ [HONEYPOT_FIELD]: 'https://spam.example' }) })).status).toBe(201);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submitRaw(app, { body: inquiryBody({ email: `real-${attempt}@probe.test` }) })).status).toBe(201);
    }
    expect((await submitRaw(app, { body: inquiryBody() })).status).toBe(429);
  });

  it.each([
    { name: 'a non-empty string', value: 'x' },
    { name: 'a number', value: 7 },
    { name: 'an object', value: { href: 'https://spam.example' } },
    { name: 'a space', value: ' ' },
  ])('treats $name in the honeypot field as a bot', async ({ value }) => {
    const app = await loadApp();
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitRaw(app, { body: inquiryBody({ [HONEYPOT_FIELD]: value }) });

    expect(response.status).toBe(201);
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it('takes an empty or missing honeypot field as a person, and never stores it', async () => {
    const app = await loadApp();

    const withEmpty = await submitRaw(app, { body: inquiryBody({ [HONEYPOT_FIELD]: '' }) });
    const withNull = await submitRaw(app, { body: inquiryBody({ [HONEYPOT_FIELD]: null, email: 'null@probe.test' }) });

    expect([withEmpty.status, withNull.status]).toEqual([201, 201]);
    const stored = (await app.store.getCorporateInquiries()).find((inquiry) => inquiry.id === (withEmpty.body as { id: string }).id);
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty(HONEYPOT_FIELD);
  });

  it('validates the schema before it spends any of the client allowance', async () => {
    const app = await loadApp();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect((await submitRaw(app, { body: inquiryBody({ teamSize: 0 }) })).status).toBe(400);
    }

    expect((await submitRaw(app, { body: inquiryBody() })).status).toBe(201);
  });

  it('throttles the sixth valid request from one client address in an hour with 429 and Retry-After', async () => {
    const app = await loadApp();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submitRaw(app, { body: inquiryBody({ email: `lead-${attempt}@probe.test` }) })).status).toBe(201);
    }
    const before = (await app.store.getCorporateInquiries()).length;

    const response = await submitRaw(app, { body: inquiryBody({ email: 'lead-limited@probe.test' }) });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toMatch(/^[1-9]\d*$/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(expectContract(errorBody, response.body).error).toMatch(/too many/i);
    expect((await app.store.getCorporateInquiries()).length).toBe(before);
  });

  it('logs one fixed line when the honeypot trips and nothing from the request', async () => {
    const app = await loadApp();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await submitRaw(app, {
      body: inquiryBody({ companyName: 'Leaky Trap Ltd', email: 'leaky@probe.test', [HONEYPOT_FIELD]: 'https://spam.example/secret' }),
      headers: { 'x-forwarded-for': '203.0.113.77' },
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Workshop inquiry honeypot tripped.');
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    const everything = JSON.stringify([...warn.mock.calls, ...log.mock.calls, ...error.mock.calls]);
    for (const secret of ['Leaky Trap', 'leaky@probe.test', 'spam.example', '203.0.113.77', '+972501112233']) {
      expect(everything).not.toContain(secret);
    }
  });

  it('does not log anything for a real submission', async () => {
    const app = await loadApp();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await submitRaw(app, { body: inquiryBody() });

    expect(warn).not.toHaveBeenCalled();
  });

  it('answers 503 no-store when the store fails and logs a fixed line without the submitted data', async () => {
    const app = await loadApp();
    vi.doMock('@/lib/db/store', () => ({
      store: {
        createCorporateInquiry: vi.fn().mockRejectedValue(new Error('insert failed for dana@probe.test +972501112233 Contract Probe Ltd')),
      },
    }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await submitRaw(app, { body: inquiryBody() });

      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(expectContract(errorBody, response.body).error).toBe('Unable to submit your inquiry right now.');
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith('Corporate inquiry creation failed.');
      const logged = JSON.stringify(error.mock.calls);
      for (const secret of ['dana@probe.test', '+972501112233', 'Contract Probe', 'insert failed']) {
        expect(logged).not.toContain(secret);
      }
    } finally {
      vi.doUnmock('@/lib/db/store');
    }
  });

  it('keeps the allowance per client address', async () => {
    const app = await loadApp();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await submitRaw(app, { body: inquiryBody(), headers: { 'x-forwarded-for': '203.0.113.10' } });
    }

    expect((await submitRaw(app, { body: inquiryBody(), headers: { 'x-forwarded-for': '203.0.113.10' } })).status).toBe(429);
    expect((await submitRaw(app, { body: inquiryBody(), headers: { 'x-forwarded-for': '203.0.113.11' } })).status).toBe(201);
  });

  it('fails closed with 503 and no-store when durable rate limiting is unavailable in production', async () => {
    const app = await loadApp({ env: { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '' } });

    const response = await submitRaw(app, { body: inquiryBody() });

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(expectContract(errorBody, response.body).error).toMatch(/temporarily unavailable/i);
  });

  it('fails closed with 503 and stores nothing when the limiter throws, without exposing or logging the failure', async () => {
    const app = await loadApp();
    vi.doMock('@/lib/security/rate-limit', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/security/rate-limit')>();
      return { ...actual, consumeRateLimit: vi.fn().mockRejectedValue(new Error('database password is hunter2')) };
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const before = (await app.store.getCorporateInquiries()).length;
    try {
      const response = await submitRaw(app, { body: inquiryBody() });

      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(JSON.stringify(response.body)).not.toContain('hunter2');
      expect((await app.store.getCorporateInquiries()).length).toBe(before);
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain('hunter2');
    } finally {
      consoleError.mockRestore();
      vi.doUnmock('@/lib/security/rate-limit');
    }
  });

  it('leaves the admin list and status update outside the public controls', async () => {
    const app = await loadApp();
    const created = expectContract(workshopCreated, (await submitInquiry(app, inquiryBody())).body);
    for (let attempt = 0; attempt < 6; attempt += 1) await submitRaw(app, { body: inquiryBody() });
    expect((await submitRaw(app, { body: inquiryBody() })).status).toBe(429);
    const { GET } = await app.routes.workshops();

    const listed = await readJson(await GET(adminRequest('/api/workshops')));
    const patched = await patchInquiry(app, { id: created.id, status: 'quoted' });

    expect(listed.status).toBe(200);
    expect(patched.status).toBe(200);
    expect(expectContract(corporateInquiry, patched.body)).toMatchObject({ id: created.id, status: 'quoted' });
  });
});

describe('GET /api/workshops (admin)', () => {
  it('lists inquiries for an admin under the inquiry contract, privately', async () => {
    const app = await loadApp();
    const created = expectContract(workshopCreated, (await submitInquiry(app, inquiryBody())).body);
    const { GET } = await app.routes.workshops();

    const response = await readJson(await GET(adminRequest('/api/workshops')));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const inquiries = expectContract(corporateInquiry.array(), response.body);
    expect(inquiries[0]).toMatchObject({ id: created.id, companyName: 'Contract Probe Ltd', status: 'new' });
  });

  it('challenges an anonymous caller with 401', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.workshops();

    const response = await readJson(await GET(apiRequest('/api/workshops')));

    expect(response.status).toBe(401);
    expectContract(errorBody, response.body);
  });
});

describe('PATCH /api/workshops (admin)', () => {
  it('moves an inquiry to a new status and returns the full record', async () => {
    const app = await loadApp();
    const created = expectContract(workshopCreated, (await submitInquiry(app, inquiryBody())).body);

    const response = await patchInquiry(app, { id: created.id, status: 'contacted' });

    expect(response.status).toBe(200);
    expect(expectContract(corporateInquiry, response.body)).toMatchObject({ id: created.id, status: 'contacted' });
    expect((await app.store.getCorporateInquiries()).find((inquiry) => inquiry.id === created.id)?.status).toBe('contacted');
  });

  it('answers 404 for an unknown inquiry', async () => {
    const app = await loadApp();

    const response = await patchInquiry(app, { id: 'corp-does-not-exist', status: 'quoted' });

    expect(response.status).toBe(404);
    expect(expectContract(errorBody, response.body).error).toBe('Inquiry not found.');
  });

  it.each([
    { name: 'an unknown status', body: { id: 'corp-01', status: 'won' }, field: 'status' },
    { name: 'a missing id', body: { status: 'quoted' }, field: 'id' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp();

    const response = await patchInquiry(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
  });

  it('challenges an anonymous update with 401 and keeps the status', async () => {
    const app = await loadApp();
    const { PATCH } = await app.routes.workshops();

    const response = await readJson(
      await PATCH(apiRequest('/api/workshops', { method: 'PATCH', body: { id: 'corp-02', status: 'confirmed' } }))
    );

    expect(response.status).toBe(401);
    expect((await app.store.getCorporateInquiries()).find((inquiry) => inquiry.id === 'corp-02')?.status).toBe('new');
  });
});
