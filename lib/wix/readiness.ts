import type { SubscriptionPassId } from '@/lib/data/subscription-passes';
import type { CatalogMismatch } from './bookings';
import type { GiftCardVariantMismatch } from './gift-cards';

export type WixReadinessBlockerCode =
  | 'wix-not-configured'
  | 'unmapped-packages'
  | 'catalog-drift'
  | 'no-shared-capacity-resource'
  | 'unresolved-subscription-plans'
  | 'gift-card-drift';

export interface WixReadinessBlocker {
  code: WixReadinessBlockerCode;
  message: string;
}

export interface WixReadinessInput {
  wixConfigured: boolean;
  unmappedPackageIds: readonly string[];
  catalogMismatches: readonly CatalogMismatch[];
  /** Resource types shared by every mapped Wix Bookings service. */
  sharedCapacityResourceTypeIds: readonly string[];
  expectedSubscriptionPassIds: readonly SubscriptionPassId[];
  resolvedSubscriptionPassIds: readonly SubscriptionPassId[];
  /** Optional Wix Gift Card product & preset variant reconciliation mismatches. */
  giftCardMismatches?: readonly GiftCardVariantMismatch[];
}

export interface WixReadinessReport {
  catalogAligned: boolean;
  capacityPoolAligned: boolean;
  giftCardsAligned: boolean;
  unresolvedSubscriptionPassIds: SubscriptionPassId[];
  canRunShadowReads: boolean;
  canPilotWixBookings: boolean;
  canRouteSubscriptionCheckout: boolean;
  canRouteGiftCardCheckout: boolean;
  blockers: WixReadinessBlocker[];
}

/**
 * Produces a conservative, provider-neutral cutover decision from read-only
 * Wix evidence. It deliberately says nothing about PayPlus, redirect-domain
 * or production-payment readiness: those are privileged dashboard checks and
 * must be explicitly verified before a live cutover.
 */
export function assessWixReadiness(input: WixReadinessInput): WixReadinessReport {
  const expectedPlanIds = [...new Set(input.expectedSubscriptionPassIds)];
  const resolvedPlanIds = new Set(input.resolvedSubscriptionPassIds);
  const unresolvedSubscriptionPassIds = expectedPlanIds.filter((id) => !resolvedPlanIds.has(id));
  const giftCardMismatches = input.giftCardMismatches ?? [];
  const blockers: WixReadinessBlocker[] = [];

  if (!input.wixConfigured) {
    blockers.push({
      code: 'wix-not-configured',
      message: 'NEXT_PUBLIC_WIX_CLIENT_ID is missing, so the frontend cannot obtain a Wix visitor session.',
    });
  }

  if (input.unmappedPackageIds.length > 0) {
    blockers.push({
      code: 'unmapped-packages',
      message: `No Wix Bookings service mapping exists for: ${input.unmappedPackageIds.join(', ')}.`,
    });
  }

  if (input.catalogMismatches.length > 0) {
    const drift = input.catalogMismatches.map((mismatch) => `${mismatch.packageId}:${mismatch.field}`).join(', ');
    blockers.push({
      code: 'catalog-drift',
      message: `Wix Bookings differs from the server-authoritative SimDream catalog: ${drift}.`,
    });
  }

  if (input.sharedCapacityResourceTypeIds.length === 0) {
    blockers.push({
      code: 'no-shared-capacity-resource',
      message:
        'Mapped Wix Bookings services do not share a physical capacity resource type; bookings across durations could overlap.',
    });
  }

  if (unresolvedSubscriptionPassIds.length > 0) {
    blockers.push({
      code: 'unresolved-subscription-plans',
      message: `No published Wix Pricing Plan resolves for: ${unresolvedSubscriptionPassIds.join(', ')}.`,
    });
  }

  if (giftCardMismatches.length > 0) {
    const drift = giftCardMismatches
      .map((mismatch) => `${mismatch.designId}(₪${mismatch.amountIls}):${mismatch.field}`)
      .join(', ');
    blockers.push({
      code: 'gift-card-drift',
      message: `Wix Gift Card product differs from the SimDream signature design tiers: ${drift}.`,
    });
  }

  const catalogAligned = input.unmappedPackageIds.length === 0 && input.catalogMismatches.length === 0;
  const capacityPoolAligned = input.sharedCapacityResourceTypeIds.length > 0;
  const giftCardsAligned = giftCardMismatches.length === 0;
  const bookingPoolReady = catalogAligned && capacityPoolAligned;
  const wixReachable = input.wixConfigured;

  return {
    catalogAligned,
    capacityPoolAligned,
    giftCardsAligned,
    unresolvedSubscriptionPassIds,
    canRunShadowReads: wixReachable && bookingPoolReady,
    canPilotWixBookings: wixReachable && bookingPoolReady,
    canRouteSubscriptionCheckout: wixReachable && unresolvedSubscriptionPassIds.length === 0,
    canRouteGiftCardCheckout: wixReachable && giftCardsAligned,
    blockers,
  };
}
