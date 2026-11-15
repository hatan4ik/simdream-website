import 'server-only';

import { normalizeMemberEmail } from '@/lib/auth/member-ownership';

/**
 * Binds a Wix pricing claim to the pilot's contact, so a claim works only for the booking of the
 * contact it was issued for (docs/WIX_BIRTHDAY_PRICING_PROVIDER.md, "Identity binding").
 *
 * An issued claim embeds keyed digests, never the contact itself: HMAC-SHA-256 with the claim
 * secret, base64url, of `email:<normalized email>` and, when the phone has digits,
 * `phone:<digits>`. The provider recomputes every form of the booking's `contactDetails` and the
 * claim matches when any one of them equals one of the keys.
 */

/** The contact block of the Wix booking that the pricing provider receives. */
export interface WixPricingContactDetails {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

/** The contact a claim is issued for: the email is required, the phone optional. */
export interface BirthdayClaimContact {
  email: string;
  phone?: string;
}

function phoneDigits(phone: unknown): string {
  return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
}

/** Every form of the booking's email and phone a claim key may have been derived from. */
function contactCandidates(contactDetails: WixPricingContactDetails): string[] {
  const candidates = new Set<string>();
  const email = typeof contactDetails.email === 'string' ? normalizeMemberEmail(contactDetails.email) : '';
  if (email) {
    candidates.add(email);
    candidates.add(`email:${email}`);
  }
  const digits = phoneDigits(contactDetails.phone);
  if (digits) {
    candidates.add(digits);
    candidates.add(`phone:${digits}`);
    // An Israeli number matches in its international (972…) and its local (0…) form.
    if (digits.startsWith('972') && digits.length >= 11) {
      const local = `0${digits.slice(3)}`;
      candidates.add(local);
      candidates.add(`phone:${local}`);
    } else if (digits.startsWith('0') && digits.length === 10) {
      const intl = `972${digits.slice(1)}`;
      candidates.add(intl);
      candidates.add(`phone:${intl}`);
    }
  }
  return [...candidates];
}

async function hmacSha256Digests(secret: string, value: string): Promise<{ hex: string; base64url: string }> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  let hex = '';
  let binary = '';
  for (const byte of signature) {
    hex += byte.toString(16).padStart(2, '0');
    binary += String.fromCharCode(byte);
  }
  return { hex, base64url: btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') };
}

/** The identity keys a newly issued claim embeds for this contact. */
export async function birthdayClaimIdentityKeys(contact: BirthdayClaimContact, secret: string): Promise<string[]> {
  const keys = [(await hmacSha256Digests(secret, `email:${normalizeMemberEmail(contact.email)}`)).base64url];
  const digits = phoneDigits(contact.phone);
  if (digits) keys.push((await hmacSha256Digests(secret, `phone:${digits}`)).base64url);
  return keys;
}

/** True when any form of the booking's email or phone matches one of the claim's identity keys. */
export async function contactMatchesIdentityKeys(
  contactDetails: WixPricingContactDetails,
  identityKeys: readonly string[],
  secret: string
): Promise<boolean> {
  const keySet = new Set(identityKeys);
  for (const candidate of contactCandidates(contactDetails)) {
    if (keySet.has(candidate)) return true;
    const { hex, base64url } = await hmacSha256Digests(secret, candidate);
    if (keySet.has(hex) || keySet.has(base64url)) return true;
  }
  return false;
}
