import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { BIRTHDAY_ELIGIBLE_CATEGORIES } from './constants';

export type BirthdayPackageBlockReason =
  | 'unknown_package'
  | 'discounted_promotion'
  | 'category_excluded'
  | 'subscription_redemption'
  | 'gift_voucher_purchase';

export interface BirthdayPurchaseContext {
  /** A flight paid for with a prepaid subscription (flight track) credit. */
  isSubscriptionRedemption?: boolean;
  /** The purchase of a gift voucher or gift card, not a flight booking. */
  isGiftVoucherPurchase?: boolean;
}

export interface BirthdayPackageEligibility {
  applicable: boolean;
  reason: 'ok' | BirthdayPackageBlockReason;
}

/**
 * Whether the birthday discount may apply to a purchase. The owner's rules allow no stacking of
 * promotions (Terms 8.1), so it never applies to the Discounted Promotion package (the registry's
 * `daytimeOnly` flag), to a subscription redemption (prepaid) or to the purchase of a gift voucher.
 * Everything else is decided by package category (`BIRTHDAY_ELIGIBLE_CATEGORIES`). Reads the package
 * registry; no package id is typed here. A gift voucher or card used as a way to pay is not a promotion
 * and does not appear in this function: it can cover what is left after the discount.
 */
export function getBirthdayPackageEligibility(
  packageId: string,
  context: BirthdayPurchaseContext = {}
): BirthdayPackageEligibility {
  if (context.isGiftVoucherPurchase) return { applicable: false, reason: 'gift_voucher_purchase' };
  if (context.isSubscriptionRedemption) return { applicable: false, reason: 'subscription_redemption' };
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === packageId);
  if (!pkg) return { applicable: false, reason: 'unknown_package' };
  if (pkg.daytimeOnly) return { applicable: false, reason: 'discounted_promotion' };
  if (!BIRTHDAY_ELIGIBLE_CATEGORIES.includes(pkg.category)) return { applicable: false, reason: 'category_excluded' };
  return { applicable: true, reason: 'ok' };
}

export function isBirthdayDiscountApplicablePackage(packageId: string, context?: BirthdayPurchaseContext): boolean {
  return getBirthdayPackageEligibility(packageId, context).applicable;
}

/** The registry packages the discount applies to, in registry order (for the calculator table). */
export function getBirthdayEligiblePackages(): ReadonlyArray<{ id: string; durationMinutes: number; priceIls: number }> {
  return SIMULATOR_PACKAGES.filter((pkg) => isBirthdayDiscountApplicablePackage(pkg.id)).map((pkg) => ({
    id: pkg.id,
    durationMinutes: pkg.durationMinutes,
    priceIls: pkg.priceIls,
  }));
}
