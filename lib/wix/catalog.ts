import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

/**
 * SimDream package id → Wix Bookings service id on the "Sim Dream Israel"
 * headless site (metasite 4c5e1c7a-163c-48ce-8278-cdc42e4deed4).
 *
 * The services were created from this catalog, one APPOINTMENT per package,
 * so the pairing is one-to-one. `reconcileCatalog` in ./bookings checks that
 * the live service still carries the same name, duration and price; the
 * server stays the pricing authority either way (AGENTS.md §6.3).
 */
export const WIX_SERVICE_IDS: Readonly<Record<string, string>> = {
  'pkg-discovery-30': 'bc744292-6a31-47e5-bde7-7e82cc4da479',
  'pkg-promo-45': '88cbe8c8-8a40-4fbe-8a07-4d0efd32632e',
  'pkg-captain-60': 'd4a11b86-541e-44ed-ba41-8d11aac60004',
  'pkg-ultimate-90': 'ce3753f9-30b5-4632-8e0e-c7ed3ee2c15f',
  'pkg-pro-60': '56c77d41-8161-4b6b-8373-ebe693d4cd15',
  'pkg-pro-90': 'bd026789-042b-4e01-b66a-91c42682ca72',
  'pkg-assessment-prep-120': '1f329cb2-9741-4d52-b316-3e5d5b0c6ce5',
  'pkg-fear-of-flying-90': '3adc62bb-fda5-4271-b7bd-06668b086592',
  'pkg-corporate-crm': 'ead24a50-782c-4bc4-910a-5d095386a64d',
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
