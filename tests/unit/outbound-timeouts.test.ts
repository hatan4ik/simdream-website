import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A hung upstream must not hang the visitor: idempotent reads carry a deadline. Writes that create something
// (a cart, a Stripe session) deliberately do not, so a client-side abort can never orphan one.

const fetchWithAuth = vi.hoisted(() => vi.fn());

vi.mock('@wix/sdk', () => ({
  createClient: () => ({ fetchWithAuth }),
  OAuthStrategy: () => ({}),
}));
vi.mock('@wix/redirects', () => ({ redirects: {} }));

const VALID_MEMBER_TOKEN = 'wix-member-token.' + 'x'.repeat(96);
const timeoutError = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_WIX_CLIENT_ID', 'test-client-id');
  fetchWithAuth.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('wixPost', () => {
  it('gives a read a deadline and passes the signal to the Wix client', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    fetchWithAuth.mockResolvedValue(Response.json({ ok: true }));
    const { wixPost, resetWixClientForTests } = await import('@/lib/wix/client');
    resetWixClientForTests();

    await wixPost('https://www.wixapis.com/x', { a: 1 }, { timeoutMs: 8_000 });

    expect(spy).toHaveBeenCalledWith(8_000);
    expect(fetchWithAuth.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('adds no deadline unless the caller asks for one, so a write is never aborted on the client', async () => {
    fetchWithAuth.mockResolvedValue(Response.json({ ok: true }));
    const { wixPost, resetWixClientForTests } = await import('@/lib/wix/client');
    resetWixClientForTests();

    await wixPost('https://www.wixapis.com/x', { a: 1 });

    expect(fetchWithAuth.mock.calls[0][1].signal).toBeUndefined();
  });

  it('reports a timed-out read as a 504 WixApiError so callers treat it like any upstream failure', async () => {
    fetchWithAuth.mockRejectedValue(timeoutError());
    const { wixPost, WixApiError, resetWixClientForTests } = await import('@/lib/wix/client');
    resetWixClientForTests();

    const failure: unknown = await wixPost('https://www.wixapis.com/x', {}, { timeoutMs: 8_000 }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(WixApiError);
    expect((failure as InstanceType<typeof WixApiError>).status).toBe(504);
  });
});

describe('Wix member reads', () => {
  it('verifies a member token with a 5 s deadline and treats a timeout as unauthenticated', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.fn().mockRejectedValue(timeoutError());
    vi.stubGlobal('fetch', fetchMock);
    const { getWixMemberIdentity } = await import('@/lib/wix/member-auth');

    await expect(getWixMemberIdentity(VALID_MEMBER_TOKEN)).resolves.toBeNull();

    expect(spy).toHaveBeenCalledWith(5_000);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('reads the member calendar with an 8 s deadline', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ events: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { listWixMemberBookings } = await import('@/lib/wix/member-bookings');

    await listWixMemberBookings(VALID_MEMBER_TOKEN, new Date('2026-11-10T12:00:00Z'));

    expect(spy).toHaveBeenCalledWith(8_000);
    for (const call of fetchMock.mock.calls) expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });
});

describe('Google reads', () => {
  it('asks Google Places and Cloud Translation with a deadline', async () => {
    const { fetchNewestGoogleReviews } = await import('@/lib/reviews/google-reviews-source');
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('translate')) {
        return Response.json({ data: { translations: [{ translatedText: 'translated', detectedSourceLanguage: 'en' }] } });
      }
      return Response.json({
        status: 'OK',
        result: {
          rating: 5,
          user_ratings_total: 1,
          reviews: [{ author_name: 'A', text: 'Great', rating: 5, time: 1_700_000_000, language: 'en', original_language: 'he' }],
        },
      });
    });

    await fetchNewestGoogleReviews({ key: 'k', fetchImpl });

    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    for (const call of fetchImpl.mock.calls) expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });
});
