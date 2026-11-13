import { describe, expect, it } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import { createWixBirthdayPricingClaim, verifyWixBirthdayPricingClaim } from '@/lib/wix/birthday-pricing-claim';
import { verifiedWixBirthdayPricingBooking } from '@/lib/wix/birthday-pricing-provider-auth';
import {
  calculateWixBirthdayBookingPrice,
  issueWixBirthdayPricingClaim,
  type WixBirthdayPricingProviderConfig,
} from '@/lib/wix/birthday-pricing-server';
import { wixServiceIdFor } from '@/lib/wix/catalog';

const SECRET = 'birthday-pricing-secret-that-is-longer-than-thirty-two-bytes';
const CONFIG: WixBirthdayPricingProviderConfig = {
  claimFieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  claimSecret: SECRET,
  providerAppId: 'b4722fd-b7a0-4df0-b01d-b9b81f01bd11',
  providerPublicKey: '-----BEGIN PUBLIC KEY-----\nnot-used-in-price-unit-tests\n-----END PUBLIC KEY-----',
};
const NOW = new Date('2026-11-01T12:00:00.000Z');

describe('Wix birthday pricing claim', () => {
  it('is short lived, tamper evident, and contains no birth year', async () => {
    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-captain-60',
      serviceId: wixServiceIdFor('pkg-captain-60')!,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      secret: SECRET,
      now: NOW,
    });
    expect(token).not.toContain('1990');
    await expect(verifyWixBirthdayPricingClaim(token, SECRET, NOW)).resolves.toMatchObject({
      p: 'pkg-captain-60',
      b: '11-25',
      f: '2026-11-13',
    });
    await expect(verifyWixBirthdayPricingClaim(`${token}x`, SECRET, NOW)).resolves.toBeNull();
    await expect(verifyWixBirthdayPricingClaim(token, SECRET, new Date('2026-11-01T12:11:00.000Z'))).resolves.toBeNull();
  });
});

describe('Wix Bookings birthday price calculator', () => {
  it('issues a qualifying claim then returns the registry-backed 15% total', async () => {
    const claim = await issueWixBirthdayPricingClaim(
      { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: '2026-11-13' },
      { config: CONFIG, now: NOW, today: '2026-11-01' }
    );
    expect(claim).toMatchObject({ ok: true, applied: true });
    if (!claim.ok || !claim.applied) throw new Error('expected an eligible birthday claim');

    await expect(
      calculateWixBirthdayBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: wixServiceIdFor('pkg-captain-60')!,
              startDate: '2026-11-13T08:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: claim.fieldId, value: claim.token }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 586, birthdayApplied: true });
  });

  it('keeps the normal price with no claim and uses the Saturday prime-time tariff before discounting', async () => {
    await expect(
      calculateWixBirthdayBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: wixServiceIdFor('pkg-ultimate-90')!,
              startDate: '2026-11-14T17:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 950, birthdayApplied: false });

    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-ultimate-90',
      serviceId: wixServiceIdFor('pkg-ultimate-90')!,
      flightDate: '2026-11-14',
      birthdayMonth: 11,
      birthdayDay: 14,
      secret: SECRET,
      now: NOW,
    });
    await expect(
      calculateWixBirthdayBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: wixServiceIdFor('pkg-ultimate-90')!,
              startDate: '2026-11-14T17:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 807, birthdayApplied: true });
  });

  it('fails closed when a claim is bound to a different flight date or service', async () => {
    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-captain-60',
      serviceId: wixServiceIdFor('pkg-captain-60')!,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      secret: SECRET,
      now: NOW,
    });
    await expect(
      calculateWixBirthdayBookingPrice(
        {
          bookedEntity: {
            slot: {
              serviceId: wixServiceIdFor('pkg-captain-60')!,
              startDate: '2026-11-14T08:00:00.000Z',
              timezone: 'Asia/Jerusalem',
            },
          },
          additionalFields: [{ id: CONFIG.claimFieldId, value: token }],
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: false, code: 'invalid-birthday-claim' });
  });
});

describe('Wix pricing-provider request authentication', () => {
  it('accepts only a current Wix RS256 envelope for the configured Custom App', async () => {
    const now = new Date('2026-11-01T12:00:00.000Z');
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const config = { ...CONFIG, providerPublicKey: await exportSPKI(publicKey) };
    const booking = {
      bookedEntity: { slot: { serviceId: wixServiceIdFor('pkg-captain-60'), startDate: '2026-11-13T08:00:00.000Z' } },
    };
    const token = await new SignJWT({ data: { request: { booking } } })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('wix.com')
      .setAudience(config.providerAppId)
      .setIssuedAt(Math.floor(now.getTime() / 1_000) - 10)
      .setExpirationTime(Math.floor(now.getTime() / 1_000) + 10)
      .sign(privateKey);

    await expect(verifiedWixBirthdayPricingBooking(token, config, now)).resolves.toEqual(booking);
    const wrongAudience = await new SignJWT({ data: { request: { booking } } })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('wix.com')
      .setAudience('c4722fd-b7a0-4df0-b01d-b9b81f01bd11')
      .setIssuedAt(Math.floor(now.getTime() / 1_000) - 10)
      .setExpirationTime(Math.floor(now.getTime() / 1_000) + 10)
      .sign(privateKey);
    await expect(verifiedWixBirthdayPricingBooking(wrongAudience, config, now)).resolves.toBeNull();
  });
});
