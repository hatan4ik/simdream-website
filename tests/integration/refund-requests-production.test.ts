import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { MAIL_ENV } from '../reliability/helpers';
import { mockFakeRefundSupabase } from '../support/fake-refund-supabase';

/**
 * Production rules for POST /api/refund-requests: Supabase storage, email-only operation (a Wix
 * worker without Supabase), and the fail-closed 503 when nothing durable can happen.
 */
const PRODUCTION = { NODE_ENV: 'production', ALLOW_IN_MEMORY_STORE: '', NEXT_PUBLIC_APP_URL: 'https://qa.simdream.test' };

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
    reason: 'change_of_plans',
    acceptedTruth: true,
    acceptedRules: true,
    ...overrides,
  };
}

async function post(body: unknown) {
  const { POST } = await import('@/app/api/refund-requests/route');
  return readJson<Record<string, unknown>>(await POST(apiRequest('/api/refund-requests', { body })));
}

function mockMail(options: { failStaff?: boolean } = {}) {
  const sent: Array<{ to: string; subject: string }> = [];
  const send = vi.fn(async (message: { to: string; subject: string }) => {
    if (options.failStaff && message.to === 'desk@simdream.co.il') throw new Error('SendGrid responded 503');
    sent.push(message);
    return [{ statusCode: 202 }, {}];
  });
  vi.doMock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send } }));
  return sent;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.doUnmock('@sendgrid/mail');
  vi.doUnmock('@/lib/db/supabase-admin');
});

describe('fail closed', () => {
  it('answers 503 with the desk contact, and stores and sends nothing, when neither storage nor email exists', async () => {
    const send = vi.fn();
    vi.doMock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send } }));
    await loadApp({ env: PRODUCTION });

    const response = await post(submission());

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Refund requests are temporarily unavailable. Nothing was sent.',
      contact: { email: 'desk@simdream.co.il', phone: '+972-55-507-1307', whatsapp: 'https://wa.me/972555071307' },
    });
    expect(response.body).not.toHaveProperty('reference');
    expect(send).not.toHaveBeenCalled();
    const server = await import('@/lib/refund/server');
    expect(server.refundStorageMode()).toBe('none');
    await expect(server.listRefundRequests()).rejects.toThrow();
  });

  it('answers 503 when email is the only channel and it fails', async () => {
    mockMail({ failStaff: true });
    await loadApp({ env: { ...PRODUCTION, ...MAIL_ENV } });

    const response = await post(submission());

    expect(response.status).toBe(503);
    expect(response.body).not.toHaveProperty('reference');
  });

  it('answers 503 when the database fails and email is not configured', async () => {
    const database = mockFakeRefundSupabase();
    database.failNextInsert = true;
    await loadApp({ env: { ...PRODUCTION, SUPABASE_SERVICE_ROLE_KEY: 'qa-key', NEXT_PUBLIC_SUPABASE_URL: 'https://qa.supabase.test' } });

    const response = await post(submission());

    expect(response.status).toBe(503);
    expect(database.rows).toHaveLength(0);
  });

  it('keeps the order check working without storage: unverified, never a server error', async () => {
    await loadApp({ env: PRODUCTION });
    const { POST } = await import('@/app/api/refund-requests/lookup/route');
    const response = await readJson(
      await POST(apiRequest('/api/refund-requests/lookup', { body: { productKind: 'flight', orderReference: 'SD-737-AAAAAAAAAAAAAAAA', email: 'a@b.test' } }))
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ verified: false });
  });

  it('keeps taking requests when the durable rate limiter is unavailable (best-effort limiter, still 429 on abuse)', async () => {
    mockMail();
    await loadApp({ env: { ...PRODUCTION, ...MAIL_ENV } });
    for (let index = 0; index < 4; index += 1) expect((await post(submission())).status).toBe(201);
    expect((await post(submission())).status).toBe(429);
  });
});

describe('email only (a worker without Supabase)', () => {
  it('counts as received once the desk was emailed, and says whether the customer got a copy', async () => {
    const sent = mockMail();
    await loadApp({ env: { ...PRODUCTION, ...MAIL_ENV } });

    const response = await post(submission());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ acknowledged: true, duplicate: false });
    expect(String(response.body.reference)).toMatch(/^RF-[A-HJ-NP-Z2-9]{6}$/);
    expect(sent.map((mail) => mail.to).sort()).toEqual(['dana@pilots.test', 'desk@simdream.co.il']);
    expect(sent.find((mail) => mail.to === 'desk@simdream.co.il')?.subject).toContain(String(response.body.reference));
  });
});

describe('Supabase storage', () => {
  const SUPABASE = { SUPABASE_SERVICE_ROLE_KEY: 'qa-key', NEXT_PUBLIC_SUPABASE_URL: 'https://qa.supabase.test' };

  it('inserts one row in the migration 010 shape and marks the emails', async () => {
    const database = mockFakeRefundSupabase();
    mockMail();
    await loadApp({ env: { ...PRODUCTION, ...SUPABASE, ...MAIL_ENV } });

    const response = await post(submission({ message: 'Hello', sessionTime: '18:30' }));

    expect(response.status).toBe(201);
    expect(database.rows).toHaveLength(1);
    const row = database.rows[0];
    expect(row).toMatchObject({
      reference: response.body.reference,
      status: 'new',
      product_kind: 'flight',
      reason: 'change_of_plans',
      order_reference: 'WIX-10234',
      contact_email: 'dana@pilots.test',
      session_date: '2026-11-20',
      session_time: '18:30',
      verification: 'unverified',
      message: 'Hello',
      language: 'en',
      priority: 'normal',
    });
    expect(row.staff_notified_at).not.toBeNull();
    expect(row.customer_acknowledged_at).not.toBeNull();
    expect(row.evaluation).toMatchObject({ outcome: 'full_refund_possible', needsStaffConfirmation: true });
  });

  it('treats a retry with the same clientRequestId as the same request, without sending mail twice', async () => {
    const database = mockFakeRefundSupabase();
    const sent = mockMail();
    await loadApp({ env: { ...PRODUCTION, ...SUPABASE, ...MAIL_ENV } });
    const body = submission();

    const first = await post(body);
    const second = await post(body);

    expect(second.body).toMatchObject({ reference: first.body.reference, duplicate: true });
    expect(database.rows).toHaveLength(1);
    expect(sent).toHaveLength(2);
  });

  it('draws a new reference when the generated one is already taken', async () => {
    const database = mockFakeRefundSupabase();
    const sequence = ['RF-AAAAAA', 'RF-AAAAAA', 'RF-BBBBBB'];
    vi.doMock('@/lib/refund/refund-reference', () => ({
      REFUND_REFERENCE_PATTERN: /^RF-[A-HJ-NP-Z2-9]{6}$/,
      generateRefundReference: () => sequence.shift() ?? 'RF-CCCCCC',
    }));
    await loadApp({ env: { ...PRODUCTION, ...SUPABASE } });

    // buildRecord draws the first reference for the first request ...
    expect((await post(submission({ email: 'one@pilots.test' }))).body.reference).toBe('RF-AAAAAA');
    // ... and the second request's first draw clashes, so the service draws again.
    const second = await post(submission({ email: 'two@pilots.test' }));

    expect(second.status).toBe(201);
    expect(second.body.reference).toBe('RF-BBBBBB');
    expect(database.rows.map((row) => row.reference).sort()).toEqual(['RF-AAAAAA', 'RF-BBBBBB']);
    vi.doUnmock('@/lib/refund/refund-reference');
  });

  it('never logs the database message, which can quote personal data', async () => {
    const database = mockFakeRefundSupabase();
    database.failNextInsert = true;
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await loadApp({ env: { ...PRODUCTION, ...SUPABASE } });

    await post(submission());

    expect(JSON.stringify(errors.mock.calls)).not.toContain('secret@example.test');
    expect(errors.mock.calls.some((call) => call.includes('08006'))).toBe(true);
  });
});
