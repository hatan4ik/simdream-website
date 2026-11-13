import { describe, expect, it, vi } from 'vitest';
import {
  createWixBirthdayPricingClaim,
  issueBirthdayClaim,
  issuePromotionClaim,
  verifyBirthdayClaim,
  verifyPromotionClaim,
  verifyWixBirthdayPricingClaim,
} from '@/lib/wix/birthday-pricing-claim';
import {
  calculateWixBirthdayBookingPrice,
  calculateWixBookingPrice,
  type WixBirthdayPricingProviderConfig,
} from '@/lib/wix/birthday-pricing-server';
import { wixServiceIdFor } from '@/lib/wix/catalog';

const SECRET = 'loyalty-pricing-secret-that-is-longer-than-thirty-two-bytes';
const CONFIG: WixBirthdayPricingProviderConfig = {
  claimFieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  claimSecret: SECRET,
  providerAppId: 'b4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  providerPublicKey: '-----BEGIN PUBLIC KEY-----\nnot-used-in-unit-tests\n-----END PUBLIC KEY-----',
};
const NOW = new Date('2026-11-01T12:00:00.000Z');
const CAPTAIN_60_SERVICE = wixServiceIdFor('pkg-captain-60')!;
const PROMO_45_SERVICE = wixServiceIdFor('pkg-promo-45')!;
const PRO_60_SERVICE = wixServiceIdFor('pkg-pro-60')!;

async function hmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

describe('unified promotion claim contract', () => {
  it('preserves 100% backwards compatibility for birthday claims (15%)', async () => {
    const legacyToken = await createWixBirthdayPricingClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      secret: SECRET,
      now: NOW,
    });
    const wrapperToken = await issueBirthdayClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      secret: SECRET,
      now: NOW,
    });

    await expect(verifyWixBirthdayPricingClaim(legacyToken, SECRET, NOW)).resolves.toMatchObject({
      v: 1,
      p: 'pkg-captain-60',
      b: '11-25',
      f: '2026-11-13',
    });
    await expect(verifyBirthdayClaim(wrapperToken, SECRET, NOW)).resolves.toMatchObject({
      v: 1,
      p: 'pkg-captain-60',
      b: '11-25',
    });
    await expect(verifyPromotionClaim(legacyToken, SECRET, NOW)).resolves.toMatchObject({
      promoKind: 'birthday',
      discountPercent: 15,
      packageId: 'pkg-captain-60',
      birthdayMonthDay: '11-25',
    });
  });

  it('issues and verifies loyalty claims for 5%, 7%, and 10%', async () => {
    for (const discountPercent of [5, 7, 10] as const) {
      const token = await issuePromotionClaim({
        packageId: 'pkg-captain-60',
        serviceId: CAPTAIN_60_SERVICE,
        flightDate: '2026-11-13',
        promoKind: 'loyalty',
        discountPercent,
        secret: SECRET,
        now: NOW,
      });

      await expect(verifyPromotionClaim(token, SECRET, NOW)).resolves.toMatchObject({
        promoKind: 'loyalty',
        discountPercent,
        packageId: 'pkg-captain-60',
        serviceId: CAPTAIN_60_SERVICE,
        flightDate: '2026-11-13',
      });
    }
  });

  it('issues and verifies prepaid claims defaulting to 0%', async () => {
    const token = await issuePromotionClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      promoKind: 'prepaid',
      secret: SECRET,
      now: NOW,
    });

    await expect(verifyPromotionClaim(token, SECRET, NOW)).resolves.toMatchObject({
      promoKind: 'prepaid',
      discountPercent: 0,
      packageId: 'pkg-captain-60',
    });
  });

  it('rejects tampered, expired, and invalid-discount claims', async () => {
    const token = await issuePromotionClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      promoKind: 'loyalty',
      discountPercent: 7,
      secret: SECRET,
      now: NOW,
    });

    await expect(verifyPromotionClaim(`${token}x`, SECRET, NOW)).resolves.toBeNull();
    await expect(verifyPromotionClaim(token, SECRET, new Date('2026-11-01T12:11:00.000Z'))).resolves.toBeNull();
    await expect(
      issuePromotionClaim({
        packageId: 'pkg-captain-60',
        serviceId: CAPTAIN_60_SERVICE,
        flightDate: '2026-11-13',
        promoKind: 'prepaid',
        discountPercent: 10,
        secret: SECRET,
        now: NOW,
      })
    ).rejects.toThrow();
    await expect(
      issuePromotionClaim({
        packageId: 'pkg-captain-60',
        serviceId: CAPTAIN_60_SERVICE,
        flightDate: '2026-11-13',
        promoKind: 'loyalty',
        discountPercent: 15,
        secret: SECRET,
        now: NOW,
      })
    ).rejects.toThrow();
  });
});

describe('unified pricing provider evaluation', () => {
  it('applies 5%, 7%, and 10% loyalty discounts with whole-shekel half-up rounding', async () => {
    // pkg-captain-60 standard price is 690 ILS:
    // 5% -> 34.5 -> 35 off -> 655
    // 7% -> 48.3 -> 48 off -> 642
    // 10% -> 69 -> 69 off -> 621
    const expected: Record<5 | 7 | 10, number> = { 5: 655, 7: 642, 10: 621 };

    for (const discountPercent of [5, 7, 10] as const) {
      const token = await issuePromotionClaim({
        packageId: 'pkg-captain-60',
        serviceId: CAPTAIN_60_SERVICE,
        flightDate: '2026-11-13',
        promoKind: 'loyalty',
        discountPercent,
        secret: SECRET,
        now: NOW,
      });

      const booking = {
        bookedEntity: {
          slot: {
            serviceId: CAPTAIN_60_SERVICE,
            startDate: '2026-11-13T08:00:00.000Z',
            timezone: 'Asia/Jerusalem',
          },
        },
        additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
      };

      await expect(calculateWixBookingPrice(booking, { config: CONFIG, now: NOW })).resolves.toEqual({
        ok: true,
        calculatedPrice: expected[discountPercent],
        birthdayApplied: false,
        discountApplied: true,
        discountPercent,
        promoKind: 'loyalty',
      });
      await expect(calculateWixBirthdayBookingPrice(booking, { config: CONFIG, now: NOW })).resolves.toEqual({
        ok: true,
        calculatedPrice: expected[discountPercent],
        birthdayApplied: false,
      });
    }
  });

  it('returns standard registry price with 0% discount for prepaid claims', async () => {
    const token = await issuePromotionClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      promoKind: 'prepaid',
      secret: SECRET,
      now: NOW,
    });

    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: CAPTAIN_60_SERVICE,
              startDate: '2026-11-13T08:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({
      ok: true,
      calculatedPrice: 690,
      birthdayApplied: false,
      discountApplied: false,
      discountPercent: 0,
      promoKind: 'prepaid',
    });
  });

  it('enforces category and non-stackable daytime-promo eligibility for loyalty claims', async () => {
    const promoToken = await issuePromotionClaim({
      packageId: 'pkg-promo-45',
      serviceId: PROMO_45_SERVICE,
      flightDate: '2026-11-10',
      promoKind: 'loyalty',
      discountPercent: 10,
      secret: SECRET,
      now: NOW,
    });
    const proToken = await issuePromotionClaim({
      packageId: 'pkg-pro-60',
      serviceId: PRO_60_SERVICE,
      flightDate: '2026-11-10',
      promoKind: 'loyalty',
      discountPercent: 10,
      secret: SECRET,
      now: NOW,
    });

    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: PROMO_45_SERVICE,
              startDate: '2026-11-10T08:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: CONFIG.claimFieldId, value: promoToken }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toMatchObject({ ok: true, calculatedPrice: 490, discountApplied: false, discountPercent: 0 });

    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: PRO_60_SERVICE,
              startDate: '2026-11-10T08:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: CONFIG.claimFieldId, value: proToken }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toMatchObject({ ok: true, calculatedPrice: 950, discountApplied: false, discountPercent: 0 });
  });

  it('verifies identityKeys against contactDetails and falls back to standard price on mismatch', async () => {
    const emailDigest = await hmacHex(SECRET, 'email:captain@example.com');
    const token = await issuePromotionClaim({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60_SERVICE,
      flightDate: '2026-11-13',
      promoKind: 'loyalty',
      discountPercent: 10,
      identityKeys: [emailDigest],
      secret: SECRET,
      now: NOW,
    });

    const baseSlot = {
      serviceId: CAPTAIN_60_SERVICE,
      startDate: '2026-11-13T08:00:00.000Z',
      timezone: 'Asia/Jerusalem',
    };

    // Matching email applies 10% (690 -> 621)
    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: { slot: baseSlot },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
          contactDetails: { email: '  CAPTAIN@Example.com ' },
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toMatchObject({ ok: true, calculatedPrice: 621, discountApplied: true, discountPercent: 10 });

    // Mismatching email falls back to standard 690
    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: { slot: baseSlot },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
          contactDetails: { email: 'other@example.com' },
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toMatchObject({ ok: true, calculatedPrice: 690, discountApplied: false, discountPercent: 0 });

    // Custom verifyIdentity seam overrides default matching
    const verifyIdentity = vi.fn().mockReturnValue(false);
    await expect(
      calculateWixBookingPrice(
        {
          bookedEntity: { slot: baseSlot },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
          contactDetails: { email: 'captain@example.com' },
        },
        { config: CONFIG, now: NOW, verifyIdentity }
      )
    ).resolves.toMatchObject({ ok: true, calculatedPrice: 690, discountApplied: false });
    expect(verifyIdentity).toHaveBeenCalledWith({ email: 'captain@example.com' }, [emailDigest]);
  });
});
