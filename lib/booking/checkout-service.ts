import 'server-only';

import { Booking, GiftVoucher } from '@/types';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { store, PersistenceError } from '@/lib/db/store';
import { calculateMissionManifest, sanitizePackageTitle } from '@/lib/scheduler/mission-calculator';
import { sendBookingConfirmationEmail } from '@/lib/sendgrid';
import { createCheckoutSession } from '@/lib/stripe';
import { getApplicationOrigin } from '@/lib/config/server-env';
import { memberIdForBooking } from '@/lib/auth/member-ownership';
import { requireAuthenticatedUser } from '@/lib/auth/request-auth';
import { bookingCheckoutSchema, voucherCheckoutSchema } from '@/lib/validation';
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

function israelToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function validVoucherForAmount(voucher: GiftVoucher | undefined, amount: number): GiftVoucher {
  if (!voucher || voucher.paymentStatus !== 'paid' || voucher.isRedeemed) {
    throw new CheckoutError('This voucher is not active.', 409);
  }
  if (new Date(voucher.expiryDate).getTime() < Date.now()) {
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

async function createBookingFromRequest(
  request: Request,
  input: z.infer<typeof bookingCheckoutSchema>
): Promise<{
  booking: Booking;
  isVoucherPayment: boolean;
}> {
  if (input.bookingDate < israelToday()) {
    throw new CheckoutError('Bookings must be for today or a future date.');
  }

  const pkg = SIMULATOR_PACKAGES.find((item) => item.id === input.packageId);
  if (!pkg || pkg.category === 'corporate') {
    throw new CheckoutError('Select an active consumer flight package.');
  }

  const addonIds = [...new Set(input.addons)];
  if (addonIds.some((id) => !FLIGHT_ADDONS.some((addon) => addon.id === id))) {
    throw new CheckoutError('One or more selected mission add-ons are unavailable.');
  }

  let slot;
  try {
    slot = await store.assertBookableStart(input.bookingDate, input.startTime, pkg.durationMinutes);
  } catch (error) {
    throw new CheckoutError(
      error instanceof PersistenceError ? error.message : 'The selected departure slot is no longer available.',
      409
    );
  }

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
    voucher = validVoucherForAmount(await store.getVoucherByCode(input.voucherCode), manifest.totalIls);
  }

  // Authentication is optional. Guests always retain the same checkout path;
  // a booking is attached only when a verified member checks out using their
  // own verified email address.
  const authenticatedMember = await requireAuthenticatedUser(request).catch(() => null);
  const memberId = memberIdForBooking(authenticatedMember, input.pilotEmail);
  if (authenticatedMember && memberId) await store.ensureMemberProfile(authenticatedMember);

  const booking = await store.createBooking({
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
    subtotalIls: manifest.subtotalIls,
    discountIls: isVoucherPayment ? manifest.totalIls : 0,
    totalIls: isVoucherPayment ? 0 : manifest.totalIls,
    voucherCode: voucher?.code,
    status: isVoucherPayment ? 'confirmed' : 'pending',
    paymentStatus: isVoucherPayment ? 'paid' : 'pending',
    paymentMethod: isVoucherPayment ? 'voucher' : 'stripe',
    notes: input.notes,
  });

  if (voucher) {
    const redemption = await store.redeemVoucher(voucher.code, manifest.totalIls);
    if (!redemption.success) {
      await store.updateBookingStatus(booking.id, 'cancelled');
      throw new CheckoutError(redemption.message, 409);
    }
    sendBookingConfirmationEmail(booking).catch(console.error);
  }

  return { booking, isVoucherPayment };
}

export async function startBookingCheckout(request: Request, input: z.infer<typeof bookingCheckoutSchema>) {
  const result = await createBookingFromRequest(request, input);
  const booking = result.booking;
  const origin = getApplicationOrigin(request);
  const successUrl = origin + '/book/success?ref=' + encodeURIComponent(booking.bookingReference) + '&session_id={CHECKOUT_SESSION_ID}';

  if (result.isVoucherPayment) {
    return {
      kind: 'voucher' as const,
      bookingReference: booking.bookingReference,
      successUrl: origin + '/book/success?ref=' + encodeURIComponent(booking.bookingReference),
    };
  }

  try {
    const session = await createCheckoutSession({
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
    await store.cancelPendingBooking(booking.id);
    throw error;
  }
}

export async function startVoucherCheckout(request: Request, input: z.infer<typeof voucherCheckoutSchema>) {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const voucher = await store.createPendingVoucher({
    initialValueIls: input.amountIls,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    personalMessage: input.personalMessage,
    expiryDate: expiryDate.toISOString(),
  });

  const origin = getApplicationOrigin(request);
  try {
    const session = await createCheckoutSession({
      title: 'Sim Dream Flight Gift Voucher — ₪' + input.amountIls,
      description: 'Digital gift voucher for ' + input.recipientName,
      amountIls: input.amountIls,
      customerEmail: input.senderEmail,
      voucherId: voucher.id,
      successUrl: origin + '/vouchers?purchase=processing&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: origin + '/vouchers?cancelled=true',
    });
    return { kind: 'stripe' as const, ...session };
  } catch (error) {
    await store.cancelPendingVoucher(voucher.id);
    throw error;
  }
}
