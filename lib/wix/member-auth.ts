import 'server-only';

import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';

export type WixMemberIdentity = VerifiedMemberIdentity & { provider: 'wix' };

interface WixMemberApiResponse {
  member?: {
    id?: unknown;
    _id?: unknown;
    loginEmail?: unknown;
    loginEmailVerified?: unknown;
    profile?: { nickname?: unknown; firstName?: unknown; lastName?: unknown };
    contact?: { firstName?: unknown; lastName?: unknown };
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Verifies a short-lived member bearer token by asking Wix for the caller's own
 * member record. This is the server boundary for Wix identity: browser-supplied
 * email and member IDs are intentionally ignored.
 */
export async function getWixMemberIdentity(accessToken: string): Promise<WixMemberIdentity | null> {
  // OAuth member tokens are signed credentials, not short user identifiers.
  // Reject obviously malformed values before they can induce an outbound call.
  if (accessToken.length < 64 || accessToken.length > 8_192) return null;
  try {
    const response = await fetch('https://www.wixapis.com/members/v1/members/my?fieldSet=FULL', {
      // Wix SDK's OAuth strategy sends the access token itself in this header
      // (not a browser-style `Bearer` prefix). Keep that server-side contract
      // aligned with the authenticated Wix client.
      headers: { Authorization: accessToken },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as WixMemberApiResponse;
    const member = payload.member;
    const id = stringValue(member?.id) ?? stringValue(member?._id);
    const email = stringValue(member?.loginEmail);
    if (!id || !email) return null;
    const nickname = stringValue(member?.profile?.nickname);
    const firstName = stringValue(member?.profile?.firstName) ?? stringValue(member?.contact?.firstName);
    const lastName = stringValue(member?.profile?.lastName) ?? stringValue(member?.contact?.lastName);
    return {
      id,
      email,
      emailVerified: member?.loginEmailVerified === true,
      fullName: nickname ?? ([firstName, lastName].filter(Boolean).join(' ') || undefined),
      provider: 'wix',
    };
  } catch {
    return null;
  }
}
