import { describe, expect, it, vi } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import { createWixBirthdayPricingClaim, verifyWixBirthdayPricingClaim } from '@/lib/wix/birthday-pricing-claim';
import { verifiedWixBirthdayPricingBooking } from '@/lib/wix/birthday-pricing-provider-auth';
import {
  calculateWixBirthdayBookingPrice,
  calculateWixBookingPrice,
  issueWixBirthdayPricingClaim,
  type WixBirthdayPricingProviderConfig,
} from '@/lib/wix/birthday-pricing-server';
import { WIX_SERVICE_IDS, wixServiceIdFor } from '@/lib/wix/catalog';
import { resolveWixBookingCheckout, WixBookingUnavailableError } from '@/lib/wix/booking-checkout';
import { isOnStrictWixGrid } from '@/lib/wix/booking-grid-policy';
import { wixGridEnforcement, wixGridEnforcementReport } from '@/lib/wix/booking-grid-enforcement';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { minutesToTime } from '@/lib/scheduler/kantorovich-engine';

// Only the grid-agreement test reads these: Wix itself stays out of the unit suite.
const wix = vi.hoisted(() => ({ listWixServices: vi.fn(), listWixAvailability: vi.fn() }));
vi.mock('@/lib/wix/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wix/config')>()),
  isWixConfigured: () => true,
}));
vi.mock('@/lib/wix/bookings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wix/bookings')>()),
  listWixServices: wix.listWixServices,
  listWixAvailability: wix.listWixAvailability,
}));

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
              startDate: '2026-11-13T08:15:00.000Z',
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
              startDate: '2026-11-14T17:30:00.000Z',
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
              startDate: '2026-11-14T17:30:00.000Z',
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
              startDate: '2026-11-14T08:15:00.000Z',
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

describe('Wix pricing provider binds every priced booking to the local zero-waste grid', () => {
  // A Tuesday in Israel standard time (UTC+2), so the 45-minute Discounted Promotion is on sale before 18:00.
  const GRID_DAY = '2026-11-10';
  // The second departure of each package's empty-day cadence: 09:00 plus one reserved block.
  const SECOND_DEPARTURE: Readonly<Record<string, string>> = {
    'pkg-discovery-30': '09:45',
    'pkg-promo-45': '10:00',
    'pkg-captain-60': '10:15',
    'pkg-ultimate-90': '10:45',
    'pkg-pro-60': '10:15',
    'pkg-pro-90': '10:45',
    'pkg-assessment-prep-120': '11:30',
    'pkg-fear-of-flying-90': '10:15',
    'pkg-corporate-crm': '13:15',
  };

  function slotAt(packageId: string, startDate: string, timezone = 'Asia/Jerusalem') {
    return { bookedEntity: { slot: { serviceId: wixServiceIdFor(packageId)!, startDate, timezone } } };
  }

  function israelTime(time: string, minutesLater = 0): string {
    const [hours, minutes] = time.split(':').map(Number);
    const total = hours * 60 + minutes + minutesLater;
    return `${GRID_DAY}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00+02:00`;
  }

  async function captainClaim() {
    const claim = await issueWixBirthdayPricingClaim(
      { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: GRID_DAY },
      { config: CONFIG, now: NOW, today: '2026-11-01' }
    );
    if (!claim.ok || !claim.applied) throw new Error('expected an eligible birthday claim');
    return [{ id: claim.fieldId, value: claim.token }];
  }

  it('covers every mapped package', () => {
    expect(Object.keys(SECOND_DEPARTURE).sort()).toEqual(SIMULATOR_PACKAGES.map((pkg) => pkg.id).sort());
  });

  it('prices an on-grid start of every package duration exactly as before, claim or no claim', async () => {
    for (const pkg of SIMULATOR_PACKAGES) {
      await expect(
        calculateWixBirthdayBookingPrice(slotAt(pkg.id, israelTime(SECOND_DEPARTURE[pkg.id])), { config: CONFIG, now: NOW })
      ).resolves.toEqual({ ok: true, calculatedPrice: pkg.priceIls, birthdayApplied: false });
    }
    await expect(
      calculateWixBirthdayBookingPrice(
        { ...slotAt('pkg-captain-60', israelTime('10:15')), additionalFields: await captainClaim() },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 586, birthdayApplied: true });
  });

  it('rejects a start 5 minutes after a grid departure with off-grid-departure, with or without a valid claim', async () => {
    for (const pkg of SIMULATOR_PACKAGES) {
      await expect(
        calculateWixBookingPrice(slotAt(pkg.id, israelTime(SECOND_DEPARTURE[pkg.id], 5)), { config: CONFIG, now: NOW })
      ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
    }
    await expect(
      calculateWixBirthdayBookingPrice(
        { ...slotAt('pkg-captain-60', israelTime('10:15', 5)), additionalFields: await captainClaim() },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
  });

  it('rejects the 45-minute promotion outside its Sunday-Tuesday daytime grid', async () => {
    await expect(
      calculateWixBookingPrice(slotAt('pkg-promo-45', israelTime('18:00')), { config: CONFIG, now: NOW })
    ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
    await expect(
      calculateWixBookingPrice(slotAt('pkg-promo-45', '2026-11-13T08:00:00.000Z'), { config: CONFIG, now: NOW })
    ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
  });

  it('reads the Israel wall clock from the instant, never from the booking time-zone label', async () => {
    // 08:15Z is 10:15 in Israel (on the 60-minute grid); 10:15Z is 12:15 in Israel (off it).
    await expect(
      calculateWixBirthdayBookingPrice(slotAt('pkg-captain-60', `${GRID_DAY}T08:15:00.000Z`, 'UTC'), { config: CONFIG, now: NOW })
    ).resolves.toEqual({ ok: true, calculatedPrice: 690, birthdayApplied: false });
    await expect(
      calculateWixBookingPrice(slotAt('pkg-captain-60', `${GRID_DAY}T10:15:00.000Z`, 'UTC'), { config: CONFIG, now: NOW })
    ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
  });

  it('refuses a start it cannot place on the Israel wall clock to the minute', async () => {
    for (const startDate of [`${GRID_DAY}T10:15:00`, `${GRID_DAY}T08:15:30.000Z`]) {
      await expect(
        calculateWixBookingPrice(slotAt('pkg-captain-60', startDate), { config: CONFIG, now: NOW })
      ).resolves.toEqual({ ok: false, code: 'off-grid-departure' });
    }
  });

  it('keeps today\'s answer for a service that maps to no SimDream package', async () => {
    await expect(
      calculateWixBookingPrice(
        { bookedEntity: { slot: { serviceId: '0f0f0f0f-0000-4000-8000-000000000000', startDate: israelTime('10:20') } } },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: false, code: 'unsupported-service' });
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

describe('Strict Wix booking grid policy', () => {
  // A Tuesday far enough ahead that no departure has left, so only the grid and Wix can refuse a start.
  const SAMPLE_DAY = '2099-05-12';
  const EVERY_FIVE_MINUTES = Array.from({ length: 180 }, (_, index) => minutesToTime(9 * 60 + index * 5));

  it('accepts exactly the starts resolveWixBookingCheckout accepts on a sample day', async () => {
    wix.listWixServices.mockResolvedValue(
      Object.values(WIX_SERVICE_IDS).map((id) => ({
        id,
        locations: [{ id: 'location-id', type: 'BUSINESS' }],
        payment: { options: { online: true, inPerson: false } },
      }))
    );
    // Wix offers every five-minute start, so any start it refuses was refused by the local grid.
    wix.listWixAvailability.mockResolvedValue({
      timeZone: 'Asia/Jerusalem',
      timeSlots: EVERY_FIVE_MINUTES.map((time) => ({
        localStartDate: `${SAMPLE_DAY}T${time}:00`,
        localEndDate: `${SAMPLE_DAY}T${time}:00`,
        bookable: true,
      })),
    });

    for (const pkg of SIMULATOR_PACKAGES) {
      const resolved: string[] = [];
      for (const startTime of EVERY_FIVE_MINUTES) {
        try {
          await resolveWixBookingCheckout({ packageId: pkg.id, bookingDate: SAMPLE_DAY, startTime });
          resolved.push(startTime);
        } catch (error) {
          if (!(error instanceof WixBookingUnavailableError)) throw error;
        }
      }
      expect(resolved.length, pkg.id).toBeGreaterThan(0);
      expect(EVERY_FIVE_MINUTES.filter((time) => isOnStrictWixGrid(pkg.id, SAMPLE_DAY, time)), pkg.id).toEqual(resolved);
    }

    expect(EVERY_FIVE_MINUTES.filter((time) => isOnStrictWixGrid('pkg-captain-60', SAMPLE_DAY, time))).toEqual([
      '09:00', '10:15', '11:30', '12:45', '14:00', '15:15', '16:30', '17:45', '19:00', '20:15', '21:30', '22:45',
    ]);
    expect(isOnStrictWixGrid('pkg-unknown', SAMPLE_DAY, '09:00')).toBe(false);
  });
});

describe('Scheduling grid enforcement state', () => {
  const PROVIDER_ENV: Readonly<Record<string, string>> = {
    WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED: 'true',
    WIX_BIRTHDAY_CLAIM_FIELD_ID: '11111111-2222-4333-8444-555555555555',
    WIX_BIRTHDAY_CLAIM_SECRET: SECRET,
    WIX_BIRTHDAY_PRICING_PROVIDER_APP_ID: '66666666-7777-4888-9999-aaaaaaaaaaaa',
    WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----',
  };

  it("is 'provider' only while the pricing provider is fully configured", () => {
    for (const [name, value] of Object.entries(PROVIDER_ENV)) vi.stubEnv(name, value);
    expect(wixGridEnforcement()).toBe('provider');

    vi.stubEnv('WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY', '');
    expect(wixGridEnforcement()).toBe('none');

    vi.stubEnv('WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY', PROVIDER_ENV.WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY);
    vi.stubEnv('WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED', 'false');
    expect(wixGridEnforcement()).toBe('none');
  });

  it('prints one readiness line and warns only while the adapter is on and nothing binds the grid', () => {
    expect(wixGridEnforcementReport({ enforcement: 'provider', availabilityAdapterEnabled: true })).toEqual({
      line: 'Scheduling grid enforcement: provider',
      warning: null,
    });
    expect(wixGridEnforcementReport({ enforcement: 'none', availabilityAdapterEnabled: false })).toEqual({
      line: 'Scheduling grid enforcement: none',
      warning: null,
    });
    expect(wixGridEnforcementReport({ enforcement: 'none', availabilityAdapterEnabled: true })).toEqual({
      line: 'Scheduling grid enforcement: none',
      warning:
        'WARN: off-grid Wix bookings are possible until the pricing provider is active or Wix service scheduling is configured to the same grid.',
    });
  });
});
