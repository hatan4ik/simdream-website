import type { FlightAddon, MissionManifestCalculation } from '@/types';
import { WIX_CART_NOTE_MAX_LENGTH } from './wix-consent-note';

/** An unpaid, visitor-owned Wix cart reused between coupon validation and checkout. */
export type WixCheckoutCodeKind = 'coupon' | 'gift-card';

export interface WixCheckoutDraftState {
  inputKey: string;
  cartId: string;
  totalIls: number;
  codeKind?: WixCheckoutCodeKind;
  couponId?: string;
  couponCode?: string;
  couponDiscountIls?: number;
  couponPercentageOff?: number;
  giftCardId?: string;
  /** Wix masks the bearer code; never retain a native Gift Card code after applying it. */
  giftCardObfuscatedCode?: string;
  giftCardCreditIls?: number;
}

export interface WixCheckoutDraftInputs {
  packageId: string;
  /** Originating shorter package when a promotional tier bump-up promotes `packageId`. */
  sourcePackageId?: string;
  selectedDate: string;
  slotId: string | undefined;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  notes: string;
  /** The raw value remains in browser memory only; it invalidates an old Wix cart if it changes. */
  birthdayValue: string;
  addonIds?: readonly string[];
  requestedRouteId?: string;
}

/**
 * A Wix cart is tied to the exact visitor, flight, departure, add-ons, route request and
 * booking-form data used to create it. Changing any of these starts a fresh unpaid draft.
 */
export function buildWixCheckoutDraftKey(inputs: WixCheckoutDraftInputs): string {
  return [
    inputs.packageId,
    inputs.sourcePackageId ?? '',
    inputs.selectedDate,
    inputs.slotId ?? '',
    inputs.pilotName.trim(),
    inputs.pilotEmail.trim(),
    inputs.pilotPhone.trim(),
    inputs.notes.trim(),
    inputs.birthdayValue,
    (inputs.addonIds ?? []).toSorted().join(','),
    inputs.requestedRouteId ?? '',
  ].join('\u001f');
}

export interface WixMissionSummaryRoute {
  id: string;
  airports?: readonly { icao: string }[];
}

function formatAddonLabels(
  addonIds?: readonly string[],
  addons?: readonly Pick<FlightAddon, 'id' | 'name'>[]
): string[] {
  if (!addonIds || addonIds.length === 0) return [];
  return addonIds.map((id) => addons?.find((a) => a.id === id)?.name ?? id);
}

function buildWixMissionSummaryParts(
  addonIds?: readonly string[],
  requestedRoute?: WixMissionSummaryRoute,
  addons?: readonly Pick<FlightAddon, 'id' | 'name'>[],
  promoDurationMinutes?: number
): string[] {
  const parts: string[] = [];
  if (requestedRoute) {
    const icaos = requestedRoute.airports?.map((a) => a.icao).join('-');
    parts.push(icaos ? `Requested route: ${requestedRoute.id} (${icaos})` : `Requested route: ${requestedRoute.id}`);
  }
  const labels = formatAddonLabels(addonIds, addons);
  if (labels.length > 0) {
    const prefix = promoDurationMinutes ? `Promo Upgrade (${promoDurationMinutes}m) Add-ons` : 'Add-ons';
    parts.push(`${prefix}: ${labels.join(', ')}`);
  }
  return parts;
}

/** Combines the pilot's booking notes with any selected add-ons and requested route for the captain. */
export function buildWixMissionNotes(
  pilotNotes: string,
  addonIds?: readonly string[],
  requestedRoute?: WixMissionSummaryRoute,
  addons?: readonly Pick<FlightAddon, 'id' | 'name'>[],
  promoDurationMinutes?: number
): string {
  const trimmed = pilotNotes.trim();
  const missionParts = buildWixMissionSummaryParts(addonIds, requestedRoute, addons, promoDurationMinutes);
  return [trimmed, ...missionParts].filter(Boolean).join(' | ');
}

/** Appends requested route and add-ons to a Wix cart note while respecting Cart V2's 1000-char limit. */
export function appendWixMissionSummaryToNote(
  baseNote: string | null | undefined,
  addonIds?: readonly string[],
  requestedRoute?: WixMissionSummaryRoute,
  addons?: readonly Pick<FlightAddon, 'id' | 'name'>[],
  promoDurationMinutes?: number
): string | null {
  const trimmedBase = baseNote?.trim() ?? '';
  const missionParts = buildWixMissionSummaryParts(addonIds, requestedRoute, addons, promoDurationMinutes);
  const combined = [trimmedBase, ...missionParts].filter(Boolean).join(' | ');
  if (!combined) return null;
  return combined.slice(0, WIX_CART_NOTE_MAX_LENGTH);
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
