/**
 * Safe, shared projection of Wix's current-member response.
 *
 * A Wix member ID establishes browser identity. An email is valuable for
 * purchase matching, but a Google-linked member can expose it through the
 * contact record instead of `loginEmail`, so the UI must not mistake a member
 * with a missing display email for an anonymous visitor.
 */
export interface WixMemberProfile {
  id: string;
  email?: string;
  emailVerified: boolean;
  fullName?: string;
  phone?: string;
  createdAt?: string;
}

interface WixMemberValue {
  _id?: unknown;
  id?: unknown;
  loginEmail?: unknown;
  loginEmailVerified?: unknown;
  profile?: { nickname?: unknown; firstName?: unknown; lastName?: unknown };
  contact?: {
    firstName?: unknown;
    lastName?: unknown;
    phones?: unknown;
    emails?: unknown;
  };
  _createdDate?: unknown;
  createdDate?: unknown;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstString(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    const string = stringValue(item);
    if (string) return string;
    if (item && typeof item === 'object' && 'value' in item) {
      const nested = stringValue(item.value);
      if (nested) return nested;
    }
    if (item && typeof item === 'object' && 'email' in item) {
      const nested = stringValue(item.email);
      if (nested) return nested;
    }
    if (item && typeof item === 'object' && 'phone' in item) {
      const nested = stringValue(item.phone);
      if (nested) return nested;
    }
  }
  return undefined;
}

function dateValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  return undefined;
}

/**
 * Converts only data returned by Wix's authenticated current-member APIs.
 * It deliberately returns `null` only when the immutable member ID is absent.
 */
export function readWixMemberProfile(member: unknown): WixMemberProfile | null {
  if (!member || typeof member !== 'object') return null;
  const value = member as WixMemberValue;
  const id = stringValue(value._id) ?? stringValue(value.id);
  if (!id) return null;

  const email = stringValue(value.loginEmail) ?? firstString(value.contact?.emails);
  const firstName = stringValue(value.profile?.firstName) ?? stringValue(value.contact?.firstName);
  const lastName = stringValue(value.profile?.lastName) ?? stringValue(value.contact?.lastName);
  const nickname = stringValue(value.profile?.nickname);
  const fullName = nickname ?? ([firstName, lastName].filter(Boolean).join(' ') || undefined);

  return {
    id,
    email,
    emailVerified: value.loginEmailVerified === true,
    fullName,
    phone: firstString(value.contact?.phones),
    createdAt: dateValue(value._createdDate) ?? dateValue(value.createdDate),
  };
}
