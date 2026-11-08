import 'server-only';

import type { Booking, GiftVoucher } from '@/types';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { BOOKING_HORIZON_MESSAGE, isBeyondBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { hasDeparted, israelToday } from '@/lib/scheduler/israel-clock';
import { giftCertificateAmount, giftCertificatePackageById } from '@/lib/catalog/gift-voucher-packages';
import { DEFAULT_GIFT_CARD_DESIGN_ID } from '@/lib/catalog/gift-card-designs';
import { findOnRequestWorldRoute, MINIMUM_ROUTE_REQUEST_MINUTES } from '@/lib/data/experience-routes';
import {
  calculateMissionManifest,
  packageAllowsAddons,
  sanitizePackageTitle,
} from '@/lib/scheduler/mission-calculator';
import { memberIdForBooking } from '@/lib/auth/member-ownership';
import { bookingCheckoutSchema, voucherCheckoutSchema } from '@/lib/validation';
import { SlotReservationConflictError, type CheckoutDependencies } from './checkout-ports';
import { z } from 'zod';

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
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

/** Scheduling conflicts become a user-facing 409; storage failures propagate as a generic 503. */
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
  input: z.infer<typeof bookingCheckoutSchema>
): Promise<{
  booking: Booking;
  isVoucherPayment: boolean;
}> {
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

  const slot = await conflictsAsCheckoutErrors(
    dependencies.repository.assertBookableStart(input.bookingDate, input.startTime, pkg.durationMinutes)
  );

  const manifest = calculateMissionManifest({
    pkg,
    slot,
    selectedAddonIds: addonIds,
    availableAddons: FLIGHT_ADDONS,
  });

  if (manifest.totalDurationMinutes > manifest.maxAvailableMinutes) {
    throw new CheckoutError('The selected mission add-ons no longer fit in this departure window.', 409);
  }

  const isVoucherPayment = Boolean(input.voucherCode);
  let voucher: GiftVoucher | undefined;
  if (input.voucherCode) {
    voucher = validVoucherForAmount(
      await dependencies.repository.getVoucherByCode(input.voucherCode),
      manifest.totalIls,
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
    discountIls: isVoucherPayment ? manifest.totalIls : 0,
    totalIls: isVoucherPayment ? 0 : manifest.totalIls,
    voucherCode: voucher?.code,
    status: isVoucherPayment ? 'confirmed' : 'pending',
    paymentStatus: isVoucherPayment ? 'paid' : 'pending',
    paymentMethod: isVoucherPayment ? 'voucher' : 'stripe',
    notes: input.notes,
  }));

  if (voucher) {
    const redemption = await dependencies.repository.redeemVoucher(voucher.code, manifest.totalIls);
    if (!redemption.success) {
      await dependencies.repository.updateBookingStatus(booking.id, 'cancelled');
      throw new CheckoutError(redemption.message, 409);
    }
    dependencies.confirmations.sendBookingConfirmation(booking).catch(console.error);
  }

  return { booking, isVoucherPayment };
}

/**
 * Server-authoritative checkout rules. Infrastructure arrives through narrow
 * ports so changing the persistence or hosted-payment provider cannot alter
 * pricing, scheduling, guest checkout, or member-ownership invariants.
 */
export function createCheckoutService(dependencies: CheckoutDependencies) {
  return {
    async startBookingCheckout(request: Request, input: z.infer<typeof bookingCheckoutSchema>) {
      // Resolve every fallible setting before the first write, so a misconfiguration
      // can never leave a spent voucher or an unexpiring pending hold behind.
      const origin = dependencies.origin.resolve(request);
      const result = await createBookingFromRequest(dependencies, request, input);
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

      try {
        const session = await dependencies.cardCheckout.createHostedCheckout({
          title: 'Sim Dream: ' + booking.packageTitle + ' (' + booking.durationMinutes + ' min)',
          description: booking.bookingDate + ' • ' + booking.startTime + '–' + booking.endTime + ' Israel time',
          amountIls: booking.totalIls,
          customerEmail: booking.pilotEmail,
          bookingId: booking.id,
          successUrl,
          cancelUrl: origin + '/book?cancelled=true',
        });
        return { kind: 'stripe' as const, ...session };
      } catch (error) {
        await dependencies.repository.cancelPendingBooking(booking.id);
        throw error;
      }
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
        return { kind: 'stripe' as const, ...session };
      } catch (error) {
        await dependencies.repository.cancelPendingVoucher(voucher.id);
        throw error;
      }
    },
  };
}
