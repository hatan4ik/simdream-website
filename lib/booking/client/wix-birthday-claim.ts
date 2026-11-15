import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import type { WixBirthdayPricingClaimField } from '@/lib/wix/booking-additional-fields';

/**
 * Browser side of `POST /api/wix/birthday/claim`. The server binds the claim it issues to the
 * pilot's contact, so the request carries the email (normalized as the server normalizes it) and the
 * phone the booking form holds; the Wix booking later carries the same contact and the pricing
 * provider prices the claim only for it.
 */
export interface WixBirthdayClaimRequestInput {
  packageId: string;
  /** The full date of birth, held in browser memory only; the server keeps month and day. */
  birthDate: string;
  flightDate: string;
  pilotEmail: string;
  pilotPhone?: string;
}

/** The pilot contact the booking page passes when it asks for a claim. */
export interface WixBirthdayClaimPilot {
  email: string;
  phone: string;
}

export function wixBirthdayClaimRequestBody(input: WixBirthdayClaimRequestInput): Record<string, string> {
  const phone = input.pilotPhone?.trim();
  return {
    packageId: input.packageId,
    birthDate: input.birthDate,
    flightDate: input.flightDate,
    email: normalizeMemberEmail(input.pilotEmail),
    ...(phone ? { phone } : {}),
  };
}

/** Exchanges the request for the opaque claim field; throws `failureMessage` for any other answer, a 429 included. */
export async function requestWixBirthdayPricingClaim(
  input: WixBirthdayClaimRequestInput,
  failureMessage: string
): Promise<WixBirthdayPricingClaimField> {
  const response = await fetch('/api/wix/birthday/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wixBirthdayClaimRequestBody(input)),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object') throw new Error(failureMessage);
  const { applied, fieldId, token } = data as { applied?: unknown; fieldId?: unknown; token?: unknown };
  if (applied !== true || typeof fieldId !== 'string' || typeof token !== 'string') throw new Error(failureMessage);
  return { fieldId, token };
}
