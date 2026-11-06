import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_MEMBER_TOKEN = 'wix-member-token.' + 'x'.repeat(96);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Wix member identity verification', () => {
  it('verifies the caller with Wix and never accepts a browser-supplied profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        member: {
          id: 'wix-member-123',
          loginEmail: 'captain@example.test',
          loginEmailVerified: true,
          profile: { firstName: 'Captain', lastName: 'Test' },
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { getWixMemberIdentity } = await import('@/lib/wix/member-auth');

    await expect(getWixMemberIdentity(VALID_MEMBER_TOKEN)).resolves.toEqual({
      id: 'wix-member-123',
      email: 'captain@example.test',
      emailVerified: true,
      fullName: 'Captain Test',
      provider: 'wix',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.wixapis.com/members/v1/members/my?fieldSet=FULL',
      expect.objectContaining({ headers: { Authorization: VALID_MEMBER_TOKEN } })
    );
  });

  it('rejects an obviously malformed credential without an outbound request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { getWixMemberIdentity } = await import('@/lib/wix/member-auth');

    await expect(getWixMemberIdentity('forged.jwt.token')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when Wix rejects a signed-looking token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const { getWixMemberIdentity } = await import('@/lib/wix/member-auth');

    await expect(getWixMemberIdentity(VALID_MEMBER_TOKEN)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts the verified contact email that Wix returns for a Google-linked member', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        member: {
          _id: 'wix-google-123',
          loginEmailVerified: true,
          profile: { nickname: 'Google Captain' },
          contact: { emails: ['captain@gmail.example'] },
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { getWixMemberIdentity } = await import('@/lib/wix/member-auth');

    await expect(getWixMemberIdentity(VALID_MEMBER_TOKEN)).resolves.toEqual({
      id: 'wix-google-123',
      email: 'captain@gmail.example',
      emailVerified: true,
      fullName: 'Google Captain',
      provider: 'wix',
    });
  });
});
