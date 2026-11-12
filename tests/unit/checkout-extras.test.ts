import { describe, expect, it } from 'vitest';
import { resolveCheckoutExtras, type CheckoutExtrasInput } from '@/lib/booking/checkout-extras';
import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from '@/lib/legal';

/** The server's decision on the two checkout extras: consent record and birthday discount. */
const NOW = new Date('2026-11-01T06:15:00.000Z');
const input = (overrides: Partial<CheckoutExtrasInput> = {}): CheckoutExtrasInput => ({
  packageId: 'pkg-captain-60',
  bookingDate: '2026-11-13',
  subtotalIls: 690,
  pilotBirthDate: '1990-11-25',
  consent: { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, language: 'he' },
  now: NOW,
  today: '2026-11-01',
  ...overrides,
});

describe('resolveCheckoutExtras', () => {
  it('stamps the consent record with the server time, the current versions and the page language', () => {
    const result = resolveCheckoutExtras(input());
    expect(result.ok && result.consentRecord).toEqual({
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
      consentVersion: CONSENT_VERSION,
      acceptedAt: NOW.toISOString(),
      language: 'he',
      rulesRefundsAndPrivacy: true,
      mediaReleaseAndWaiver: true,
    });
  });

  it('prices an eligible birthday with the engine', () => {
    const result = resolveCheckoutExtras(input());
    expect(result.ok && result.birthday).toMatchObject({ applied: true, discountIls: 104, totalIls: 586, totalAgorot: 58_600 });
  });

  it.each([
    [{ rulesRefundsAndPrivacy: false, mediaReleaseAndWaiver: true }, 'rulesRefundsAndPrivacy'],
    [{ rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: false }, 'mediaReleaseAndWaiver'],
  ])('refuses %j, naming the missing confirmation', (flags, missing) => {
    const result = resolveCheckoutExtras(input({ consent: { ...flags, language: 'en' } }));
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain(missing);
  });

  it('refuses an unusable birth date with the message of the page language', () => {
    const young = resolveCheckoutExtras(input({ pilotBirthDate: '2020-01-01', consent: { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, language: 'ru' } }));
    expect(young).toMatchObject({ ok: false });
    expect(!young.ok && young.message).toMatch(/[Ѐ-ӿ]/);
    const future = resolveCheckoutExtras(input({ pilotBirthDate: '2027-02-02' }));
    expect(!future.ok && future.message).toMatch(/[֐-׿]/);
  });

  it('checks the birth date even where no discount can apply (PRO training)', () => {
    expect(resolveCheckoutExtras(input({ packageId: 'pkg-pro-90', subtotalIls: 1285, pilotBirthDate: '2020-01-01' }))).toMatchObject({ ok: false });
    const ok = resolveCheckoutExtras(input({ packageId: 'pkg-pro-90', subtotalIls: 1285 }));
    expect(ok.ok && ok.birthday).toMatchObject({ applied: false, discountIls: 0, totalIls: 1285 });
  });
});
