import type { SimulatorPackage } from '@/types';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

/**
 * Named gift certificates are deliberately limited to the public duration ladder.
 * Keep the order here so the voucher chooser cannot drift away from the catalogue.
 */
export const GIFT_CERTIFICATE_PACKAGE_IDS = [
  'pkg-discovery-30',
  'pkg-captain-60',
  'pkg-ultimate-90',
  'pkg-assessment-prep-120',
] as const;

export type GiftCertificatePackageId = (typeof GIFT_CERTIFICATE_PACKAGE_IDS)[number];

export const DEFAULT_GIFT_CERTIFICATE_PACKAGE_ID: GiftCertificatePackageId = 'pkg-captain-60';

export function isGiftCertificatePackageId(packageId: string): packageId is GiftCertificatePackageId {
  return (GIFT_CERTIFICATE_PACKAGE_IDS as readonly string[]).includes(packageId);
}

/** A voucher must cover every valid departure, including the 90-minute prime-time tariff. */
export function giftCertificateAmount(pkg: Pick<SimulatorPackage, 'priceIls' | 'primeTimePriceIls'>): number {
  return pkg.primeTimePriceIls ?? pkg.priceIls;
}

export function giftCertificatePackageById(packageId: string | undefined): SimulatorPackage | undefined {
  if (!packageId || !isGiftCertificatePackageId(packageId)) return undefined;
  return SIMULATOR_PACKAGES.find((pkg) => pkg.id === packageId);
}

const defaultGiftCertificatePackage = giftCertificatePackageById(DEFAULT_GIFT_CERTIFICATE_PACKAGE_ID);
if (!defaultGiftCertificatePackage) {
  throw new Error(`Default gift certificate package is missing: ${DEFAULT_GIFT_CERTIFICATE_PACKAGE_ID}`);
}

export const DEFAULT_GIFT_CERTIFICATE_AMOUNT = giftCertificateAmount(defaultGiftCertificatePackage);

/**
 * Applies the canonical certificate order to either the source catalogue or its
 * localized projection. Missing packages are a programming error, not a UI fallback.
 */
export function orderGiftCertificatePackages<T extends Pick<SimulatorPackage, 'id'>>(packages: readonly T[]): T[] {
  return GIFT_CERTIFICATE_PACKAGE_IDS.map((packageId) => {
    const pkg = packages.find((candidate) => candidate.id === packageId);
    if (!pkg) throw new Error(`Gift certificate package is missing from the catalogue: ${packageId}`);
    return pkg;
  });
}
