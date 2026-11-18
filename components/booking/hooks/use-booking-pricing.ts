'use client';

import type { FlightAddon, FlightSlot, MissionUpgradePromo, SimulatorPackage } from '@/types';
import type { WorldRoute } from '@/lib/data/experience-routes';
import { buildWixMissionNotes, presentManifestWithDraft, type WixBirthdayClaimPilot } from '@/lib/booking/client';
import { wixServiceIdFor } from '@/lib/wix/catalog';
import type { translations } from '@/lib/i18n/translations';
import type { PilotDetails } from './use-pilot-details';
import { useBookingManifest } from './use-booking-manifest';
import { useBookingVoucher } from './use-booking-voucher';
import { useWixCheckoutDraft } from './use-wix-checkout-draft';

interface UseBookingPricingArgs {
  manifestInput: {
    activePackage: SimulatorPackage;
    selectedSlot: FlightSlot | null;
    selectedAddons: string[];
    scopedAddons: FlightAddon[];
  };
  selectedDate: string;
  pilot: PilotDetails;
  activeRequestedRoute?: WorldRoute;
  initialVoucherCode: string;
  isWixSubscriptionRedemption: boolean;
  canUseWixNativeCheckout: boolean;
  /** Registry subtotal before any voucher or discount (`useBookingManifest(input, 0).subtotalIls`). */
  subtotalIls: number;
  /** Active promotional tier bump-up from the manifest, when 1–2 mission add-ons upgrade the tier. */
  upgradePromo?: MissionUpgradePromo;
  /** The birthday discount in whole shekels (0 on every path that cannot apply it). */
  birthday: {
    discountIls: number;
    /** Browser-memory birth date used only to invalidate an old Wix draft. */
    value: string;
    /** Server issue step for the opaque Wix pricing-provider claim, bound to the pilot's contact. */
    createWixBirthdayPricingClaim: (pilot: WixBirthdayClaimPilot) => Promise<{ fieldId: string; token: string } | null>;
  };
  copy: (typeof translations)['en']['booking'];
}

/**
 * Price, vouchers and the Wix cart. A local voucher must cover the subtotal less the birthday discount;
 * the manifest carries both reductions, so every total on the page (summary, buy box, button) agrees.
 * `displayTotalAmount` is the Wix cart's own calculated total while a Wix draft is active.
 */
export function useBookingPricing(args: UseBookingPricingArgs) {
  const { manifestInput, selectedDate, pilot, activeRequestedRoute, subtotalIls, upgradePromo, birthday, copy } = args;
  const { activePackage, selectedSlot, selectedAddons, scopedAddons } = manifestInput;
  const useUpgradedWixPackage = Boolean(
    upgradePromo?.isPromoActive && wixServiceIdFor(upgradePromo.effectivePackageId)
  );
  const wixPackageId = useUpgradedWixPackage && upgradePromo ? upgradePromo.effectivePackageId : activePackage.id;
  const wixPaidAddonIds =
    useUpgradedWixPackage && upgradePromo ? upgradePromo.standalonePaidAddonIds : selectedAddons;
  const bookingNotes = buildWixMissionNotes(
    pilot.notes,
    selectedAddons,
    activeRequestedRoute,
    scopedAddons,
    upgradePromo?.isPromoActive ? upgradePromo.effectiveDurationMinutes : undefined
  );
  const wixDraft = useWixCheckoutDraft({
    packageId: wixPackageId,
    selectedDate,
    selectedSlot,
    pilotName: pilot.pilotName,
    pilotEmail: pilot.pilotEmail,
    pilotPhone: pilot.pilotPhone,
    notes: bookingNotes,
    birthdayValue: birthday.value,
    addonIds: wixPaidAddonIds,
    requestedRouteId: activeRequestedRoute?.id,
    createBirthdayPricingClaim: birthday.createWixBirthdayPricingClaim,
    messages: { errorSelectSlot: copy.errorSelectSlot, paymentStartFailed: copy.paymentStartFailed },
  });
  const voucher = useBookingVoucher({
    initialVoucherCode: args.initialVoucherCode,
    isWixSubscriptionRedemption: args.isWixSubscriptionRedemption,
    canUseWixNativeCheckout: args.canUseWixNativeCheckout,
    birthdayDiscountApplied: birthday.discountIls > 0,
    subtotalIls: subtotalIls - birthday.discountIls,
    pilotName: pilot.pilotName,
    pilotEmail: pilot.pilotEmail,
    pilotPhone: pilot.pilotPhone,
    draft: wixDraft,
    copy,
  });
  const manifest = useBookingManifest(manifestInput, voucher.voucherDiscount + birthday.discountIls);
  const { displayManifest, displayTotalAmount } = presentManifestWithDraft(manifest, wixDraft.activeDraft);
  return { wixDraft, voucher, manifest, displayManifest, displayTotalAmount };
}
