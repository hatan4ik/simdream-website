import { describe, expect, it } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
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

    const response = await readJson(await POST(apiRequest('/api/workshops', { method: 'POST', rawBody: '{' })));

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
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
