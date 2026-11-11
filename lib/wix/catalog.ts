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
  'pro-interview-3x90': process.env.WIX_PLAN_ID_PRO_3X90 ?? null,
  'pro-interview-5x60': process.env.WIX_PLAN_ID_PRO_5X60 ?? null,
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

/**
 * Wix Gift Cards app & product identifiers on the dedicated "SimDream-Staging"
 * Headless site (metasite 317b0c6d-6608-499a-bb3c-b1c37650e460).
 */
export const WIX_GIFT_CARDS_APP_ID = 'd80111c5-a0f4-47a8-b63a-65b54d774a27';
export const WIX_GIFT_CARD_PRODUCT_ID = '07209324-1536-4ca3-aad2-d8782d04398a';

/**
 * Preset gift card amount (ILS) → Wix presetVariant id.
 * Covers the 7 signature design tiers (50, 100, 200, 300, 500, 700, 1000)
 * plus the flight-certificate and intermediate preset denominations.
 */
export const WIX_GIFT_CARD_VARIANT_IDS: Readonly<Record<number, string>> = {
  50: '1110f759-2c10-48d0-8642-6440a873479a',
  100: 'c34da1c8-715f-4d6f-be19-a21eb070339b',
  200: 'eace71a8-411f-4a85-91d2-27e123def4f7',
  250: 'd65ad0fe-6205-4c4c-b568-8acb887e0694',
  300: 'b7bc2dc9-133d-42ad-b729-f71e20ce560e',
  350: '7a51a6b0-f867-4d7b-9a5d-43ffe9ef4f80',
  450: '0aaa982a-4b0b-4fea-b18d-379ea2df3f61',
  500: 'f9a449f3-8a4e-4661-8d52-4cd61f896a66',
  650: '7243eb9d-4a6b-4ecd-b618-93c46f67fc5b',
  690: '39e0b4f2-27ce-46d4-aca0-04ad4bada1aa',
  700: 'f92531a5-dda1-46c6-82b6-8dcd739af8ff',
  750: '74d47287-0c5c-4ae8-ac12-405d74280c2f',
  800: 'bc36ccf2-c2c7-4a54-a507-7a769d5b5c9c',
  900: 'd3f4f8b2-1592-4bc3-b051-29108ccd1194',
  950: '25252775-7774-4ee3-9d6b-2f0ea0e0d2c1',
  1000: 'ee1dc594-f0a8-48bf-bb0b-80afef7f4736',
  1590: '90207832-6539-43e3-9cfa-f40777b63799',
};

export function wixGiftCardVariantIdFor(amountIls: number): string | null {
  return WIX_GIFT_CARD_VARIANT_IDS[amountIls] ?? null;
}
