import { describe, expect, it } from 'vitest';
import {
  BIRTHDAY_LOOKBACK_DAYS,
  resolveBookingBirthday,
  type BookingBirthdayInput,
} from '@/lib/discounts/birthday';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

/** Booking-level decision: validate, decide eligibility, price. The server and the browser preview share it. */
const TODAY = '2026-11-01';
const base = (overrides: Partial<BookingBirthdayInput> = {}): BookingBirthdayInput => ({
  birthDate: '1990-11-25',
  flightDate: '2026-11-13',
  packageId: 'pkg-captain-60',
  subtotalIls: 690,
  today: TODAY,
  ...overrides,
});
const pkg = (id: string) => SIMULATOR_PACKAGES.find((item) => item.id === id)!;

describe('resolveBookingBirthday: arithmetic', () => {
  it.each([
    ['pkg-discovery-30', 450, 68, 382], // 67.5 rounds half up to 68
    ['pkg-captain-60', 690, 104, 586], // 103.5 rounds half up to 104
    ['pkg-ultimate-90', 850, 128, 722], // 127.5 rounds half up to 128
  ])('%s: subtotal %i takes %i off, leaving %i', (packageId, subtotalIls, discountIls, totalIls) => {
    expect(pkg(packageId).priceIls).toBe(subtotalIls);
    const result = resolveBookingBirthday(base({ packageId, subtotalIls }));
    expect(result).toMatchObject({ ok: true, applied: true, discountIls, totalIls, percent: 15 });
  });

  it('reports the Stripe amounts in agorot, exactly 100 times the shekels', () => {
    const result = resolveBookingBirthday(base());
    if (!result.ok) throw new Error('expected a valid result');
    expect(result.discountAgorot).toBe(result.discountIls * 100);
    expect(result.totalAgorot).toBe(result.totalIls * 100);
    expect(result.totalAgorot + result.discountAgorot).toBe(result.subtotalIls * 100);
    expect(Number.isInteger(result.totalAgorot)).toBe(true);
  });

  it('applies the percentage to the whole subtotal, add-ons included', () => {
    const addon = FLIGHT_ADDONS.find((item) => item.priceIls === 250)!;
    const subtotalIls = pkg('pkg-captain-60').priceIls + addon.priceIls; // 940
    expect(resolveBookingBirthday(base({ subtotalIls }))).toMatchObject({ discountIls: 141, totalIls: 799 });
  });

  it('prices the Saturday prime-time subtotal it is given, not the list price', () => {
    const subtotalIls = pkg('pkg-ultimate-90').primeTimePriceIls!; // 950
    expect(resolveBookingBirthday(base({ packageId: 'pkg-ultimate-90', subtotalIls }))).toMatchObject({
      discountIls: 143, // 142.5 rounds half up
      totalIls: 807,
    });
  });
});

describe('resolveBookingBirthday: which flights carry the offer', () => {
  it('never discounts the Discounted Promotion (no stacking, Terms 8.1), though the date qualifies', () => {
    const result = resolveBookingBirthday(base({ packageId: 'pkg-promo-45', subtotalIls: 490 }));
    expect(result).toMatchObject({ ok: true, applied: false, reason: 'same_month', blockedBy: 'discounted_promotion', discountIls: 0, totalIls: 490 });
  });

  it.each(['pkg-pro-60', 'pkg-pro-90', 'pkg-assessment-prep-120', 'pkg-fear-of-flying-90'])(
    'does not discount %s (PRO training and fear of flying are outside the offer)',
    (packageId) => {
      const subtotalIls = pkg(packageId).priceIls;
      expect(resolveBookingBirthday(base({ packageId, subtotalIls }))).toMatchObject({
        ok: true,
        applied: false,
        blockedBy: 'category_excluded',
        discountIls: 0,
        totalIls: subtotalIls,
      });
    }
  );

  it('does not discount a subscription redemption', () => {
    expect(resolveBookingBirthday(base({ isSubscriptionRedemption: true }))).toMatchObject({
      applied: false,
      blockedBy: 'subscription_redemption',
      discountIls: 0,
    });
  });

  it('does not discount on the Wix-hosted checkout, which cannot enforce it', () => {
    expect(resolveBookingBirthday(base({ wixAuthoritative: true }))).toMatchObject({
      applied: false,
      blockedBy: 'checkout_path',
      discountIls: 0,
      totalIls: 690,
    });
  });

  it('records no block for a date that simply does not qualify', () => {
    const result = resolveBookingBirthday(base({ birthDate: '1990-06-15' }));
    expect(result).toMatchObject({ ok: true, applied: false, reason: 'none', discountIls: 0 });
    expect(result.ok && result.blockedBy).toBeUndefined();
  });
});

describe('resolveBookingBirthday: the flight date decides, not the booking date', () => {
  it('earns nothing for a flight a year ahead even though the booking is made in the birthday month', () => {
    // Booked on 2026-11-01 (the pilot's birthday month) for a flight on 2027-09-14.
    expect(resolveBookingBirthday(base({ flightDate: '2027-09-14' }))).toMatchObject({ applied: false, reason: 'none' });
  });

  it('honours a flight in the birthday month booked months earlier', () => {
    expect(resolveBookingBirthday(base({ flightDate: '2027-11-02', today: '2026-11-11' }))).toMatchObject({ applied: true });
  });

  it('is the same for the first and the last day of the birthday month', () => {
    expect(resolveBookingBirthday(base({ flightDate: '2026-11-01' }))).toMatchObject({ applied: true, reason: 'same_month' });
    expect(resolveBookingBirthday(base({ flightDate: '2026-11-30' }))).toMatchObject({ applied: true, reason: 'same_month' });
  });
});

describe('resolveBookingBirthday: month boundary and the 14-day grace', () => {
  it('honours a birthday up to 14 days back across the month boundary, and not the 15th day', () => {
    expect(BIRTHDAY_LOOKBACK_DAYS).toBe(14);
    const birthDate = '1990-10-28';
    expect(resolveBookingBirthday(base({ birthDate, flightDate: '2026-11-11' }))).toMatchObject({ applied: true, reason: 'grace_before' });
    expect(resolveBookingBirthday(base({ birthDate, flightDate: '2026-11-12' }))).toMatchObject({ applied: false, reason: 'none' });
  });

  it('works across New Year (a late December birthday, an early January flight)', () => {
    const input = base({ birthDate: '1990-12-28', flightDate: '2027-01-03', today: '2026-11-11' });
    expect(resolveBookingBirthday(input)).toMatchObject({ applied: true, reason: 'grace_before' });
  });

  it('does not look forward by default: a birthday on 1 December earns nothing on 30 November', () => {
    expect(resolveBookingBirthday(base({ birthDate: '1990-12-01', flightDate: '2026-11-30' }))).toMatchObject({ applied: false });
  });
});

describe('resolveBookingBirthday: validity', () => {
  it.each([
    ['2027-01-01', 'birth_date_in_future'],
    ['2020-01-01', 'pilot_too_young'],
    ['1890-01-01', 'pilot_too_old'],
    ['1990-02-30', 'invalid_birth_date'],
    ['nonsense', 'invalid_birth_date'],
  ])('refuses %s with %s, in every flow', (birthDate, error) => {
    expect(resolveBookingBirthday(base({ birthDate }))).toEqual({ ok: false, error });
    expect(resolveBookingBirthday(base({ birthDate, packageId: 'pkg-pro-90', subtotalIls: 1285 }))).toEqual({ ok: false, error });
  });

  it('keeps only the month and the day of the birth date', () => {
    const result = resolveBookingBirthday(base({ birthDate: '1990-11-25' }));
    expect(result.ok && result.birthday).toEqual({ month: 11, day: 25 });
    expect(JSON.stringify(result)).not.toContain('1990');
  });
});
