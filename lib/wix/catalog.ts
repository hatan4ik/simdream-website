import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { SUBSCRIPTION_PASSES, type SubscriptionPassId } from '@/lib/data/subscription-passes';

/**
 * SimDream package id → Wix Bookings service id on the dedicated
 * "SimDream-Staging" Headless site (metasite 317b0c6d-6608-499a-bb3c-b1c37650e460).
 *
 * The services were created from this catalog, one APPOINTMENT per package,
 * so the pairing is one-to-one. `reconcileCatalog` in ./bookings checks that
 * the live service still carries the same name, duration and price; the
 * server stays the pricing authority either way (AGENTS.md §6.3).
 */
export const WIX_SERVICE_IDS: Readonly<Record<string, string>> = {
  'pkg-discovery-30': '8a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  'pkg-promo-45': '9542239d-9f18-4b89-a892-e47494aae340',
  'pkg-captain-60': '4d52163a-1985-48cb-bf8c-92535e56e76a',
  'pkg-ultimate-90': '97b47c8c-c7a5-4c3c-9596-8e5cf77e9e77',
  'pkg-pro-60': '3d282abe-e81b-4978-a84a-7d1df560879e',
  'pkg-pro-90': '93a46072-aad9-44a5-a58f-5bc207c2a85f',
  'pkg-assessment-prep-120': '23fa81db-b399-4d4a-b5e9-bd1d0a4ba7bd',
  'pkg-fear-of-flying-90': '10c00556-7a1e-4b34-b517-2f1f6f762bea',
  'pkg-corporate-crm': '33a37201-2866-4bb3-9268-882d3b22ff8c',
};

export function wixServiceIdFor(packageId: string): string | null {
  return WIX_SERVICE_IDS[packageId] ?? null;
}

export function packageIdForWixService(serviceId: string): string | null {
  const match = Object.entries(WIX_SERVICE_IDS).find(([, id]) => id === serviceId);
  return match ? match[0] : null;
}

/** Package ids in the catalog that have no Wix service yet (should stay empty). */
export function unmappedPackageIds(): string[] {
  return SIMULATOR_PACKAGES.map((pkg) => pkg.id).filter((id) => !(id in WIX_SERVICE_IDS));
}

/**
 * SimDream subscription pass id → Wix Pricing Plan id.
 * Supports environment variable overrides for custom or production plans.
 */
export const WIX_PLAN_IDS: Readonly<Record<SubscriptionPassId, string | null>> = {
  'flight-foundations-5x60': process.env.WIX_PLAN_ID_FOUNDATIONS_5X60 ?? null,
  'advanced-captain-5x90': process.env.WIX_PLAN_ID_ADVANCED_5X90 ?? null,
  'atpl-concepts-10x60': process.env.WIX_PLAN_ID_ATPL_10X60 ?? null,
  'airline-readiness-10x90': process.env.WIX_PLAN_ID_AIRLINE_10X90 ?? null,
};

export function wixPlanIdFor(passId: SubscriptionPassId): string | null {
  return WIX_PLAN_IDS[passId] ?? null;
}

export function subscriptionPassIdForWixPlan(planId: string): SubscriptionPassId | null {
  const match = Object.entries(WIX_PLAN_IDS).find(([, id]) => id === planId);
  return (match ? match[0] : null) as SubscriptionPassId | null;
}

export function unmappedSubscriptionPassIds(): SubscriptionPassId[] {
  return SUBSCRIPTION_PASSES.map((pass) => pass.id).filter((id) => !WIX_PLAN_IDS[id]);
}
