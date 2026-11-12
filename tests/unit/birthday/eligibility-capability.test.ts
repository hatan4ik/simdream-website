import { describe, expect, it } from 'vitest';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  BIRTHDAY_ELIGIBLE_CATEGORIES,
  WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT,
  getBirthdayEligiblePackages,
  getBirthdayPackageEligibility,
  isBirthdayDiscountApplicablePackage,
  isBirthdayDiscountEnforceableOnActivePath,
  toBirthdayMonthDay,
} from '@/lib/discounts/birthday';

describe('package eligibility reads the registry, not retyped ids', () => {
  it('pins the one registry flag that marks the Discounted Promotion', () => {
    const promotional = SIMULATOR_PACKAGES.filter((pkg) => pkg.daytimeOnly);
    expect(promotional).toHaveLength(1);
    expect(promotional[0].durationMinutes).toBe(45);
  });

  it('decides every registry package from its flags and category', () => {
    for (const pkg of SIMULATOR_PACKAGES) {
      const verdict = getBirthdayPackageEligibility(pkg.id);
      if (pkg.daytimeOnly) {
        expect(verdict, pkg.id).toEqual({ applicable: false, reason: 'discounted_promotion' });
      } else if (!BIRTHDAY_ELIGIBLE_CATEGORIES.includes(pkg.category)) {
        expect(verdict, pkg.id).toEqual({ applicable: false, reason: 'category_excluded' });
      } else {
        expect(verdict, pkg.id).toEqual({ applicable: true, reason: 'ok' });
      }
    }
  });

  it('never applies to the Discounted Promotion (no stacking of promotions)', () => {
    const promo = SIMULATOR_PACKAGES.find((pkg) => pkg.daytimeOnly)!;
    expect(isBirthdayDiscountApplicablePackage(promo.id)).toBe(false);
  });

  it('applies to the consumer flights and not to professional training, fear of flying or corporate', () => {
    for (const pkg of SIMULATOR_PACKAGES.filter((candidate) => !candidate.daytimeOnly)) {
      expect(isBirthdayDiscountApplicablePackage(pkg.id), pkg.id).toBe(pkg.category === 'recreational');
    }
  });

  it('never applies to a subscription redemption or a gift voucher purchase, whatever the package', () => {
    const consumer = SIMULATOR_PACKAGES.find((pkg) => pkg.category === 'recreational' && !pkg.daytimeOnly)!;
    expect(getBirthdayPackageEligibility(consumer.id, { isSubscriptionRedemption: true })).toEqual({
      applicable: false,
      reason: 'subscription_redemption',
    });
    expect(getBirthdayPackageEligibility(consumer.id, { isGiftVoucherPurchase: true })).toEqual({
      applicable: false,
      reason: 'gift_voucher_purchase',
    });
    expect(isBirthdayDiscountApplicablePackage(consumer.id, { isSubscriptionRedemption: false, isGiftVoucherPurchase: false })).toBe(true);
  });

  it('refuses an unknown package id', () => {
    expect(getBirthdayPackageEligibility('pkg-does-not-exist')).toEqual({ applicable: false, reason: 'unknown_package' });
    expect(getBirthdayPackageEligibility('')).toEqual({ applicable: false, reason: 'unknown_package' });
  });

  it('lists the eligible packages with registry prices only', () => {
    const eligible = getBirthdayEligiblePackages();
    expect(eligible.length).toBeGreaterThan(0);
    for (const entry of eligible) {
      const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === entry.id)!;
      expect(entry.priceIls).toBe(pkg.priceIls);
      expect(entry.durationMinutes).toBe(pkg.durationMinutes);
      expect(pkg.daytimeOnly).toBeFalsy();
    }
  });
});

describe('isBirthdayDiscountEnforceableOnActivePath', () => {
  it('is true on the local Stripe path by default', () => {
    expect(isBirthdayDiscountEnforceableOnActivePath()).toBe(true);
    expect(isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: false })).toBe(true);
  });

  it('is false on the Wix-authoritative path until an enforceable mechanism is proven', () => {
    expect(WIX_PATH_CAN_ENFORCE_BIRTHDAY_DISCOUNT).toBe(false);
    expect(isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: true })).toBe(false);
  });

  it('follows the injected flag so the day Wix can enforce it is a one-line change', () => {
    expect(isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: true, wixPathCanEnforce: true })).toBe(true);
    expect(isBirthdayDiscountEnforceableOnActivePath({ wixAuthoritative: false, wixPathCanEnforce: false })).toBe(true);
  });
});

describe('toBirthdayMonthDay (data minimisation)', () => {
  it('keeps only the month and the day', () => {
    expect(toBirthdayMonthDay('1990-11-25')).toEqual({ month: 11, day: 25 });
    expect(toBirthdayMonthDay('2000-02-29')).toEqual({ month: 2, day: 29 });
  });

  it('returns nothing for an unusable date and never leaks the year', () => {
    expect(toBirthdayMonthDay('1990-02-30')).toBeNull();
    expect(toBirthdayMonthDay('')).toBeNull();
    expect(JSON.stringify(toBirthdayMonthDay('1987-06-05'))).not.toContain('1987');
  });
});
