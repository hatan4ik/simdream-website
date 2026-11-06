import 'server-only';

import type { VerifiedMemberIdentity } from '@/lib/auth/member-ownership';
import { readWixMemberProfile } from './member-profile';

export type WixMemberIdentity = VerifiedMemberIdentity & { provider: 'wix' };

interface WixMemberApiResponse {
  member?: unknown;
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
    const member = readWixMemberProfile(payload.member);
    if (!member?.email) return null;
    return {
      id: member.id,
      email: member.email,
      emailVerified: member.emailVerified,
      fullName: member.fullName,
      provider: 'wix',
    };
  } catch {
    return null;
  }
}
