import 'server-only';

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
import { getWixBirthdayPricingProviderConfig, type WixBirthdayPricingProviderConfig } from './birthday-pricing-config';
import { birthdayClaimIdentityKeys, contactMatchesIdentityKeys, type WixPricingContactDetails } from './birthday-claim-identity';
import { parseWixBirthdayClaimRequest } from './birthday-claim-request';
import { strictWixGridDepartureFor } from './booking-grid-policy';

// The configuration lives in its own module so `npm run wix:readiness` can read it outside Next.
export {
  getWixBirthdayPricingProviderConfig,
  isWixBirthdayPricingProviderEnabled,
  WIX_BIRTHDAY_CLAIM_FIELD_ID_ENV,
  type WixBirthdayPricingProviderConfig,
} from './birthday-pricing-config';
export type { WixPricingContactDetails } from './birthday-claim-identity';

export type WixBirthdayPricingClaimIssue =
  | { ok: false; reason: 'invalid-request' | 'invalid-birthday' }
  | { ok: true; applied: false }
  | { ok: true; applied: true; fieldId: string; token: string };

/**
 * Validates a birthday once, then drops the year before issuing the Wix-only proof. The proof is
 * bound to the pilot's email (and phone, when given): a request without a valid email is refused.
 */
export async function issueWixBirthdayPricingClaim(
  unknownInput: unknown,
  options: { config?: WixBirthdayPricingProviderConfig | null; now?: Date; today?: string } = {}
): Promise<WixBirthdayPricingClaimIssue> {
  const input = parseWixBirthdayClaimRequest(unknownInput);
  if (!input) return { ok: false, reason: 'invalid-request' };
  const config = options.config === undefined ? getWixBirthdayPricingProviderConfig() : options.config;
  if (!config) throw new Error('Wix birthday pricing is not configured.');

  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === input.packageId);
  const serviceId = wixServiceIdFor(input.packageId);
  if (!pkg || !serviceId) return { ok: false, reason: 'invalid-request' };

  // This is the same decision the local Stripe checkout uses, except that the
  // caller is an approved Wix pricing provider rather than the unavailable
  // visitor-only Wix path.
  const birthday = resolveBookingBirthday({
    birthDate: input.birthDate,
    flightDate: input.flightDate,
    packageId: pkg.id,
    subtotalIls: pkg.priceIls,
    today: options.today ?? israelToday(),
  });
  if (!birthday.ok) return { ok: false, reason: 'invalid-birthday' };
  if (!birthday.applied) return { ok: true, applied: false };

  const token = await createWixBirthdayPricingClaim({
    packageId: pkg.id,
    serviceId,
    flightDate: input.flightDate,
    birthdayMonth: birthday.birthday.month,
    birthdayDay: birthday.birthday.day,
    identityKeys: await birthdayClaimIdentityKeys({ email: input.email, phone: input.phone }, config.claimSecret),
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

/** Every refusal; the route answers each with the same 400, so Wix cannot price the booking. */
export type WixPricingRejectionCode =
  | 'unsupported-service'
  | 'invalid-birthday-claim'
  | 'invalid-flight-date'
  | 'off-grid-departure';

export type WixBirthdayPricingDecision =
  | { ok: true; calculatedPrice: number; birthdayApplied: boolean }
  | { ok: false; code: WixPricingRejectionCode };

export type WixPromotionPricingDecision =
  | {
      ok: true;
      calculatedPrice: number;
      birthdayApplied: boolean;
      discountApplied: boolean;
      discountPercent: PromotionDiscountPercent;
      promoKind?: PromotionKind;
    }
  | { ok: false; code: WixPricingRejectionCode };

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
 * A claim that carries `identityKeys` is bound to that contact: the booking keeps the standard
 * registry price when its `contactDetails` are missing or match none of the keys. A loyalty or
 * birthday claim on an ineligible package keeps the standard price too.
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

  if (!slot.startDate || !Number.isFinite(Date.parse(slot.startDate))) return { ok: false, code: 'invalid-flight-date' };
  // The browser creates the Wix booking, so only this check binds it to the local grid, claim or not.
  // The flight date and the tariff are read on the Israel clock from the instant, never from the
  // booking's `timezone` label, which the browser sets.
  const departure = strictWixGridDepartureFor(packageId, slot.startDate);
  if (!departure) return { ok: false, code: 'off-grid-departure' };
  const basePriceIls = packagePriceForSlot(pkg, departure.isPrimeTime);
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
  if (!claim || !claimMatchesBooking(claim, packageId, serviceId, departure.flightDate)) {
    return { ok: false, code: 'invalid-birthday-claim' };
  }

  // A bound claim prices only its own contact's booking. A claim without keys (issued before
  // identity binding) still applies until it expires.
  if (claim.identityKeys && claim.identityKeys.length > 0) {
    const contactDetails = booking.contactDetails;
    const matched = contactDetails
      ? options.verifyIdentity
        ? await options.verifyIdentity(contactDetails, claim.identityKeys)
        : await contactMatchesIdentityKeys(contactDetails, claim.identityKeys, config.claimSecret)
      : false;
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
