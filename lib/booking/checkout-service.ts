import 'server-only';

import type { Booking, GiftVoucher, SimulatorPackage } from '@/types';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { BOOKING_HORIZON_MESSAGE, isBeyondBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { hasDeparted, israelToday } from '@/lib/scheduler/israel-clock';
import { getDayOperatingConfig, getKantorovichPricing, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import { giftCertificateAmount, giftCertificatePackageById } from '@/lib/catalog/gift-voucher-packages';
import { DEFAULT_GIFT_CARD_DESIGN_ID } from '@/lib/catalog/gift-card-designs';
import { findOnRequestWorldRoute, MINIMUM_ROUTE_REQUEST_MINUTES } from '@/lib/data/experience-routes';
import {
  calculateMissionManifest,
  packageAllowsAddons,
  sanitizePackageTitle,
  type CalculateMissionManifestInput,
} from '@/lib/scheduler/mission-calculator';
import {
  computeEffectiveMissionDuration,
  countSelectedMissionAddons,
  MAX_MISSION_ADDONS,
} from '@/lib/scheduler/mission-upgrade-promo';
import { memberIdForBooking } from '@/lib/auth/member-ownership';
import { bookingCheckoutSchema, voucherCheckoutSchema } from '@/lib/validation';
import { resolveCheckoutExtras } from './checkout-extras';
import { CheckoutError } from './checkout-error';
import { resolveUnpaidHold } from './checkout-hold-policy';
import { SlotReservationConflictError, type CardCheckoutSession, type CheckoutDependencies } from './checkout-ports';
import { z } from 'zod';

export { CheckoutError };

type BookingCheckoutInput = z.infer<typeof bookingCheckoutSchema>;
type MissionSlot = NonNullable<CalculateMissionManifestInput['slot']>;

/** Fixed and data-free: the failure itself may carry storage details, so it is never logged. */
const HOSTED_CHECKOUT_NOT_STORED_LOG = 'Hosted checkout not stored on its hold; checkout continues without resume.';

type BookingCheckoutOutcome =
  | { kind: 'resumed'; session: CardCheckoutSession }
  | { kind: 'created'; booking: Booking; isVoucherPayment: boolean };

/** The browser receives only where to go; the session's expiry stays on the server. */
function stripeRedirect(session: CardCheckoutSession) {
  return { kind: 'stripe' as const, url: session.url, sessionId: session.sessionId };
}

/** The departure's tariff as the scheduler prices it, whoever holds it now. Only the price is read from it. */
function departureTariff(bookingDate: string, startTime: string, durationMinutes: number): MissionSlot {
  const { isSaturday } = getDayOperatingConfig(bookingDate);
  const { isPrimeTime } = getKantorovichPricing(durationMinutes, timeToMinutes(startTime), isSaturday);
  return { startTime, endTime: startTime, maxAvailableMinutes: Number.POSITIVE_INFINITY, isPrimeTime };
}

/** The mission's manifest, its server-decided extras, and what is left to pay on this departure. */
function priceMission(pkg: SimulatorPackage, input: BookingCheckoutInput, addonIds: string[], slot: MissionSlot, now: Date) {
  const manifest = calculateMissionManifest({
    pkg,
    slot,
    selectedAddonIds: addonIds,
    availableAddons: FLIGHT_ADDONS,
  });

  if (manifest.totalDurationMinutes > manifest.maxAvailableMinutes) {
    throw new CheckoutError('The selected mission add-ons no longer fit in this departure window.', 409);
  }

  // The consent record and the birthday discount are decided here from the slot's own date and the
  // registry subtotal; the client sends only the two confirmations and the typed birth date.
  const extras = resolveCheckoutExtras({
    packageId: pkg.id,
    bookingDate: input.bookingDate,
    subtotalIls: manifest.subtotalIls,
    pilotBirthDate: input.pilotBirthDate,
    consent: input.consent,
    now,
    today: israelToday(now),
  });
  if (!extras.ok) throw new CheckoutError(extras.message);
  // What is left to pay after the birthday discount; a voucher must cover exactly this.
  return { manifest, extras, payableIls: manifest.totalIls - extras.birthday.discountIls };
}

function validVoucherForAmount(voucher: GiftVoucher | undefined, amount: number, now: Date): GiftVoucher {
  if (!voucher || voucher.paymentStatus !== 'paid' || voucher.isRedeemed) {
    throw new CheckoutError('This voucher is not active.', 409);
  }
  if (new Date(voucher.expiryDate).getTime() < now.getTime()) {
    throw new CheckoutError('This voucher has expired.', 409);
  }
  if (voucher.currentBalanceIls < amount) {
    throw new CheckoutError(
      'Online checkout currently accepts a voucher only when it covers the full order total. Please contact us for split payment.',
      409
    );
  }
  return voucher;
}

/**
 * Resolves the departure slot against the effective upgraded duration grid first (Option A),
 * falling back to the base package grid so legacy/direct callers with a base-grid departure
 * still reach the `maxAvailableMinutes` window check in `priceMission`.
 */
async function resolveBookableMissionSlot(
  dependencies: CheckoutDependencies,
  bookingDate: string,
  startTime: string,
  baseDurationMinutes: number,
  effectiveDurationMinutes: number
): Promise<MissionSlot> {
  try {
    return await dependencies.repository.assertBookableStart(bookingDate, startTime, effectiveDurationMinutes);
  } catch (error) {
    if (error instanceof SlotReservationConflictError && effectiveDurationMinutes !== baseDurationMinutes) {
      return await dependencies.repository.assertBookableStart(bookingDate, startTime, baseDurationMinutes);
    }
    throw error;
  }
}
async function conflictsAsCheckoutErrors<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof SlotReservationConflictError) throw new CheckoutError(error.message, 409);
    throw error;
  }
}

async function createBookingFromRequest(
  dependencies: CheckoutDependencies,
  request: Request,
  input: BookingCheckoutInput
): Promise<BookingCheckoutOutcome> {
  if (input.bookingDate < israelToday()) {
    throw new CheckoutError('Bookings must be for today or a future date.');
  }
  if (hasDeparted(input.bookingDate, input.startTime)) {
    throw new CheckoutError('This departure time has already passed. Please choose a later departure.');
  }
  if (isBeyondBookingHorizon(input.bookingDate, israelToday(dependencies.clock.now()))) {
    throw new CheckoutError(BOOKING_HORIZON_MESSAGE);
  }

  const pkg = SIMULATOR_PACKAGES.find((item) => item.id === input.packageId);
  if (!pkg || pkg.category === 'corporate') {
    throw new CheckoutError('Select an active consumer flight package.');
  }

  // A route request is an operational instruction, not customer-controlled free text.
  // Resolve it only from the curated on-request registry and never charge it as a made-up add-on.
  const requestedRoute = input.requestedRouteId ? findOnRequestWorldRoute(input.requestedRouteId) : undefined;
  if (input.requestedRouteId && !requestedRoute) {
    throw new CheckoutError('Select a valid route request.');
  }
  if (requestedRoute && pkg.durationMinutes < MINIMUM_ROUTE_REQUEST_MINUTES) {
    throw new CheckoutError('This route request requires a 60-minute or longer flight session.');
  }

  const addonIds = [...new Set(input.addons)];
  if (addonIds.some((id) => !FLIGHT_ADDONS.some((addon) => addon.id === id))) {
    throw new CheckoutError('One or more selected mission add-ons are unavailable.');
  }
  if (addonIds.length > 0 && !packageAllowsAddons(pkg)) {
    throw new CheckoutError('Mission add-ons are not available for this package.');
  }
  if (countSelectedMissionAddons(addonIds, FLIGHT_ADDONS) > MAX_MISSION_ADDONS) {
    throw new CheckoutError(`You can select at most ${MAX_MISSION_ADDONS} mission upgrades per flight session.`);
  }

  const effectiveDurationMinutes = computeEffectiveMissionDuration(
    pkg.durationMinutes,
    addonIds,
    FLIGHT_ADDONS,
    pkg.category
  );

  const isVoucherPayment = Boolean(input.voucherCode);
  const now = dependencies.clock.now();
  // A card checkout holds the departure unpaid: the same pilot's retry resumes their open hold or
  // replaces one whose checkout has expired, and one email may not stack up holds (checkout-hold-policy.ts).
  if (!isVoucherPayment) {
    const resumed = await resolveUnpaidHold(dependencies, {
      pilotEmail: input.pilotEmail,
      packageId: pkg.id,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      addonIds,
      payableIls: () =>
        priceMission(
          pkg,
          input,
          addonIds,
          departureTariff(input.bookingDate, input.startTime, effectiveDurationMinutes),
          now
        ).payableIls,
      now,
    });
    if (resumed) return { kind: 'resumed', session: resumed };
  }

  const slot = await conflictsAsCheckoutErrors(
    resolveBookableMissionSlot(
      dependencies,
      input.bookingDate,
      input.startTime,
      pkg.durationMinutes,
      effectiveDurationMinutes
    )
  );
  const { manifest, extras, payableIls } = priceMission(pkg, input, addonIds, slot, now);
  const birthdayDiscountIls = extras.birthday.discountIls;

  let voucher: GiftVoucher | undefined;
  if (input.voucherCode) {
    voucher = validVoucherForAmount(
      await dependencies.repository.getVoucherByCode(input.voucherCode),
      payableIls,
      dependencies.clock.now()
    );
  }

  // Authentication is optional. Guests always retain the same checkout path;
  // a booking is attached only when a verified member checks out using their
  // own verified email address.
  const authenticatedMember = await dependencies.identity.getAuthenticatedMember(request).catch(() => null);
  const memberId = memberIdForBooking(authenticatedMember, input.pilotEmail);
  if (authenticatedMember && memberId) await dependencies.repository.ensureMemberProfile(authenticatedMember);

  // A concurrent purchase of the same departure loses at the database exclusion constraint.
  const booking = await conflictsAsCheckoutErrors(dependencies.repository.createBooking({
    userId: memberId,
    packageId: pkg.id,
    packageTitle: sanitizePackageTitle(pkg.title),
    durationMinutes: manifest.totalDurationMinutes,
    bookingDate: input.bookingDate,
    startTime: input.startTime,
    endTime: manifest.effectiveEndTime,
    pilotName: input.pilotName,
    pilotEmail: input.pilotEmail,
    pilotPhone: input.pilotPhone,
    experienceLevel: input.experienceLevel,
    addons: addonIds,
    requestedRouteId: requestedRoute?.id,
    subtotalIls: manifest.subtotalIls,
    // `discountIls` is everything off the subtotal: the birthday discount plus the voucher cover.
    discountIls: birthdayDiscountIls + (isVoucherPayment ? payableIls : 0),
    totalIls: isVoucherPayment ? 0 : payableIls,
    voucherCode: voucher?.code,
    // Data minimisation: month and day only, never the year or the full date.
    pilotBirthdayMonth: extras.birthday.birthday.month,
    pilotBirthdayDay: extras.birthday.birthday.day,
    birthdayDiscountIls,
    consentRecord: extras.consentRecord,
    status: isVoucherPayment ? 'confirmed' : 'pending',
    paymentStatus: isVoucherPayment ? 'paid' : 'pending',
    paymentMethod: isVoucherPayment ? 'voucher' : 'stripe',
    notes: input.notes,
  }));

  if (voucher) {
    const redemption = await dependencies.repository.redeemVoucher(voucher.code, payableIls);
    if (!redemption.success) {
      await dependencies.repository.updateBookingStatus(booking.id, 'cancelled');
      throw new CheckoutError(redemption.message, 409);
    }
    dependencies.confirmations.sendBookingConfirmation(booking).catch(console.error);
  }

  return { kind: 'created', booking, isVoucherPayment };
}

/**
 * Server-authoritative checkout rules. Infrastructure arrives through narrow
 * ports so changing the persistence or hosted-payment provider cannot alter
 * pricing, scheduling, guest checkout, or member-ownership invariants.
 */
export function createCheckoutService(dependencies: CheckoutDependencies) {
  return {
    async startBookingCheckout(request: Request, input: BookingCheckoutInput) {
      // Resolve every fallible setting before the first write, so a misconfiguration
      // can never leave a spent voucher or an unexpiring pending hold behind.
      const origin = dependencies.origin.resolve(request);
      const result = await createBookingFromRequest(dependencies, request, input);
      if (result.kind === 'resumed') return stripeRedirect(result.session);
      const booking = result.booking;
      const successUrl =
        origin +
        '/book/success?ref=' +
        encodeURIComponent(booking.bookingReference) +
        '&session_id={CHECKOUT_SESSION_ID}';

      if (result.isVoucherPayment) {
        return {
          kind: 'voucher' as const,
          bookingReference: booking.bookingReference,
          successUrl: origin + '/book/success?ref=' + encodeURIComponent(booking.bookingReference),
        };
      }

      let session: CardCheckoutSession;
      try {
        session = await dependencies.cardCheckout.createHostedCheckout({
          title: 'Sim Dream: ' + booking.packageTitle + ' (' + booking.durationMinutes + ' min)',
          description: booking.bookingDate + ' • ' + booking.startTime + '–' + booking.endTime + ' Israel time',
          amountIls: booking.totalIls,
          customerEmail: booking.pilotEmail,
          bookingId: booking.id,
          successUrl,
          cancelUrl: origin + '/book?cancelled=true',
        });
      } catch (error) {
        await dependencies.repository.cancelPendingBooking(booking.id);
        throw error;
      }

      // Stored with the hold, so the same pilot's retry can resume this checkout (checkout-hold-policy.ts).
      // Best effort: a hold without a stored checkout answers its retries 409 until Stripe's expiry releases it.
      try {
        await dependencies.repository.attachHostedCheckout(booking.id, session);
      } catch {
        console.error(HOSTED_CHECKOUT_NOT_STORED_LOG);
      }
      return stripeRedirect(session);
    },

    async startVoucherCheckout(request: Request, input: z.infer<typeof voucherCheckoutSchema>) {
      const origin = dependencies.origin.resolve(request);
      const expiryDate = new Date(dependencies.clock.now());
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const matchedPkg = giftCertificatePackageById(input.packageId);
      if (input.packageId && !matchedPkg) {
        throw new CheckoutError('Select a valid flight package for this gift certificate.');
      }

      // Named certificates always use the catalogue price. Flexible monetary cards retain
      // the buyer's chosen amount. This makes the browser unable to alter package pricing.
      const resolvedAmountIls = matchedPkg ? giftCertificateAmount(matchedPkg) : input.amountIls;
      const resolvedPackageTitle = matchedPkg ? sanitizePackageTitle(matchedPkg.title) : undefined;

      const voucher = await dependencies.repository.createPendingVoucher({
        initialValueIls: resolvedAmountIls,
        recipientName: input.recipientName,
        // No recipient email: the buyer receives the voucher to print and hand over.
        recipientEmail: input.recipientEmail || input.senderEmail,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        personalMessage: input.personalMessage,
        packageId: matchedPkg?.id,
        packageTitle: resolvedPackageTitle,
        giftCardDesignId: matchedPkg ? undefined : input.giftCardDesignId ?? DEFAULT_GIFT_CARD_DESIGN_ID,
        expiryDate: expiryDate.toISOString(),
      });

      try {
        const session = await dependencies.cardCheckout.createHostedCheckout({
          title: 'Sim Dream Flight Gift Voucher — ₪' + resolvedAmountIls,
          description: resolvedPackageTitle
            ? `Flight Gift Certificate (${resolvedPackageTitle}) for ${input.recipientName}`
            : 'Digital gift voucher for ' + input.recipientName,
          amountIls: resolvedAmountIls,
          customerEmail: input.senderEmail,
          voucherId: voucher.id,
          successUrl: origin + '/vouchers?purchase=processing&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: origin + '/vouchers?cancelled=true',
        });
        return stripeRedirect(session);
      } catch (error) {
        await dependencies.repository.cancelPendingVoucher(voucher.id);
        throw error;
      }
    },
  };
}
