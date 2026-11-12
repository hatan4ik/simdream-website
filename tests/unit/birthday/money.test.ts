import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyBirthdayDiscount, calculateBirthdayDiscountIls } from '@/lib/discounts/birthday';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

describe('calculateBirthdayDiscountIls', () => {
  it('rounds half up to a whole shekel', () => {
    // 15%: x.5 shekel results round up, anything below .5 rounds down.
    expect(calculateBirthdayDiscountIls(450)).toBe(68); // 67.5
    expect(calculateBirthdayDiscountIls(690)).toBe(104); // 103.5
    expect(calculateBirthdayDiscountIls(850)).toBe(128); // 127.5
    expect(calculateBirthdayDiscountIls(10)).toBe(2); // 1.5
    expect(calculateBirthdayDiscountIls(30)).toBe(5); // 4.5
    expect(calculateBirthdayDiscountIls(3)).toBe(0); // 0.45
    expect(calculateBirthdayDiscountIls(4)).toBe(1); // 0.6
    expect(calculateBirthdayDiscountIls(100)).toBe(15);
  });

  it('handles zero, one and a large subtotal', () => {
    expect(calculateBirthdayDiscountIls(0)).toBe(0);
    expect(calculateBirthdayDiscountIls(1)).toBe(0);
    expect(calculateBirthdayDiscountIls(1_000_000)).toBe(150_000);
  });

  it('supports other percentages for tests and future campaigns', () => {
    expect(calculateBirthdayDiscountIls(200, 0)).toBe(0);
    expect(calculateBirthdayDiscountIls(200, 100)).toBe(200);
    expect(calculateBirthdayDiscountIls(5, 10)).toBe(1); // 0.5 rounds up
  });

  it('refuses amounts that are not whole non-negative shekels', () => {
    for (const bad of [-1, 0.5, 450.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => calculateBirthdayDiscountIls(bad), String(bad)).toThrow(RangeError);
    }
  });

  it('refuses a percentage outside 0 to 100 or not whole', () => {
    for (const bad of [-1, 101, 12.5, Number.NaN]) expect(() => calculateBirthdayDiscountIls(100, bad), String(bad)).toThrow(RangeError);
  });

  it('matches Math.round(subtotal * percent / 100) for every subtotal to 20000 shekels', () => {
    for (let subtotal = 0; subtotal <= 20_000; subtotal += 1) {
      expect(calculateBirthdayDiscountIls(subtotal), String(subtotal)).toBe(Math.round((subtotal * 15) / 100));
    }
  });
});

describe('applyBirthdayDiscount', () => {
  it('returns the discount, the total and the agorot Stripe needs', () => {
    expect(applyBirthdayDiscount(690)).toEqual({
      percent: 15,
      subtotalIls: 690,
      discountIls: 104,
      totalIls: 586,
      discountAgorot: 10_400,
      totalAgorot: 58_600,
    });
  });

  it('never goes negative or fractional, whatever the subtotal', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5_000_000 }), fc.integer({ min: 0, max: 100 }), (subtotal, percent) => {
        const price = applyBirthdayDiscount(subtotal, percent);
        for (const value of [price.discountIls, price.totalIls, price.discountAgorot, price.totalAgorot]) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
        expect(price.discountIls + price.totalIls).toBe(subtotal);
        expect(price.discountAgorot + price.totalAgorot).toBe(subtotal * 100);
      })
    );
  });

  it('prices every registry package into a cheaper whole-shekel total', () => {
    for (const pkg of SIMULATOR_PACKAGES) {
      const price = applyBirthdayDiscount(pkg.priceIls);
      expect(price.totalIls, pkg.id).toBeLessThan(pkg.priceIls);
      expect(price.totalIls, pkg.id).toBeGreaterThan(0);
    }
  });

  it('refuses a bad subtotal instead of producing a bad price', () => {
    expect(() => applyBirthdayDiscount(-5)).toThrow(RangeError);
    expect(() => applyBirthdayDiscount(1.25)).toThrow(RangeError);
  });
});
