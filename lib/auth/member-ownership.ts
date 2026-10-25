export interface VerifiedMemberIdentity {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
}

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A member may claim a booking only after their identity provider has verified
 * the same email address used at checkout. Historical guest records are only
 * attached after payment, preventing a newly created account from exposing an
 * unpaid reservation entered by somebody else.
 */
export function memberIdForBooking(
  member: VerifiedMemberIdentity | null,
  pilotEmail: string
): string | undefined {
  if (!member?.emailVerified) return undefined;
  return normalizeMemberEmail(member.email) === normalizeMemberEmail(pilotEmail)
    ? member.id
    : undefined;
}

export function memberOwnsBooking(memberId: string, bookingUserId?: string): boolean {
  return Boolean(bookingUserId && bookingUserId === memberId);
}
