import type { SubscriptionPassId } from '@/lib/data/subscription-passes';
import type { CatalogMismatch } from './bookings';

export type WixReadinessBlockerCode =
  | 'wix-not-configured'
  | 'unmapped-packages'
  | 'catalog-drift'
  | 'unresolved-subscription-plans';

export interface WixReadinessBlocker {
  code: WixReadinessBlockerCode;
  message: string;
}

export interface WixReadinessInput {
  wixConfigured: boolean;
  unmappedPackageIds: readonly string[];
  catalogMismatches: readonly CatalogMismatch[];
  expectedSubscriptionPassIds: readonly SubscriptionPassId[];
  resolvedSubscriptionPassIds: readonly SubscriptionPassId[];
}

export interface WixReadinessReport {
  catalogAligned: boolean;
  unresolvedSubscriptionPassIds: SubscriptionPassId[];
  canRunShadowReads: boolean;
  canPilotWixBookings: boolean;
  canRouteSubscriptionCheckout: boolean;
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

  if (unresolvedSubscriptionPassIds.length > 0) {
    blockers.push({
      code: 'unresolved-subscription-plans',
      message: `No published Wix Pricing Plan resolves for: ${unresolvedSubscriptionPassIds.join(', ')}.`,
    });
  }

  const catalogAligned = input.unmappedPackageIds.length === 0 && input.catalogMismatches.length === 0;
  const wixReachable = input.wixConfigured;

  return {
    catalogAligned,
    unresolvedSubscriptionPassIds,
    canRunShadowReads: wixReachable && catalogAligned,
    canPilotWixBookings: wixReachable && catalogAligned,
    canRouteSubscriptionCheckout: wixReachable && unresolvedSubscriptionPassIds.length === 0,
    blockers,
  };
}
