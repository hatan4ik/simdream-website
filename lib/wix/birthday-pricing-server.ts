import 'server-only';

import { z } from 'zod';
import {
  applyBirthdayDiscount,
  isBirthdayDiscountApplicablePackage,
  resolveBookingBirthday,
} from '@/lib/discounts/birthday';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { packagePriceForSlot } from '@/lib/scheduler/mission-calculator';
import { packageIdForWixService, wixServiceIdFor } from './catalog';
import {
  createWixBirthdayPricingClaim,
  verifyPromotionClaim,
  type PromotionDiscountPercent,
  type PromotionKind,
  type VerifiedPromotionClaim,
} from './birthday-pricing-claim';

export const WIX_BIRTHDAY_CLAIM_FIELD_ID_ENV = 'WIX_BIRTHDAY_CLAIM_FIELD_ID';

export interface WixBirthdayPricingProviderConfig {
  claimFieldId: string;
  claimSecret: string;
  providerAppId: string;
  providerPublicKey: string;
}

const guidSchema = z.string().uuid();

function nonEmptyEnvironment(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * The route stays fail-closed until *all* pricing-provider secrets and the
 * Bookings custom-field id exist. A deployment containing only source code
 * therefore cannot accidentally advertise or grant the reduction.
 */
export function getWixBirthdayPricingProviderConfig(): WixBirthdayPricingProviderConfig | null {
  if (process.env.WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED?.trim().toLowerCase() !== 'true') return null;
  const claimFieldId = nonEmptyEnvironment(WIX_BIRTHDAY_CLAIM_FIELD_ID_ENV);
  const claimSecret = nonEmptyEnvironment('WIX_BIRTHDAY_CLAIM_SECRET');
  const providerAppId = nonEmptyEnvironment('WIX_BIRTHDAY_PRICING_PROVIDER_APP_ID');
  const providerPublicKey = nonEmptyEnvironment('WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY');
  if (!claimFieldId || !claimSecret || !providerAppId || !providerPublicKey) return null;
  if (!guidSchema.safeParse(claimFieldId).success || !guidSchema.safeParse(providerAppId).success) return null;
  if (new TextEncoder().encode(claimSecret).byteLength < 32 || !providerPublicKey.includes('BEGIN PUBLIC KEY')) return null;
  return { claimFieldId, claimSecret, providerAppId, providerPublicKey };
}

export function isWixBirthdayPricingProviderEnabled(): boolean {
  return getWixBirthdayPricingProviderConfig() !== null;
}

const issueClaimSchema = z.object({
  packageId: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type WixBirthdayPricingClaimIssue =
  | { ok: false; reason: 'invalid-request' | 'invalid-birthday' }
  | { ok: true; applied: false }
  | { ok: true; applied: true; fieldId: string; token: string };

/** Validates a birthday once, then drops the year before issuing the Wix-only proof. */
export async function issueWixBirthdayPricingClaim(
  unknownInput: unknown,
  options: { config?: WixBirthdayPricingProviderConfig | null; now?: Date; today?: string } = {}
): Promise<WixBirthdayPricingClaimIssue> {
  const input = issueClaimSchema.safeParse(unknownInput);
  if (!input.success) return { ok: false, reason: 'invalid-request' };
  const config = options.config === undefined ? getWixBirthdayPricingProviderConfig() : options.config;
  if (!config) throw new Error('Wix birthday pricing is not configured.');

  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === input.data.packageId);
  const serviceId = wixServiceIdFor(input.data.packageId);
  if (!pkg || !serviceId) return { ok: false, reason: 'invalid-request' };

  // This is the same decision the local Stripe checkout uses, except that the
  // caller is an approved Wix pricing provider rather than the unavailable
  // visitor-only Wix path.
  const birthday = resolveBookingBirthday({
    birthDate: input.data.birthDate,
    flightDate: input.data.flightDate,
    packageId: pkg.id,
    subtotalIls: pkg.priceIls,
    today: options.today ?? israelToday(),
  });
  if (!birthday.ok) return { ok: false, reason: 'invalid-birthday' };
  if (!birthday.applied) return { ok: true, applied: false };

  const token = await createWixBirthdayPricingClaim({
    packageId: pkg.id,
    serviceId,
    flightDate: input.data.flightDate,
    birthdayMonth: birthday.birthday.month,
    birthdayDay: birthday.birthday.day,
    secret: config.claimSecret,
    now: options.now,
  });
  return {
    ok: true,
    applied: true,
    fieldId: config.claimFieldId,
    token,
  };
}

export interface WixPricingContactDetails {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export interface WixPricingProviderBooking {
  bookedEntity?: {
    slot?: { serviceId?: string; startDate?: string; timezone?: string };
  };
  additionalFields?: Array<{ id?: string; _id?: string; value?: string }>;
  contactDetails?: WixPricingContactDetails;
}

export type WixPricingIdentityVerifier = (
  contactDetails: WixPricingContactDetails,
  identityKeys: readonly string[]
) => boolean | Promise<boolean>;

export interface WixPricingCalculationOptions {
  config?: WixBirthdayPricingProviderConfig | null;
  now?: Date;
  verifyIdentity?: WixPricingIdentityVerifier;
}

export type WixBirthdayPricingDecision =
  | { ok: true; calculatedPrice: number; birthdayApplied: boolean }
  | { ok: false; code: 'unsupported-service' | 'invalid-birthday-claim' | 'invalid-flight-date' };

export type WixPromotionPricingDecision =
  | {
      ok: true;
      calculatedPrice: number;
      birthdayApplied: boolean;
      discountApplied: boolean;
      discountPercent: PromotionDiscountPercent;
      promoKind?: PromotionKind;
    }
  | { ok: false; code: 'unsupported-service' | 'invalid-birthday-claim' | 'invalid-flight-date' };

function bookingDateTimeParts(
  startDate: string,
  timeZone: string | undefined
): { flightDate: string; isPrimeTime: boolean } | null {
  const parsed = new Date(startDate);
  if (!Number.isFinite(parsed.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(parsed);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const weekday = get('weekday');
    if (!year || !month || !day || !hour || !weekday) return null;
    return {
      flightDate: `${year}-${month}-${day}`,
      // This mirrors the scheduler: all Saturday departures and 18:00 onward
      // use the package's configured prime-time tariff.
      isPrimeTime: weekday === 'Sat' || Number(hour) >= 18,
    };
  } catch {
    return null;
  }
}

function normalizedContactCandidates(contactDetails: WixPricingContactDetails): string[] {
  const candidates = new Set<string>();
  const email = contactDetails.email?.trim().toLowerCase();
  if (email) {
    candidates.add(email);
    candidates.add(`email:${email}`);
  }
  const rawPhone = contactDetails.phone?.trim();
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits) {
      candidates.add(digits);
      candidates.add(`phone:${digits}`);
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
  }
  return [...candidates];
}

async function hmacSha256Digests(secret: string, value: string): Promise<[string, string]> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  let hex = '';
  let binary = '';
  for (const byte of sig) {
    hex += byte.toString(16).padStart(2, '0');
    binary += String.fromCharCode(byte);
  }
  const base64url = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return [hex, base64url];
}

async function defaultVerifyIdentity(
  contactDetails: WixPricingContactDetails,
  identityKeys: readonly string[],
  secret: string
): Promise<boolean> {
  const candidates = normalizedContactCandidates(contactDetails);
  if (candidates.length === 0) return false;
  const keySet = new Set(identityKeys);
  for (const candidate of candidates) {
    if (keySet.has(candidate)) return true;
    const [hex, b64] = await hmacSha256Digests(secret, candidate);
    if (keySet.has(hex) || keySet.has(b64)) return true;
  }
  return false;
}

function claimMatchesBooking(
  claim: VerifiedPromotionClaim,
  packageId: string,
  serviceId: string,
  flightDate: string
): boolean {
  return claim.packageId === packageId && claim.serviceId === serviceId && claim.flightDate === flightDate;
}

/**
 * Evaluates a Wix booking against any supported promotion claim (`birthday`, `loyalty`, `prepaid`).
 * Falls back to standard registry price if `identityKeys` fails contact verification or if a
 * loyalty/birthday claim is used on an ineligible package.
 */
export async function calculateWixBookingPrice(
  booking: WixPricingProviderBooking,
  options: WixPricingCalculationOptions = {}
): Promise<WixPromotionPricingDecision> {
  const config = options.config === undefined ? getWixBirthdayPricingProviderConfig() : options.config;
  if (!config) throw new Error('Wix birthday pricing is not configured.');
  const slot = booking.bookedEntity?.slot;
  const serviceId = slot?.serviceId;
  const packageId = serviceId ? packageIdForWixService(serviceId) : null;
  const pkg = packageId ? SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId) : undefined;
  if (!slot || !serviceId || !packageId || !pkg) return { ok: false, code: 'unsupported-service' };

  const bookingTime = slot.startDate ? bookingDateTimeParts(slot.startDate, slot.timezone) : null;
  if (!bookingTime) return { ok: false, code: 'invalid-flight-date' };
  const basePriceIls = packagePriceForSlot(pkg, bookingTime.isPrimeTime);
  const value = booking.additionalFields?.find(
    (field) => (field.id ?? field._id) === config.claimFieldId
  )?.value;

  // No claim means a normal booking. Returning the registry-backed standard
  // price is essential because an active provider overrides Wix's default
  // Bookings calculator for every mapped service.
  if (!value) {
    return { ok: true, calculatedPrice: basePriceIls, birthdayApplied: false, discountApplied: false, discountPercent: 0 };
  }

  const claim = await verifyPromotionClaim(value, config.claimSecret, options.now);
  if (!claim || !claimMatchesBooking(claim, packageId, serviceId, bookingTime.flightDate)) {
    return { ok: false, code: 'invalid-birthday-claim' };
  }

  if (claim.identityKeys && claim.identityKeys.length > 0 && booking.contactDetails) {
    const matched = options.verifyIdentity
      ? await options.verifyIdentity(booking.contactDetails, claim.identityKeys)
      : await defaultVerifyIdentity(booking.contactDetails, claim.identityKeys, config.claimSecret);
    if (!matched) {
      return {
        ok: true,
        calculatedPrice: basePriceIls,
        birthdayApplied: false,
        discountApplied: false,
        discountPercent: 0,
        promoKind: claim.promoKind,
      };
    }
  }

  if (claim.promoKind === 'prepaid') {
    return {
      ok: true,
      calculatedPrice: basePriceIls,
      birthdayApplied: false,
      discountApplied: false,
      discountPercent: 0,
      promoKind: 'prepaid',
    };
  }

  if (claim.promoKind === 'loyalty') {
    if (!isBirthdayDiscountApplicablePackage(packageId)) {
      return {
        ok: true,
        calculatedPrice: basePriceIls,
        birthdayApplied: false,
        discountApplied: false,
        discountPercent: 0,
        promoKind: 'loyalty',
      };
    }
    const price = applyBirthdayDiscount(basePriceIls, claim.discountPercent);
    return {
      ok: true,
      calculatedPrice: price.totalIls,
      birthdayApplied: false,
      discountApplied: true,
      discountPercent: claim.discountPercent,
      promoKind: 'loyalty',
    };
  }

  // Birthday claim: the issuer has already checked the full birthday and age.
  // The price helper owns the policy percentage and exact whole-shekel rounding.
  const price = applyBirthdayDiscount(basePriceIls);
  return {
    ok: true,
    calculatedPrice: price.totalIls,
    birthdayApplied: true,
    discountApplied: true,
    discountPercent: 15,
    promoKind: 'birthday',
  };
}

/**
 * Wix calls this after creating a booking. Every service keeps its original
 * duration and catalog identity; only this final price changes when a valid
 * claim is bound to the same service and Israel flight date.
 */
export async function calculateWixBirthdayBookingPrice(
  booking: WixPricingProviderBooking,
  options: WixPricingCalculationOptions = {}
): Promise<WixBirthdayPricingDecision> {
  const decision = await calculateWixBookingPrice(booking, options);
  if (!decision.ok) return decision;
  return {
    ok: true,
    calculatedPrice: decision.calculatedPrice,
    birthdayApplied: decision.birthdayApplied,
  };
}
