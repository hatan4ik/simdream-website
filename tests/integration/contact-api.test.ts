import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readJson } from '../support/http';
import { errorBody, expectContract, validationErrorBody } from './contracts';

const contactInquiry = {
  name: 'Dana Probe',
  email: 'dana@probe.test',
  phone: '+972501112233',
  subject: 'World Route or Adventure Request',
  message: 'Please help us plan a 90-minute flight experience.',
};

async function submitContact(
  body: unknown,
  options: {
    result?: { success: boolean; message: string };
    headers?: Record<string, string>;
    rawBody?: string;
    rateDecision?: { allowed: boolean; retryAfterSeconds: number };
    rateFailure?: 'unavailable' | 'unexpected';
  } = {}
) {
  vi.resetModules();
  const sendContactInquiryEmail = vi.fn(async () => options.result ?? { success: true, message: 'Delivered.' });
  class RateLimitUnavailableError extends Error {}
  const consumeRateLimit = vi.fn(async () => {
    if (options.rateFailure === 'unavailable') throw new RateLimitUnavailableError();
    if (options.rateFailure === 'unexpected') throw new Error('rate limiter connection reset');
    return options.rateDecision ?? { allowed: true, retryAfterSeconds: 1 };
  });
  vi.doMock('@/lib/sendgrid', () => ({ sendContactInquiryEmail }));
  vi.doMock('@/lib/security/rate-limit', () => ({
    consumeRateLimit,
    rateLimitClientAddress: () => '203.0.113.24',
    rateLimitHeaders: (decision: { retryAfterSeconds: number }) => ({
      'Retry-After': String(decision.retryAfterSeconds),
      'Cache-Control': 'no-store',
    }),
    RateLimitUnavailableError,
  }));
  const { POST } = await import('@/app/api/contact/route');
  const response = await readJson(
    await POST(
      apiRequest('/api/contact', {
        body: options.rawBody === undefined ? body : undefined,
        rawBody: options.rawBody,
        headers: options.headers,
      })
    )
  );
  return { response, sendContactInquiryEmail, consumeRateLimit };
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('delivers a valid inquiry and returns only an acceptance acknowledgement', async () => {
    const { response, sendContactInquiryEmail } = await submitContact({ ...contactInquiry, name: '  Dana Probe  ' });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ accepted: true });
    expect(sendContactInquiryEmail).toHaveBeenCalledWith({ ...contactInquiry });
  });

  it('rejects invalid input without attempting delivery', async () => {
    const { response, sendContactInquiryEmail } = await submitContact({ ...contactInquiry, email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain('email');
    expect(sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  it('fails closed when delivery is unavailable and never exposes the provider error', async () => {
    const { response } = await submitContact(contactInquiry, { result: { success: false, message: 'provider socket ECONNRESET' } });

    expect(response.status).toBe(503);
    expect(expectContract(errorBody, response.body).error).toBe('Unable to deliver your message right now. Please try again later.');
  });

  it('rejects malformed JSON without attempting delivery', async () => {
    const { response, sendContactInquiryEmail } = await submitContact(contactInquiry, {
      rawBody: '{',
      headers: { 'content-type': 'application/json' },
    });

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
    expect(sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  it('rejects form posts and oversized bodies before rate limiting or delivery', async () => {
    const formPost = await submitContact(contactInquiry, {
      rawBody: 'name=Dana+Probe',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(formPost.response.status).toBe(415);
    expect(expectContract(errorBody, formPost.response.body).error).toBe('Send the request as application/json.');
    expect(formPost.consumeRateLimit).not.toHaveBeenCalled();
    expect(formPost.sendContactInquiryEmail).not.toHaveBeenCalled();

    const declaredTooLarge = await submitContact(contactInquiry, {
      headers: { 'content-length': '8193' },
    });
    expect(declaredTooLarge.response.status).toBe(413);
    expect(expectContract(errorBody, declaredTooLarge.response.body).error).toBe('Request body is too large.');
    expect(declaredTooLarge.consumeRateLimit).not.toHaveBeenCalled();
    expect(declaredTooLarge.sendContactInquiryEmail).not.toHaveBeenCalled();

    const actualTooLarge = await submitContact(contactInquiry, {
      rawBody: JSON.stringify({ ...contactInquiry, message: 'x'.repeat(8_193) }),
      headers: { 'content-type': 'application/json' },
    });
    expect(actualTooLarge.response.status).toBe(413);
    expect(expectContract(errorBody, actualTooLarge.response.body).error).toBe('Request body is too large.');
    expect(actualTooLarge.consumeRateLimit).not.toHaveBeenCalled();
    expect(actualTooLarge.sendContactInquiryEmail).not.toHaveBeenCalled();
  });

  it('throttles repeated messages and fails closed when rate-limit persistence is unavailable', async () => {
    const throttled = await submitContact(contactInquiry, {
      rateDecision: { allowed: false, retryAfterSeconds: 321 },
    });
    expect(throttled.response.status).toBe(429);
    expect(expectContract(errorBody, throttled.response.body).error).toBe('Too many messages. Please wait and try again later.');
    expect(throttled.response.headers.get('retry-after')).toBe('321');
    expect(throttled.sendContactInquiryEmail).not.toHaveBeenCalled();

    const unavailable = await submitContact(contactInquiry, { rateFailure: 'unavailable' });
    expect(unavailable.response.status).toBe(503);
    expect(expectContract(errorBody, unavailable.response.body).error).toBe(
      'Messages are temporarily unavailable. Please try again later.'
    );
    expect(unavailable.sendContactInquiryEmail).not.toHaveBeenCalled();

    const unexpectedFailure = await submitContact(contactInquiry, { rateFailure: 'unexpected' });
    expect(unexpectedFailure.response.status).toBe(503);
    expect(expectContract(errorBody, unexpectedFailure.response.body).error).toBe(
      'Messages are temporarily unavailable. Please try again later.'
    );
    expect(unexpectedFailure.sendContactInquiryEmail).not.toHaveBeenCalled();
  });
});
