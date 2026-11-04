import 'server-only';

import { requireAuthenticatedUser } from '@/lib/auth/request-auth';
import { getApplicationOrigin } from '@/lib/config/server-env';
import { BookingConflictError, store } from '@/lib/db/store';
import { sendBookingConfirmationEmail } from '@/lib/sendgrid';
import { createCheckoutSession } from '@/lib/stripe';
import {
  CheckoutDependencies,
  SlotReservationConflictError,
  type BookingDraft,
  type PendingVoucherDraft,
} from './checkout-ports';

async function translateReservationConflict<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof BookingConflictError) throw new SlotReservationConflictError(error.message);
    throw error;
  }
}

/**
 * Production composition root. It is the only checkout module that knows the
 * current Supabase store, Stripe gateway, SendGrid transport, and Supabase Auth.
 * A future Wix adapter can implement the same ports without changing checkout rules.
 */
export function createRuntimeCheckoutDependencies(): CheckoutDependencies {
  return {
    repository: {
      assertBookableStart: (date, startTime, durationMinutes) =>
        translateReservationConflict(store.assertBookableStart(date, startTime, durationMinutes)),
      getVoucherByCode: (code) => store.getVoucherByCode(code),
      ensureMemberProfile: (member) => store.ensureMemberProfile(member),
      createBooking: (draft: BookingDraft) => translateReservationConflict(store.createBooking(draft)),
      updateBookingStatus: (id, status) => store.updateBookingStatus(id, status),
      cancelPendingBooking: (id) => store.cancelPendingBooking(id),
      createPendingVoucher: (draft: PendingVoucherDraft) => store.createPendingVoucher(draft),
      cancelPendingVoucher: (id) => store.cancelPendingVoucher(id),
      redeemVoucher: (code, amountIls) => store.redeemVoucher(code, amountIls),
    },
    cardCheckout: {
      createHostedCheckout: (command) => createCheckoutSession(command),
    },
    identity: {
      getAuthenticatedMember: (request) => requireAuthenticatedUser(request),
    },
    confirmations: {
      sendBookingConfirmation: (booking) => sendBookingConfirmationEmail(booking),
    },
    origin: {
      resolve: (request) => getApplicationOrigin(request),
    },
    clock: {
      now: () => new Date(),
    },
  };
}
