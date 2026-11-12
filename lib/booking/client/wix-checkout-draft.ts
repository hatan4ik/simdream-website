import type { MissionManifestCalculation } from '@/types';

/** An unpaid, visitor-owned Wix cart reused between coupon validation and checkout. */
export type WixCheckoutCodeKind = 'coupon' | 'gift-card';

export interface WixCheckoutDraftState {
  inputKey: string;
  cartId: string;
  totalIls: number;
  codeKind?: WixCheckoutCodeKind;
  couponId?: string;
  couponCode?: string;
  giftCardId?: string;
  /** Wix masks the bearer code; never retain a native Gift Card code after applying it. */
  giftCardObfuscatedCode?: string;
}

export interface WixCheckoutDraftInputs {
  packageId: string;
  selectedDate: string;
  slotId: string | undefined;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  notes: string;
}

/**
 * A Wix cart is tied to the exact visitor, flight, departure and booking-form data used to
 * create it. Changing any of these starts a fresh unpaid draft.
 */
export function buildWixCheckoutDraftKey(inputs: WixCheckoutDraftInputs): string {
  return [
    inputs.packageId,
    inputs.selectedDate,
    inputs.slotId ?? '',
    inputs.pilotName.trim(),
    inputs.pilotEmail.trim(),
    inputs.pilotPhone.trim(),
    inputs.notes.trim(),
  ].join('\u001f');
}

/** The stored draft when it still matches the current inputs, otherwise null. */
export function pickActiveWixCheckoutDraft(
  draft: WixCheckoutDraftState | null,
  currentKey: string
): WixCheckoutDraftState | null {
  return draft?.inputKey === currentKey ? draft : null;
}

/**
 * Presentation override only. The final price remains the Wix cart's calculated amount and
 * Wix recalculates it again in the hosted checkout.
 */
export function presentManifestWithDraft(
  manifest: MissionManifestCalculation,
  activeDraft: WixCheckoutDraftState | null
): { displayManifest: MissionManifestCalculation; displayTotalAmount: number } {
  if (!activeDraft) return { displayManifest: manifest, displayTotalAmount: manifest.totalIls };
  return {
    displayManifest: { ...manifest, totalIls: activeDraft.totalIls },
    displayTotalAmount: activeDraft.totalIls,
  };
}
