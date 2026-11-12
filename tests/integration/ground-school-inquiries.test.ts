import { describe, expect, it, vi } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { adminRequest, PRIVATE_NO_STORE } from './api-helpers';
import {
  errorBody,
  expectContract,
  groundSchoolInquiry,
  groundSchoolInquiryCreated,
  validationErrorBody,
} from './contracts';

function inquiryBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Dana Candidate',
    email: 'dana.candidate@example.test',
    phone: '+972501112233',
    pathway: 'faa',
    modality: 'hybrid',
    focusTopics: 'Weather charts and oral-answer practice.',
    consent: true,
    ...overrides,
  };
}

async function submit(app: TestApp, body: unknown) {
  const { POST } = await app.routes.groundSchoolInquiries();
  return readJson(await POST(apiRequest('/api/ground-school/inquiries', { body })));
}

describe('POST /api/ground-school/inquiries (public cohort-details request)', () => {
  it('persists a consented request without accepting a price, payment or seat', async () => {
    const app = await loadApp();

    const response = await submit(app, inquiryBody({ fullName: '  Dana Candidate  ' }));

    expect(response.status).toBe(201);
    const created = expectContract(groundSchoolInquiryCreated, response.body);
    const stored = (await app.store.getGroundSchoolInquiries()).find((inquiry) => inquiry.id === created.id);
    expect(stored).toMatchObject({
      fullName: 'Dana Candidate',
      email: 'dana.candidate@example.test',
      phone: '+972501112233',
      pathway: 'faa',
      modality: 'hybrid',
      focusTopics: 'Weather charts and oral-answer practice.',
      status: 'new',
    });
    expect(stored).not.toHaveProperty('consent');
    expect(stored?.consentAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it.each([
    { name: 'missing consent', overrides: { consent: false }, field: 'consent' },
    { name: 'an unknown pathway', overrides: { pathway: 'caa' }, field: 'pathway' },
    { name: 'an unknown format', overrides: { modality: 'remote' }, field: 'modality' },
    { name: 'an invalid email', overrides: { email: 'not-an-email' }, field: 'email' },
    { name: 'a blank name', overrides: { fullName: '  ' }, field: 'fullName' },
    { name: 'too much focus text', overrides: { focusTopics: 'x'.repeat(2_001) }, field: 'focusTopics' },
  ])('rejects $name without storing the request', async ({ overrides, field }) => {
    const app = await loadApp();
    const before = (await app.store.getGroundSchoolInquiries()).length;

    const response = await submit(app, inquiryBody(overrides));

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
    expect((await app.store.getGroundSchoolInquiries()).length).toBe(before);
  });

  it('rejects malformed JSON before it can become a coordinator request', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.groundSchoolInquiries();

    const response = await readJson(await POST(apiRequest('/api/ground-school/inquiries', { method: 'POST', rawBody: '{' })));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });

  it('throttles the sixth valid request from one client address', async () => {
    const app = await loadApp();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await submit(app, inquiryBody({ email: `candidate-${attempt}@example.test` }));
      expect(response.status).toBe(201);
    }

    const response = await submit(app, inquiryBody({ email: 'candidate-limited@example.test' }));

    expect(response.status).toBe(429);
    expect(expectContract(errorBody, response.body).error).toMatch(/too many/i);
    expect(response.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('fails closed when durable rate limiting is unavailable in production', async () => {
    const app = await loadApp({ env: { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '' } });

    const response = await submit(app, inquiryBody());

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toMatch(/temporarily unavailable/i);
  });

  it('fails closed without exposing an unexpected rate-limiter failure', async () => {
    const app = await loadApp();
    vi.doMock('@/lib/security/rate-limit', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/security/rate-limit')>();
      return { ...actual, consumeRateLimit: vi.fn().mockRejectedValue(new Error('rate limiter unavailable')) };
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { POST } = await app.routes.groundSchoolInquiries();
      const response = await readJson(await POST(apiRequest('/api/ground-school/inquiries', { body: inquiryBody() })));

      expect(response.status).toBe(503);
      expect(expectContract(errorBody, response.body).error).toMatch(/temporarily unavailable/i);
      expect(consoleError).toHaveBeenCalledWith('Ground School rate limiter failed', expect.any(Error));
    } finally {
      consoleError.mockRestore();
      vi.doUnmock('@/lib/security/rate-limit');
    }
  });

  it('does not pretend a request was accepted if persistent storage rejects it', async () => {
    const app = await loadApp();
    vi.doMock('@/lib/db/store', () => ({
      store: { createGroundSchoolInquiry: vi.fn().mockRejectedValue(new Error('database unavailable')) },
    }));
    try {
      const { POST } = await app.routes.groundSchoolInquiries();
      const response = await readJson(await POST(apiRequest('/api/ground-school/inquiries', { body: inquiryBody() })));

      expect(response.status).toBe(503);
      expect(expectContract(errorBody, response.body).error).toMatch(/unable to send/i);
    } finally {
      vi.doUnmock('@/lib/db/store');
    }
  });
});

describe('Ground School inquiry dispatch access', () => {
  it('keeps applicant data private but makes it available to an admin without caching', async () => {
    const app = await loadApp();
    const created = expectContract(groundSchoolInquiryCreated, (await submit(app, inquiryBody())).body);
    const { GET } = await app.routes.groundSchoolInquiries();

    const adminResponse = await readJson(await GET(adminRequest('/api/ground-school/inquiries')));
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    expect(expectContract(groundSchoolInquiry.array(), adminResponse.body)[0]).toMatchObject({ id: created.id, status: 'new' });

    const publicResponse = await readJson(await GET(apiRequest('/api/ground-school/inquiries')));
    expect(publicResponse.status).toBe(401);
    expectContract(errorBody, publicResponse.body);
  });

  it('allows only an admin to move a request through the coordinator workflow', async () => {
    const app = await loadApp();
    const created = expectContract(groundSchoolInquiryCreated, (await submit(app, inquiryBody())).body);
    const { PATCH } = await app.routes.groundSchoolInquiries();

    const response = await readJson(
      await PATCH(adminRequest('/api/ground-school/inquiries', { method: 'PATCH', body: { id: created.id, status: 'contacted' } }))
    );
    expect(response.status).toBe(200);
    expect(expectContract(groundSchoolInquiry, response.body)).toMatchObject({ id: created.id, status: 'contacted' });

    const denied = await readJson(
      await PATCH(apiRequest('/api/ground-school/inquiries', { method: 'PATCH', body: { id: created.id, status: 'closed' } }))
    );
    expect(denied.status).toBe(401);
    expectContract(errorBody, denied.body);
  });

  it('validates updates, reports missing requests, and does not expose malformed request handling', async () => {
    const app = await loadApp();
    const { PATCH } = await app.routes.groundSchoolInquiries();

    const invalidJson = await readJson(
      await PATCH(adminRequest('/api/ground-school/inquiries', { method: 'PATCH', rawBody: '{' }))
    );
    expect(invalidJson.status).toBe(400);
    expect(expectContract(errorBody, invalidJson.body).error).toBe('Invalid JSON request body.');

    const invalidStatus = await readJson(
      await PATCH(adminRequest('/api/ground-school/inquiries', { method: 'PATCH', body: { id: 'inquiry-01', status: 'paid' } }))
    );
    expect(invalidStatus.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, invalidStatus.body).fields)).toContain('status');

    const missing = await readJson(
      await PATCH(adminRequest('/api/ground-school/inquiries', { method: 'PATCH', body: { id: 'inquiry-does-not-exist', status: 'closed' } }))
    );
    expect(missing.status).toBe(404);
    expect(expectContract(errorBody, missing.body).error).toBe('Inquiry not found.');
  });

  it('fails closed when the production coordinator store is unavailable', async () => {
    const app = await loadApp({ env: { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '' } });
    const { GET, PATCH } = await app.routes.groundSchoolInquiries();

    const list = await readJson(await GET(adminRequest('/api/ground-school/inquiries')));
    expect(list.status).toBe(503);
    expectContract(errorBody, list.body);

    const update = await readJson(
      await PATCH(adminRequest('/api/ground-school/inquiries', { method: 'PATCH', body: { id: 'inquiry-01', status: 'closed' } }))
    );
    expect(update.status).toBe(503);
    expectContract(errorBody, update.body);
  });
});
