import { describe, expect, it, vi } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import {
  createWixBirthdayPricingClaim,
  issuePromotionClaim,
  verifyPromotionClaim,
  verifyWixBirthdayPricingClaim,
  type CreateWixBirthdayPricingClaimInput,
  type IssuePromotionClaimInput,
} from '@/lib/wix/birthday-pricing-claim';
import { birthdayClaimIdentityKeys } from '@/lib/wix/birthday-claim-identity';
import { verifiedWixBirthdayPricingBooking } from '@/lib/wix/birthday-pricing-provider-auth';
import {
  calculateWixBirthdayBookingPrice,
  calculateWixBookingPrice,
  issueWixBirthdayPricingClaim,
  type WixBirthdayPricingProviderConfig,
  type WixPricingContactDetails,
} from '@/lib/wix/birthday-pricing-server';
import { wixBirthdayClaimRequestBody } from '@/lib/booking/client/wix-birthday-claim';
import { normalizeWixBookingPhone } from '@/lib/wix/booking-checkout-client';
import { WIX_SERVICE_IDS, wixServiceIdFor } from '@/lib/wix/catalog';
import { resolveWixBookingCheckout, WixBookingUnavailableError } from '@/lib/wix/booking-checkout';
import { isOnStrictWixGrid } from '@/lib/wix/booking-grid-policy';
import { wixGridEnforcement, wixGridEnforcementReport } from '@/lib/wix/booking-grid-enforcement';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { minutesToTime } from '@/lib/scheduler/kantorovich-engine';
import { signLegacyUnboundBirthdayClaimForTests } from '../support/legacy-birthday-claim';

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
/** The pilot as the booking form holds them, and as `prepareWixBookingCheckout` hands them to Wix. */
const PILOT = { email: '  Captain@Example.com ', phone: '050-123 4567' };
const PILOT_CONTACT: WixPricingContactDetails = {
  firstName: 'Dana',
  lastName: 'Levi',
  email: PILOT.email.trim(),
  phone: normalizeWixBookingPhone(PILOT.phone),
};
/** The identity keys the issuer derives for PILOT: a claim built with them is bound to PILOT_CONTACT. */
const pilotIdentityKeys = () => birthdayClaimIdentityKeys({ email: PILOT.email, phone: PILOT.phone }, SECRET);

describe('Wix birthday pricing claim', () => {
  it('is short lived, tamper evident, and contains no birth year', async () => {
    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-captain-60',
      serviceId: wixServiceIdFor('pkg-captain-60')!,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      identityKeys: await pilotIdentityKeys(),
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
      { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: '2026-11-13', ...PILOT },
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
          contactDetails: PILOT_CONTACT,
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 586, birthdayApplied: true });
  });

  it('keeps the normal price with no claim and uses the flat ₪850 90-minute tariff before discounting', async () => {
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
    ).resolves.toEqual({ ok: true, calculatedPrice: 850, birthdayApplied: false });

    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-ultimate-90',
      serviceId: wixServiceIdFor('pkg-ultimate-90')!,
      flightDate: '2026-11-14',
      birthdayMonth: 11,
      birthdayDay: 14,
      identityKeys: await pilotIdentityKeys(),
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
          contactDetails: PILOT_CONTACT,
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 722, birthdayApplied: true });
  });

  it('fails closed when a claim is bound to a different flight date or service', async () => {
    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-captain-60',
      serviceId: wixServiceIdFor('pkg-captain-60')!,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      identityKeys: await pilotIdentityKeys(),
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
          contactDetails: PILOT_CONTACT,
        },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: false, code: 'invalid-birthday-claim' });
  });

  it('refuses to mint a birthday claim that is not bound to a contact', async () => {
    const selection = {
      packageId: 'pkg-captain-60',
      serviceId: wixServiceIdFor('pkg-captain-60')!,
      flightDate: '2026-11-13',
      birthdayMonth: 11,
      birthdayDay: 25,
      secret: SECRET,
      now: NOW,
    };
    for (const identityKeys of [[], ['']]) {
      await expect(createWixBirthdayPricingClaim({ ...selection, identityKeys })).rejects.toThrow(RangeError);
      await expect(issuePromotionClaim({ ...selection, promoKind: 'birthday', identityKeys })).rejects.toThrow(RangeError);
    }
    // A caller that slips past the types (plain JavaScript) is refused as well.
    await expect(createWixBirthdayPricingClaim(selection as unknown as CreateWixBirthdayPricingClaimInput)).rejects.toThrow(RangeError);
    await expect(issuePromotionClaim(selection as unknown as IssuePromotionClaimInput)).rejects.toThrow(RangeError);
  });
});

describe('Wix birthday claim is bound to the pilot contact it was issued for', () => {
  const CAPTAIN_60 = wixServiceIdFor('pkg-captain-60')!;
  const STANDARD = { ok: true, calculatedPrice: 690, birthdayApplied: false };
  const DISCOUNTED = { ok: true, calculatedPrice: 586, birthdayApplied: true };

  async function issuedClaimFields(contact: { email?: string; phone?: string } = PILOT) {
    const claim = await issueWixBirthdayPricingClaim(
      { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: '2026-11-13', ...contact },
      { config: CONFIG, now: NOW, today: '2026-11-01' }
    );
    if (!claim.ok || !claim.applied) throw new Error('expected an eligible birthday claim');
    return [{ id: claim.fieldId, value: claim.token }];
  }

  function captainBooking(
    additionalFields: Array<{ id: string; value: string }>,
    contactDetails?: WixPricingContactDetails
  ) {
    return {
      bookedEntity: { slot: { serviceId: CAPTAIN_60, startDate: '2026-11-13T08:15:00.000Z', timezone: 'Asia/Jerusalem' } },
      additionalFields,
      ...(contactDetails ? { contactDetails } : {}),
    };
  }

  function decodedPayload(token: string): Record<string, unknown> {
    const encoded = token.split('.')[0]!.replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(encoded + '='.repeat((4 - (encoded.length % 4)) % 4))) as Record<string, unknown>;
  }

  it('refuses to issue a claim without a valid email', async () => {
    const selection = { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: '2026-11-13' };
    for (const contact of [{}, { email: '' }, { email: 'not-an-email' }, { email: `${'a'.repeat(250)}@example.com` }, { phone: PILOT.phone }]) {
      await expect(
        issueWixBirthdayPricingClaim({ ...selection, ...contact }, { config: CONFIG, now: NOW, today: '2026-11-01' })
      ).resolves.toEqual({ ok: false, reason: 'invalid-request' });
    }
  });

  it('embeds keyed digests of the email and phone, never the contact itself', async () => {
    const [field] = await issuedClaimFields();
    const payload = decodedPayload(field!.value);
    expect(payload.i).toHaveLength(2);
    for (const contactPart of ['@', 'example.com', '050-123', '0501234567', '972501234567']) {
      expect(JSON.stringify(payload)).not.toContain(contactPart);
    }
    expect(decodedPayload((await issuedClaimFields({ email: PILOT.email }))[0]!.value).i).toHaveLength(1);
  });

  it('discounts a booking whose email or phone is the one the claim was issued for', async () => {
    const fields = await issuedClaimFields();
    await expect(calculateWixBirthdayBookingPrice(captainBooking(fields, PILOT_CONTACT), { config: CONFIG, now: NOW })).resolves.toEqual(DISCOUNTED);
    await expect(
      calculateWixBirthdayBookingPrice(captainBooking(fields, { email: 'CAPTAIN@example.com' }), { config: CONFIG, now: NOW })
    ).resolves.toEqual(DISCOUNTED);
    await expect(
      calculateWixBirthdayBookingPrice(captainBooking(fields, { email: 'someone@example.com', phone: '+972501234567' }), { config: CONFIG, now: NOW })
    ).resolves.toEqual(DISCOUNTED);
  });

  it('prices a booking for a different contact at the standard price', async () => {
    const fields = await issuedClaimFields();
    for (const contactDetails of [{ email: 'other@example.com' }, { ...PILOT_CONTACT, email: 'other@example.com', phone: '+972509999999' }]) {
      await expect(calculateWixBirthdayBookingPrice(captainBooking(fields, contactDetails), { config: CONFIG, now: NOW })).resolves.toEqual(STANDARD);
    }
  });

  it('prices a booking without contact details at the standard price', async () => {
    const fields = await issuedClaimFields();
    await expect(calculateWixBirthdayBookingPrice(captainBooking(fields), { config: CONFIG, now: NOW })).resolves.toEqual(STANDARD);
    await expect(calculateWixBirthdayBookingPrice(captainBooking(fields, {}), { config: CONFIG, now: NOW })).resolves.toEqual(STANDARD);
    // The booking arrives as decoded JSON, so a null contact block must not break pricing either.
    const nullContact = { ...captainBooking(fields), contactDetails: null as unknown as WixPricingContactDetails };
    await expect(calculateWixBirthdayBookingPrice(nullContact, { config: CONFIG, now: NOW })).resolves.toEqual(STANDARD);
  });

  it('keeps discounting a claim issued before identity binding until it expires', async () => {
    const legacy = await signLegacyUnboundBirthdayClaimForTests({
      packageId: 'pkg-captain-60',
      serviceId: CAPTAIN_60,
      flightDate: '2026-11-13',
      birthdayMonthDay: '11-25',
      secret: SECRET,
      now: NOW,
    });
    const fields = [{ id: CONFIG.claimFieldId, value: legacy }];
    await expect(calculateWixBirthdayBookingPrice(captainBooking(fields), { config: CONFIG, now: NOW })).resolves.toEqual(DISCOUNTED);
    await expect(
      calculateWixBirthdayBookingPrice(captainBooking(fields, { email: 'other@example.com' }), { config: CONFIG, now: NOW })
    ).resolves.toEqual(DISCOUNTED);
    await expect(
      calculateWixBirthdayBookingPrice(captainBooking(fields), { config: CONFIG, now: new Date('2026-11-01T12:10:00.000Z') })
    ).resolves.toEqual({ ok: false, code: 'invalid-birthday-claim' });
  });

  it('carries an expiry and a purpose, and is refused for another purpose, service or flight date', async () => {
    const [field] = await issuedClaimFields();
    const token = field!.value;
    await expect(verifyPromotionClaim(token, SECRET, NOW)).resolves.toMatchObject({
      promoKind: 'birthday',
      discountPercent: 15,
      expiresAt: NOW.getTime() / 1_000 + 600,
    });
    expect(decodedPayload(token).e).toBe(NOW.getTime() / 1_000 + 600);

    // The purpose is signed: relabelling the birthday claim as a loyalty claim breaks the signature.
    const relabelled = { ...decodedPayload(token), k: 'loyalty', d: 10 };
    const relabelledToken = `${btoa(JSON.stringify(relabelled)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.${token.split('.')[1]}`;
    const odyssey = wixServiceIdFor('pkg-ultimate-90')!;
    for (const booking of [
      captainBooking([{ id: CONFIG.claimFieldId, value: relabelledToken }], PILOT_CONTACT),
      // Another service on the same date and departure grid day.
      { ...captainBooking([field!], PILOT_CONTACT), bookedEntity: { slot: { serviceId: odyssey, startDate: '2026-11-13T08:45:00.000Z' } } },
      // The same service a day later.
      { ...captainBooking([field!], PILOT_CONTACT), bookedEntity: { slot: { serviceId: CAPTAIN_60, startDate: '2026-11-14T08:15:00.000Z' } } },
    ]) {
      await expect(calculateWixBookingPrice(booking, { config: CONFIG, now: NOW })).resolves.toEqual({ ok: false, code: 'invalid-birthday-claim' });
    }
  });

  it('accepts the claim request body the browser sends for the contact the booking carries', async () => {
    const body = wixBirthdayClaimRequestBody({
      packageId: 'pkg-captain-60',
      birthDate: '1990-11-25',
      flightDate: '2026-11-13',
      pilotEmail: PILOT.email,
      pilotPhone: ` ${PILOT.phone} `,
    });
    expect(body).toEqual({
      packageId: 'pkg-captain-60',
      birthDate: '1990-11-25',
      flightDate: '2026-11-13',
      email: 'captain@example.com',
      phone: PILOT.phone,
    });
    expect(wixBirthdayClaimRequestBody({ packageId: 'p', birthDate: 'b', flightDate: 'f', pilotEmail: 'a@b.co', pilotPhone: ' ' })).not.toHaveProperty('phone');

    const claim = await issueWixBirthdayPricingClaim(body, { config: CONFIG, now: NOW, today: '2026-11-01' });
    if (!claim.ok || !claim.applied) throw new Error('expected an eligible birthday claim');
    await expect(
      calculateWixBirthdayBookingPrice(captainBooking([{ id: claim.fieldId, value: claim.token }], PILOT_CONTACT), { config: CONFIG, now: NOW })
    ).resolves.toEqual(DISCOUNTED);
  });
});

describe('Wix pricing provider reads the flight date and tariff on the Israel clock', () => {
  const ODYSSEY_90 = wixServiceIdFor('pkg-ultimate-90')!;
  // 10:45 on Tuesday 2026-11-10 in Israel (UTC+2): an on-grid daytime departure at the ₪850 tariff.
  // Read as Honolulu time it would be Monday 22:45 (prime time), as Kiritimati time Tuesday 22:45.
  const INSTANT = '2026-11-10T08:45:00.000Z';

  async function odysseyClaim(flightDate: string, birthdayMonth = 11) {
    const token = await createWixBirthdayPricingClaim({
      packageId: 'pkg-ultimate-90',
      serviceId: ODYSSEY_90,
      flightDate,
      birthdayMonth,
      birthdayDay: 25,
      identityKeys: await pilotIdentityKeys(),
      secret: SECRET,
      now: NOW,
    });
    return [{ id: CONFIG.claimFieldId, value: token }];
  }

  function odysseyAt(startDate: string | undefined, additionalFields?: Array<{ id: string; value: string }>) {
    return {
      bookedEntity: { slot: { serviceId: ODYSSEY_90, ...(startDate === undefined ? {} : { startDate }) } },
      contactDetails: PILOT_CONTACT,
      ...(additionalFields ? { additionalFields } : {}),
    };
  }

  it('gives the same instant the same flight date and price whatever timezone label the booking carries', async () => {
    const sameDayClaim = await odysseyClaim('2026-11-10');
    const dayBeforeClaim = await odysseyClaim('2026-11-09');
    for (const timezone of ['Asia/Jerusalem', 'UTC', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
      const booking = { bookedEntity: { slot: { serviceId: ODYSSEY_90, startDate: INSTANT, timezone } }, contactDetails: PILOT_CONTACT };
      await expect(calculateWixBirthdayBookingPrice(booking, { config: CONFIG, now: NOW }), timezone).resolves.toEqual({
        ok: true,
        calculatedPrice: 850,
        birthdayApplied: false,
      });
      await expect(
        calculateWixBirthdayBookingPrice({ ...booking, additionalFields: sameDayClaim }, { config: CONFIG, now: NOW }),
        timezone
      ).resolves.toEqual({ ok: true, calculatedPrice: 722, birthdayApplied: true });
      await expect(
        calculateWixBirthdayBookingPrice({ ...booking, additionalFields: dayBeforeClaim }, { config: CONFIG, now: NOW }),
        timezone
      ).resolves.toEqual({ ok: false, code: 'invalid-birthday-claim' });
    }
  });

  it('prices weekday departures before and from 18:00 on at the flat ₪850 90-minute tariff', async () => {
    // Tuesday 2026-11-10 in Israel (UTC+2): 17:45 is the last daytime departure of the 90-minute grid, 19:30 the next.
    await expect(calculateWixBirthdayBookingPrice(odysseyAt('2026-11-10T15:45:00.000Z'), { config: CONFIG, now: NOW })).resolves.toEqual({
      ok: true,
      calculatedPrice: 850,
      birthdayApplied: false,
    });
    await expect(calculateWixBirthdayBookingPrice(odysseyAt('2026-11-10T17:30:00.000Z'), { config: CONFIG, now: NOW })).resolves.toEqual({
      ok: true,
      calculatedPrice: 850,
      birthdayApplied: false,
    });
  });

  it('prices a Saturday daytime departure at the flat ₪850 90-minute tariff', async () => {
    // Saturday 2026-11-14 at 10:45 in Israel.
    await expect(calculateWixBirthdayBookingPrice(odysseyAt('2026-11-14T08:45:00.000Z'), { config: CONFIG, now: NOW })).resolves.toEqual({
      ok: true,
      calculatedPrice: 850,
      birthdayApplied: false,
    });
  });

  it('reads a summer-time (UTC+3) instant on the Israel clock', async () => {
    // Tuesday 2026-07-14: 07:45Z is 10:45 in Israel summer time (on the grid); read at UTC+2 it would be 09:45 (off it).
    for (const startDate of ['2026-07-14T07:45:00.000Z', '2026-07-14T10:45:00+03:00']) {
      await expect(calculateWixBirthdayBookingPrice(odysseyAt(startDate), { config: CONFIG, now: NOW }), startDate).resolves.toEqual({
        ok: true,
        calculatedPrice: 850,
        birthdayApplied: false,
      });
    }
    await expect(
      calculateWixBirthdayBookingPrice(odysseyAt('2026-07-14T07:45:00.000Z', await odysseyClaim('2026-07-14', 7)), { config: CONFIG, now: NOW })
    ).resolves.toEqual({ ok: true, calculatedPrice: 722, birthdayApplied: true });
    // 16:30Z is 19:30 in Israel summer time (on the grid, flat ₪850).
    await expect(calculateWixBirthdayBookingPrice(odysseyAt('2026-07-14T16:30:00.000Z'), { config: CONFIG, now: NOW })).resolves.toEqual({
      ok: true,
      calculatedPrice: 850,
      birthdayApplied: false,
    });
  });

  it('refuses a missing or unparseable startDate with invalid-flight-date', async () => {
    for (const startDate of [undefined, '', 'not-a-date', '2026-13-45T10:00:00Z']) {
      await expect(calculateWixBookingPrice(odysseyAt(startDate), { config: CONFIG, now: NOW }), String(startDate)).resolves.toEqual({
        ok: false,
        code: 'invalid-flight-date',
      });
    }
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
      { packageId: 'pkg-captain-60', birthDate: '1990-11-25', flightDate: GRID_DAY, ...PILOT },
      { config: CONFIG, now: NOW, today: '2026-11-01' }
    );
    if (!claim.ok || !claim.applied) throw new Error('expected an eligible birthday claim');
    return [{ id: claim.fieldId, value: claim.token }];
  }

  const MAPPED_PACKAGES = SIMULATOR_PACKAGES.filter((pkg) => Boolean(wixServiceIdFor(pkg.id)));

  it('covers every mapped package', () => {
    expect(Object.keys(SECOND_DEPARTURE).sort()).toEqual(MAPPED_PACKAGES.map((pkg) => pkg.id).sort());
  });

  it('prices an on-grid start of every package duration exactly as before, claim or no claim', async () => {
    for (const pkg of MAPPED_PACKAGES) {
      await expect(
        calculateWixBirthdayBookingPrice(slotAt(pkg.id, israelTime(SECOND_DEPARTURE[pkg.id])), { config: CONFIG, now: NOW })
      ).resolves.toEqual({ ok: true, calculatedPrice: pkg.priceIls, birthdayApplied: false });
    }
    await expect(
      calculateWixBirthdayBookingPrice(
        { ...slotAt('pkg-captain-60', israelTime('10:15')), additionalFields: await captainClaim(), contactDetails: PILOT_CONTACT },
        { config: CONFIG, now: NOW }
      )
    ).resolves.toEqual({ ok: true, calculatedPrice: 586, birthdayApplied: true });
  });

  it('rejects a start 5 minutes after a grid departure with off-grid-departure, with or without a valid claim', async () => {
    for (const pkg of MAPPED_PACKAGES) {
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

    for (const pkg of SIMULATOR_PACKAGES.filter((candidate) => Boolean(wixServiceIdFor(candidate.id)))) {
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
