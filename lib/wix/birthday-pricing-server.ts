import 'server-only';

import { z } from 'zod';
import { applyBirthdayDiscount, resolveBookingBirthday } from '@/lib/discounts/birthday';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { packagePriceForSlot } from '@/lib/scheduler/mission-calculator';
import { packageIdForWixService, wixServiceIdFor } from './catalog';
import {
  createWixBirthdayPricingClaim,
  verifyWixBirthdayPricingClaim,
  type WixBirthdayPricingClaimPayload,
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

export interface WixPricingProviderBooking {
  bookedEntity?: {
    slot?: { serviceId?: string; startDate?: string; timezone?: string };
  };
  additionalFields?: Array<{ id?: string; _id?: string; value?: string }>;
}

export type WixBirthdayPricingDecision =
  | { ok: true; calculatedPrice: number; birthdayApplied: boolean }
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

/**
 * Wix calls this after creating a booking. Every service keeps its original
 * duration and catalog identity; only this final price changes when a valid
 * claim is bound to the same service and Israel flight date.
 */
export async function calculateWixBirthdayBookingPrice(
  booking: WixPricingProviderBooking,
  options: { config?: WixBirthdayPricingProviderConfig | null; now?: Date } = {}
): Promise<WixBirthdayPricingDecision> {
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
  if (!value) return { ok: true, calculatedPrice: basePriceIls, birthdayApplied: false };

  const claim = await verifyWixBirthdayPricingClaim(value, config.claimSecret, options.now);
  if (!claim || !claimMatchesBooking(claim, packageId, serviceId, bookingTime.flightDate)) {
    return { ok: false, code: 'invalid-birthday-claim' };
  }
  // The claim issuer has already checked the full birthday and age. Only its
  // signed month/day remains here, so re-running date eligibility with a fake
  // year would be both misleading and unnecessary. The price helper owns the
  // policy percentage and exact whole-shekel rounding.
  const price = applyBirthdayDiscount(basePriceIls);
  return { ok: true, calculatedPrice: price.totalIls, birthdayApplied: true };
}

function claimMatchesBooking(claim: WixBirthdayPricingClaimPayload, packageId: string, serviceId: string, flightDate: string): boolean {
  return claim.p === packageId && claim.s === serviceId && claim.f === flightDate;
}
