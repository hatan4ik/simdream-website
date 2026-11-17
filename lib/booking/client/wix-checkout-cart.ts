import {
  WixBookingCheckoutClientError,
  applyWixCoupon,
  applyWixGiftCard,
  getWixBookingCheckoutUrl,
  prepareWixBookingCheckout,
  removeWixCoupon,
  removeWixGiftCard,
  type WixNativeCheckoutCandidate,
} from '@/lib/wix/booking-checkout-client';
import { setWixCartNote } from '@/lib/wix/cart-note';
import { clearWixMemberSession, getWixMemberClient, notifyWixMemberSessionChanged } from '@/lib/wix/member-client';
import type { WixCheckoutCodeKind, WixCheckoutDraftState } from './wix-checkout-draft';

/** Browser-side operations on the visitor-owned, unpaid Wix cart ("draft") behind a native checkout. */

export interface PrepareWixDraftInput {
  inputKey: string;
  packageId: string;
  bookingDate: string;
  startTime: string;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  pilotBirthDate?: string;
  notes: string;
  addonIds?: readonly string[];
  /** A short-lived server-signed birthday proof, never a birth date. */
  birthdayPricingClaim?: { fieldId: string; token: string } | null;
  /** Message when the app endpoint does not return a complete Wix slot. */
  paymentStartFailed: string;
}

/** Resolves the live Wix slot through the app endpoint, then creates and calculates the Wix cart. */
export async function prepareWixCheckoutDraft(input: PrepareWixDraftInput): Promise<WixCheckoutDraftState> {
  const wixSlotResponse = await fetch('/api/wix/bookings/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: input.packageId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      ...(input.addonIds && input.addonIds.length > 0 ? { addonIds: input.addonIds } : {}),
    }),
  });
  const wixSlot = (await wixSlotResponse.json()) as Partial<WixNativeCheckoutCandidate> & { error?: string };
  if (!wixSlotResponse.ok || !wixSlot.slotAvailability || !wixSlot.timeZone || !wixSlot.location || !wixSlot.paymentOptions) {
    throw new Error(wixSlot.error || input.paymentStartFailed);
  }

  const checkoutInput = {
    slotAvailability: wixSlot.slotAvailability,
    timeZone: wixSlot.timeZone,
    location: wixSlot.location,
    paymentOptions: wixSlot.paymentOptions,
    pilotName: input.pilotName,
    pilotEmail: input.pilotEmail,
    pilotPhone: input.pilotPhone,
    pilotBirthDate: input.pilotBirthDate,
    notes: input.notes,
    addonIds: input.addonIds,
    birthdayPricingClaim: input.birthdayPricingClaim ?? undefined,
  };
  let prepared;
  try {
    prepared = await prepareWixBookingCheckout(getWixMemberClient(), checkoutInput);
  } catch (err) {
    // Recover once when stale/revoked tab-scoped Wix tokens trigger 401/403 before checkout.
    if (err instanceof WixBookingCheckoutClientError && (err.status === 401 || err.status === 403)) {
      clearWixMemberSession();
      notifyWixMemberSessionChanged();
      prepared = await prepareWixBookingCheckout(getWixMemberClient(), checkoutInput);
    } else {
      throw err;
    }
  }
  return {
    inputKey: input.inputKey,
    cartId: prepared.cartId,
    totalIls: prepared.price.totalIls,
  };
}

export type CouponApplication =
  /** Wix accepted the code but calculated no discount (service outside the coupon's scope or minimum). */
  | { kind: 'not-eligible'; draft: WixCheckoutDraftState }
  | { kind: 'applied'; draft: WixCheckoutDraftState; discountIls: number; totalIls: number };

/** Applies a native Wix coupon to the draft cart; Wix, not React, calculates the discount. */
export async function applyCouponToDraft(draft: WixCheckoutDraftState, code: string): Promise<CouponApplication> {
  const preGiftCardTotalIls = draft.totalIls + (draft.giftCardCreditIls ?? 0);
  const applied = await applyWixCoupon(getWixMemberClient(), draft.cartId, code, preGiftCardTotalIls);
  if (applied.price.discountIls <= 0) {
    // Wix accepts some codes syntactically but calculates a zero discount when
    // the selected service does not meet the coupon's scope/minimum rules.
    const originalPrice = await removeWixCoupon(getWixMemberClient(), draft.cartId, applied.couponId);
    return {
      kind: 'not-eligible',
      draft: {
        ...draft,
        totalIls: originalPrice.totalIls,
        ...(originalPrice.giftCardAppliedIls !== undefined
          ? { giftCardCreditIls: originalPrice.giftCardAppliedIls }
          : {}),
      },
    };
  }

  return {
    kind: 'applied',
    draft: {
      ...draft,
      codeKind: 'coupon',
      couponId: applied.couponId,
      couponCode: code,
      couponDiscountIls: applied.price.discountIls,
      ...(applied.price.giftCardAppliedIls !== undefined
        ? { giftCardCreditIls: applied.price.giftCardAppliedIls }
        : {}),
      totalIls: applied.price.totalIls,
    },
    discountIls: applied.price.discountIls,
    totalIls: applied.price.totalIls,
  };
}

export interface GiftCardApplication {
  draft: WixCheckoutDraftState;
  appliedCreditIls: number;
  totalIls: number;
}

/** Applies a native Wix Gift Card to the draft cart. The bearer code is never kept in the draft. */
export async function applyGiftCardToDraft(draft: WixCheckoutDraftState, code: string): Promise<GiftCardApplication> {
  const applied = await applyWixGiftCard(getWixMemberClient(), draft.cartId, code);
  const appliedCreditIls = applied.price.giftCardAppliedIls ?? 0;
  return {
    draft: {
      ...draft,
      codeKind: 'gift-card',
      giftCardId: applied.giftCardId,
      giftCardObfuscatedCode: applied.obfuscatedCode,
      giftCardCreditIls: appliedCreditIls,
      totalIls: applied.price.totalIls,
    },
    appliedCreditIls,
    totalIls: applied.price.totalIls,
  };
}

/** Removes the applied coupon or Gift Card from the draft cart and returns the draft at Wix's recalculated total. */
export async function removeAppliedCodeFromDraft(
  draft: WixCheckoutDraftState,
  kind?: WixCheckoutCodeKind
): Promise<WixCheckoutDraftState> {
  const targetKind: WixCheckoutCodeKind = kind ?? (draft.giftCardId ? 'gift-card' : 'coupon');
  if (targetKind === 'gift-card' && draft.giftCardId) {
    const price = await removeWixGiftCard(getWixMemberClient(), draft.cartId, draft.giftCardId);
    return {
      ...draft,
      totalIls: price.totalIls,
      codeKind: draft.couponId ? 'coupon' : undefined,
      giftCardId: undefined,
      giftCardObfuscatedCode: undefined,
      giftCardCreditIls: undefined,
    };
  }
  const price = await removeWixCoupon(getWixMemberClient(), draft.cartId, draft.couponId as string);
  return {
    ...draft,
    totalIls: price.totalIls,
    codeKind: draft.giftCardId ? 'gift-card' : undefined,
    couponId: undefined,
    couponCode: undefined,
    couponDiscountIls: undefined,
    ...(draft.giftCardId && price.giftCardAppliedIls !== undefined
      ? { giftCardCreditIls: price.giftCardAppliedIls }
      : {}),
  };
}

/** The Wix-hosted payment URL for an already calculated draft cart. */
export async function getWixCheckoutUrl(draft: WixCheckoutDraftState): Promise<string> {
  const { checkoutUrl } = await getWixBookingCheckoutUrl(getWixMemberClient(), draft.cartId);
  return checkoutUrl;
}

/**
 * Records the consent stamp (and the birthday month and day) on the draft's Wix cart before the hosted
 * payment page opens. See `buildWixConsentNote`. Throws the given localized message when Wix refuses.
 */
export async function recordNoteOnWixDraft(draft: WixCheckoutDraftState, note: string, failureMessage: string): Promise<void> {
  await setWixCartNote(getWixMemberClient(), draft.cartId, note, failureMessage);
}
