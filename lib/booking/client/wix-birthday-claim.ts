import { normalizeMemberEmail } from '@/lib/auth/member-ownership';
import type { WixBirthdayPricingClaimField } from '@/lib/wix/booking-additional-fields';

/**
 * Browser side of `POST /api/wix/birthday/claim`. The server binds the claim it issues to the
 * pilot's contact, so the request carries the email (normalized as the server normalizes it) and the
 * phone the booking form holds; the Wix booking later carries the same contact and the pricing
 * provider prices the claim only for it.
 *
 * The server issues at most 5 claims per email per hour, and every new Wix draft (a changed slot,
 * notes, an applied code) asks for one. A claim depends only on the package, flight date, birthday
 * and contact, so the browser keeps the last one in memory (never in storage or a URL) and reuses
 * it while those are unchanged and it is comfortably unexpired.
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

/**
 * A claim lives 10 minutes on the server. The browser reuses one for at most 5, counted on its own
 * clock from when it asked, so a reused claim still has at least 5 minutes left whatever the clock skew.
 */
export const WIX_BIRTHDAY_CLAIM_REUSE_MS = 5 * 60 * 1_000;

/** The email rule the claim route enforces: zod's `email()` pattern, at most 254 characters after trimming. */
export const WIX_BIRTHDAY_CLAIM_EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function isWixBirthdayClaimEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 254 && WIX_BIRTHDAY_CLAIM_EMAIL_PATTERN.test(trimmed);
}

/** The pilot's email would be refused by the claim route: the page shows its contact-details message. */
export class WixBirthdayClaimContactError extends Error {
  constructor() {
    super('The pilot email is not usable for a birthday pricing claim.');
    this.name = 'WixBirthdayClaimContactError';
  }
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

async function fetchClaim(body: Record<string, string>, failureMessage: string): Promise<WixBirthdayPricingClaimField> {
  const response = await fetch('/api/wix/birthday/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object') throw new Error(failureMessage);
  const { applied, fieldId, token } = data as { applied?: unknown; fieldId?: unknown; token?: unknown };
  if (applied !== true || typeof fieldId !== 'string' || typeof token !== 'string') throw new Error(failureMessage);
  return { fieldId, token };
}

export interface WixBirthdayClaimRequester {
  /**
   * The claim field for these inputs: the kept one while the inputs are unchanged and it is younger than
   * the reuse window, otherwise a new one. Rejects with `WixBirthdayClaimContactError`, without asking,
   * for an email the route would refuse, and with `failureMessage` for any other refusal, a 429 included.
   */
  request(input: WixBirthdayClaimRequestInput, failureMessage: string): Promise<WixBirthdayPricingClaimField>;
}

export function createWixBirthdayClaimRequester(
  options: { now?: () => number; reuseForMs?: number } = {}
): WixBirthdayClaimRequester {
  const { now = () => Date.now(), reuseForMs = WIX_BIRTHDAY_CLAIM_REUSE_MS } = options;
  // One claim at a time: the page books one flight for one pilot.
  let kept: { key: string; requestedAt: number; claim: Promise<WixBirthdayPricingClaimField> } | null = null;

  return {
    async request(input, failureMessage) {
      if (!isWixBirthdayClaimEmail(input.pilotEmail)) throw new WixBirthdayClaimContactError();
      const body = wixBirthdayClaimRequestBody(input);
      const key = JSON.stringify(body);
      const at = now();
      if (kept && kept.key === key && at - kept.requestedAt < reuseForMs) return kept.claim;

      const entry = { key, requestedAt: at, claim: fetchClaim(body, failureMessage) };
      kept = entry;
      // A refused or failed request is never reused.
      entry.claim.catch(() => {
        if (kept === entry) kept = null;
      });
      return entry.claim;
    },
  };
}

const pageRequester = createWixBirthdayClaimRequester();

/** The booking page's requester; see `WixBirthdayClaimRequester.request`. */
export function requestWixBirthdayPricingClaim(
  input: WixBirthdayClaimRequestInput,
  failureMessage: string
): Promise<WixBirthdayPricingClaimField> {
  return pageRequester.request(input, failureMessage);
}
