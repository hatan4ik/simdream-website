'use client';

import { useState, type FormEvent } from 'react';
import type { FlightSlot, PilotExperienceLevel, SimulatorPackage } from '@/types';
import type { WorldRoute } from '@/lib/data/experience-routes';
import type { translations } from '@/lib/i18n/translations';
import { extractErrorMessage } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import {
  buildLocalCheckoutBody,
  findBookingBlocker,
  getWixCheckoutUrl,
  recordNoteOnWixDraft,
  startLocalCheckout,
  startWixSubscriptionCheckout,
  type WixSubscriptionBookingCopy,
} from '@/lib/booking/client';
import type { PilotDetails } from './use-pilot-details';
import type { BookingVoucher } from './use-booking-voucher';
import type { WixCheckoutDraftHandle } from './use-wix-checkout-draft';

type BookingCopy = (typeof translations)['en']['booking'];

interface UseBookingCheckoutArgs {
  activePackage: SimulatorPackage;
  selectedDate: string;
  selectedSlot: FlightSlot | null;
  pilot: PilotDetails;
  experienceLevel: PilotExperienceLevel;
  selectedAddons: string[];
  activeRequestedRoute: WorldRoute | undefined;
  isWixSubscriptionRedemption: boolean;
  canUseWixNativeCheckout: boolean;
  requiresUnsupportedLocalCheckout: boolean;
  voucher: BookingVoucher;
  wixDraft: WixCheckoutDraftHandle;
  wixSubscriptionCopy: WixSubscriptionBookingCopy;
  copy: BookingCopy;
  /** Called when the visitor submits without a departure: return to the date and slot step. */
  onSlotMissing: () => void;
  /**
   * SEAM for feature modules (consent, birthday): return a localized message while the feature's own
   * requirement is unmet, or null. Runs after the pilot fields check; the message is shown as the
   * booking error and nothing is submitted.
   */
  extraValidation?: () => string | null;
  /**
   * SEAM for feature modules: extra fields merged into the local `POST /api/checkout` body. Core
   * fields always win. The server must validate them; the Wix-hosted checkout does not send them.
   */
  extraPayload?: Record<string, unknown>;
  /**
   * SEAM for feature modules on the Wix-hosted checkout, where no server of ours sees the booking: returns the
   * note (consent stamp, birthday month and day) to record on the Wix cart right before the hosted payment page
   * opens, or null for none. A failure to record it stops the checkout.
   */
  wixCartNote?: () => string | null;
}

/**
 * Complete Booking & Payment. One submit handler, three destinations:
 *  - Wix subscription redemption: Wix member sign-in, then the Wix-hosted Bookings checkout;
 *  - Wix native checkout: the prepared Wix cart's hosted payment page;
 *  - local checkout: `POST /api/checkout`, then Stripe (or a fully voucher-funded success page).
 * Only a signature-verified Stripe webhook confirms payment (AGENTS.md section 6); redirecting to
 * the success URL never does. On success the page navigates away, so `isSubmitting` stays set.
 */
export function useBookingCheckout(args: UseBookingCheckoutArgs) {
  const {
    activePackage,
    selectedDate,
    selectedSlot,
    pilot,
    experienceLevel,
    selectedAddons,
    activeRequestedRoute,
    isWixSubscriptionRedemption,
    canUseWixNativeCheckout,
    requiresUnsupportedLocalCheckout,
    voucher,
    wixDraft,
    wixSubscriptionCopy,
    copy,
    onSlotMissing,
    extraValidation,
    extraPayload,
    wixCartNote,
  } = args;
  const { startWixMemberSignIn } = useAuth();
  const { pilotName, pilotEmail, pilotPhone, notes } = pilot;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');

  const handleCompleteBooking = async (e: FormEvent) => {
    e.preventDefault();
    const blocker = findBookingBlocker({
      hasAvailableSlot: Boolean(selectedSlot),
      isWixSubscriptionRedemption,
      pilotName,
      pilotEmail,
      pilotPhone,
      requiresUnsupportedLocalCheckout,
      extraValidation,
    });
    if (blocker) {
      if (blocker.kind === 'select-slot') {
        setBookingError(copy.errorSelectSlot);
        onSlotMissing();
      } else if (blocker.kind === 'fill-fields') {
        setBookingError(copy.errorFillFields);
      } else if (blocker.kind === 'wix-authority-required') {
        setBookingError(copy.wixBookingAuthorityRequired);
      } else {
        setBookingError(blocker.message);
      }
      return;
    }
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setBookingError('');

    try {
      if (isWixSubscriptionRedemption) {
        if (selectedAddons.length > 0 || voucher.voucherDiscount > 0) {
          throw new Error(wixSubscriptionCopy.description);
        }
        await startWixSubscriptionCheckout({
          packageId: activePackage.id,
          bookingDate: selectedDate,
          startTime: selectedSlot.startTime,
          copy: wixSubscriptionCopy,
          signIn: startWixMemberSignIn,
        });
        return;
      }

      if (canUseWixNativeCheckout) {
        const enteredCode = voucher.voucherCode.trim();
        const { activeDraft } = wixDraft;
        const hasAppliedCode = voucher.wixCheckoutCodeKind === 'gift-card'
          ? Boolean(activeDraft?.giftCardId)
          : Boolean(activeDraft?.couponId && activeDraft.couponCode === enteredCode);
        if (enteredCode && !hasAppliedCode) {
          voucher.setVoucherError(
            voucher.wixCheckoutCodeKind === 'gift-card' ? copy.wixGiftCardApplyFirst : copy.wixCouponApplyFirst
          );
          setIsSubmitting(false);
          return;
        }
        const draft = await wixDraft.ensureDraft();
        const note = wixCartNote?.();
        if (note) await recordNoteOnWixDraft(draft, note, copy.paymentStartFailed);
        window.location.assign(await getWixCheckoutUrl(draft));
        return;
      }

      await startLocalCheckout(
        buildLocalCheckoutBody(
          {
            packageId: activePackage.id,
            bookingDate: selectedDate,
            startTime: selectedSlot.startTime,
            pilotName,
            pilotEmail,
            pilotPhone,
            experienceLevel,
            addons: selectedAddons,
            requestedRouteId: activeRequestedRoute?.id,
            voucherCode: voucher.voucherCode,
            voucherDiscountIls: voucher.voucherDiscount,
            notes,
          },
          extraPayload
        ),
        { paymentStartFailed: copy.paymentStartFailed, paymentInitializeFailed: copy.paymentInitializeFailed }
      );
    } catch (err: unknown) {
      // fetch rejects with a TypeError on network loss; never show the raw "Failed to fetch".
      const offline = err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine);
      setBookingError(
        offline ? copy.offlineError : extractErrorMessage(err, copy.reservationCreateFailed)
      );
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, bookingError, setBookingError, handleCompleteBooking };
}

export type BookingCheckout = ReturnType<typeof useBookingCheckout>;
