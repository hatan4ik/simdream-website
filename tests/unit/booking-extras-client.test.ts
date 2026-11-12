import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_EXTRAS_COPY,
  WIX_CART_NOTE_MAX_LENGTH,
  birthdayDateBounds,
  birthdayStatusKind,
  buildCheckoutExtraPayload,
  buildWixConsentNote,
  evaluateBirthdayField,
  findBookingBlocker,
  firstMissingConsent,
  resolveBirthdayPathMode,
  type BirthdayFieldInputs,
} from '@/lib/booking/client';
import {
  BIRTHDAY_MAX_PILOT_AGE_YEARS,
  BIRTHDAY_MIN_PILOT_AGE_YEARS,
  addDays,
  evaluateBirthdayDiscount,
  formatIsoDate,
  parseIsoDate,
} from '@/lib/discounts/birthday';
import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from '@/lib/legal';
import { LANGUAGES } from '@/lib/i18n/translations';

const FLIGHT = '2026-11-13';
const TODAY = '2026-11-01';
const field = (overrides: Partial<BirthdayFieldInputs> = {}): BirthdayFieldInputs => ({
  value: '1990-11-25',
  packageId: 'pkg-captain-60',
  flightDate: FLIGHT,
  subtotalIls: 690,
  mode: 'local',
  today: TODAY,
  ...overrides,
});
const dayBefore = (iso: string) => formatIsoDate(addDays(parseIsoDate(iso)!, -1));
const dayAfter = (iso: string) => formatIsoDate(addDays(parseIsoDate(iso)!, 1));

describe('resolveBirthdayPathMode', () => {
  it.each([
    [{ wixAuthoritative: false, isWixSubscriptionRedemption: false }, 'local'],
    [{ wixAuthoritative: true, isWixSubscriptionRedemption: false }, 'wix'],
    [{ wixAuthoritative: false, isWixSubscriptionRedemption: true }, 'subscription'],
    [{ wixAuthoritative: true, isWixSubscriptionRedemption: true }, 'subscription'],
  ] as const)('%j is the %s path', (inputs, mode) => {
    expect(resolveBirthdayPathMode(inputs)).toBe(mode);
  });
});

describe('birthdayDateBounds (the date control min and max)', () => {
  it('never blocks a date the engine accepts, and blocks only dates the engine refuses by more than a day', () => {
    const bounds = birthdayDateBounds(FLIGHT, TODAY)!;
    const verdict = (birthDate: string) => evaluateBirthdayDiscount({ birthDate, flightDate: FLIGHT, today: TODAY });
    // The loosest dates the control lets through: the engine is the final judge of each.
    expect(verdict(bounds.min).valid || verdict(dayAfter(bounds.min)).valid).toBe(true);
    // Everything inside the bounds that the engine calls valid stays inside: probe the edges.
    expect(verdict(dayAfter(bounds.min)).valid).toBe(true);
    expect(verdict(dayBefore(bounds.min)).error).toBe('pilot_too_old');
    expect(bounds.max <= TODAY).toBe(true);
    expect(verdict(dayAfter(bounds.max)).valid).toBe(false);
  });

  it('is derived from the engine constants, not retyped', () => {
    const bounds = birthdayDateBounds('2030-06-10', '2026-11-01')!;
    expect(Number(bounds.min.slice(0, 4))).toBe(2030 - (BIRTHDAY_MAX_PILOT_AGE_YEARS + 1));
    expect(bounds.max).toBe(`${2030 - BIRTHDAY_MIN_PILOT_AGE_YEARS}-06-11`);
  });

  it('never lets the control pass today (only reachable for a flight more than ten years away)', () => {
    expect(birthdayDateBounds('2040-06-10', '2026-11-01')!.max).toBe('2026-11-01');
    // A near flight: ten years before the flight, plus the one-day loosening.
    expect(birthdayDateBounds(FLIGHT, '2026-11-13')!.max).toBe(`${2026 - BIRTHDAY_MIN_PILOT_AGE_YEARS}-11-14`);
  });

  it('returns nothing for an unusable flight date', () => {
    expect(birthdayDateBounds('soon', TODAY)).toBeNull();
  });
});

describe('evaluateBirthdayField', () => {
  it('is empty and required before a date is entered', () => {
    expect(evaluateBirthdayField(field({ value: '' }))).toMatchObject({ status: 'empty', error: 'required', applied: false, discountIls: 0, birthday: null });
  });

  it('previews the 15 percent with the same engine as the server', () => {
    expect(evaluateBirthdayField(field())).toMatchObject({
      status: 'valid',
      applied: true,
      discountIls: 104,
      reason: 'same_month',
      birthday: { month: 11, day: 25 },
    });
  });

  it('reports the engine error for a bad date', () => {
    expect(evaluateBirthdayField(field({ value: '2020-01-01' }))).toMatchObject({ status: 'invalid', error: 'pilot_too_young', discountIls: 0 });
  });

  it('applies nothing on the Wix-hosted checkout or a subscription redemption, whatever the date', () => {
    expect(evaluateBirthdayField(field({ mode: 'wix' }))).toMatchObject({ status: 'valid', applied: false, discountIls: 0, blockedBy: 'checkout_path' });
    expect(evaluateBirthdayField(field({ mode: 'subscription' }))).toMatchObject({ applied: false, discountIls: 0, blockedBy: 'subscription_redemption' });
  });

  it('follows the flight date: the same birthday earns nothing on another month', () => {
    expect(evaluateBirthdayField(field({ flightDate: '2027-02-10' }))).toMatchObject({ applied: false, reason: 'none' });
  });

  it('applies nothing to the Discounted Promotion or PRO training', () => {
    expect(evaluateBirthdayField(field({ packageId: 'pkg-promo-45', subtotalIls: 490 }))).toMatchObject({ applied: false, blockedBy: 'discounted_promotion' });
    expect(evaluateBirthdayField(field({ packageId: 'pkg-pro-90', subtotalIls: 1285 }))).toMatchObject({ applied: false, blockedBy: 'category_excluded' });
  });
});

describe('birthdayStatusKind', () => {
  it('shows the banner only where the discount applies', () => {
    expect(birthdayStatusKind(evaluateBirthdayField(field()))).toBe('banner');
  });
  it('explains a date that earns nothing and a package that cannot carry the offer', () => {
    expect(birthdayStatusKind(evaluateBirthdayField(field({ value: '1990-06-15' })))).toBe('not_eligible');
    expect(birthdayStatusKind(evaluateBirthdayField(field({ packageId: 'pkg-promo-45', subtotalIls: 490 })))).toBe('not_applicable');
  });
  it('always carries the honest notice on the Wix-hosted checkout, with or without a date', () => {
    expect(birthdayStatusKind(evaluateBirthdayField(field({ mode: 'wix' })))).toBe('wix_notice');
    expect(birthdayStatusKind(evaluateBirthdayField(field({ mode: 'wix', value: '' })))).toBe('wix_notice');
  });
  it('shows nothing before a valid date, and nothing for a subscription (the hint says it)', () => {
    expect(birthdayStatusKind(evaluateBirthdayField(field({ value: '' })))).toBe('none');
    expect(birthdayStatusKind(evaluateBirthdayField(field({ value: '2020-01-01' })))).toBe('none');
    expect(birthdayStatusKind(evaluateBirthdayField(field({ mode: 'subscription' })))).toBe('none');
  });
});

describe('consent state and the checkout payload', () => {
  it('names the first missing confirmation in page order and never lets one imply the other', () => {
    expect(firstMissingConsent({ rules: false, media: false })).toBe('rules');
    expect(firstMissingConsent({ rules: false, media: true })).toBe('rules');
    expect(firstMissingConsent({ rules: true, media: false })).toBe('media');
    expect(firstMissingConsent({ rules: true, media: true })).toBeNull();
  });

  it('sends the two booleans, the page language and the typed date: no version, time or discount', () => {
    const payload = buildCheckoutExtraPayload({
      choices: { rules: true, media: true },
      language: 'ar',
      pilotBirthDate: '1990-11-25',
    });
    expect(payload).toEqual({
      consent: { rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, language: 'ar' },
      pilotBirthDate: '1990-11-25',
    });
    expect(JSON.stringify(payload)).not.toMatch(/version|acceptedAt|discount/i);
  });
});

describe('buildWixConsentNote (the Wix cart note)', () => {
  const at = '2026-11-11T10:00:00.000Z';

  it('carries the stamp, both confirmations, the versions, the language and the browser time', () => {
    const note = buildWixConsentNote({ language: 'he', confirmedAtIso: at, birthday: null });
    expect(note).toContain(CONSENT_VERSION);
    expect(note).toContain(LEGAL_DOCUMENT_VERSION);
    expect(note).toContain('page language he');
    expect(note).toContain(at);
    expect(note).toContain('media release and waiver of claims = accepted');
    expect(note).not.toContain('birthday');
  });

  it('passes on the birthday day and month only, and says no discount was applied automatically', () => {
    const note = buildWixConsentNote({ language: 'en', confirmedAtIso: at, birthday: { month: 11, day: 5 } });
    expect(note).toContain('05/11');
    expect(note).toContain('No birthday discount was applied automatically');
    expect(note).not.toMatch(/19\d\d|20\d\d-\d\d-\d\d birth/);
  });

  it('fits the 1000 characters Cart V2 allows for a note', () => {
    const note = buildWixConsentNote({ language: 'en', confirmedAtIso: at, birthday: { month: 12, day: 31 } });
    expect(note.length).toBeLessThanOrEqual(WIX_CART_NOTE_MAX_LENGTH);
    expect(note.length).toBeGreaterThan(100);
  });
});

describe('CHECKOUT_EXTRAS_COPY', () => {
  const codes = LANGUAGES.map((language) => language.code);

  it('has every key in all six languages, none empty', () => {
    expect(Object.keys(CHECKOUT_EXTRAS_COPY).sort()).toEqual([...codes].sort());
    const keys = Object.keys(CHECKOUT_EXTRAS_COPY.en);
    for (const code of codes) {
      const copy = CHECKOUT_EXTRAS_COPY[code];
      expect(Object.keys(copy).sort()).toEqual([...keys].sort());
      for (const value of Object.values(copy)) expect(value.trim().length).toBeGreaterThan(5);
    }
  });

  it('keeps scripts apart: no Hebrew in Arabic, no Arabic in Hebrew, no Hebrew or Arabic in the Latin and Cyrillic languages', () => {
    const hebrew = /[֐-׿]/;
    const arabic = /[؀-ۿ]/;
    for (const code of codes) {
      const text = Object.values(CHECKOUT_EXTRAS_COPY[code]).join(' ');
      if (code !== 'he') expect(hebrew.test(text), `${code} has Hebrew`).toBe(false);
      if (code !== 'ar') expect(arabic.test(text), `${code} has Arabic`).toBe(false);
    }
  });

  it('never promises a price reduction in the Wix-hosted notice', () => {
    expect(CHECKOUT_EXTRAS_COPY.en.birthdayWixNotice).toMatch(/cannot be applied automatically/);
  });
});

describe('the extras block every checkout path before anything is launched', () => {
  const ready = { hasAvailableSlot: true, pilotName: 'A B', pilotEmail: 'a@b.co', pilotPhone: '+972501234567', requiresUnsupportedLocalCheckout: false };
  const unmet = () => 'Please accept the rules.';

  it.each([
    ['the local Stripe checkout', { isWixSubscriptionRedemption: false }],
    ['the Wix-hosted checkout', { isWixSubscriptionRedemption: false }],
    ['a Wix subscription redemption (no pilot contact fields)', { isWixSubscriptionRedemption: true, pilotName: '', pilotEmail: '', pilotPhone: '' }],
  ])('stops %s while a confirmation or the birth date is missing', (_label, overrides) => {
    expect(findBookingBlocker({ ...ready, ...overrides, extraValidation: unmet })).toEqual({ kind: 'extra', message: unmet() });
    expect(findBookingBlocker({ ...ready, ...overrides, extraValidation: () => null })).toBeNull();
  });
});
