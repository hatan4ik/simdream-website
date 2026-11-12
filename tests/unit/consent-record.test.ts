import { describe, expect, it } from 'vitest';
import {
  CONSENT_CATEGORIES,
  CONSENT_CATEGORIES_IN_USE,
  CONSENT_RENEWAL_MONTHS,
  CONSENT_VERSION,
  consentExpiresAt,
  consentMode,
  createConsentRecord,
  isCategoryAllowed,
  isConsentCurrent,
  optionalCategoriesInUse,
  parseConsentRecord,
  serializeConsentRecord,
} from '@/lib/consent';

const NOW = new Date('2026-11-11T10:00:00.000Z');

describe('consent record', () => {
  it('has four categories, necessary first', () => {
    expect(CONSENT_CATEGORIES).toEqual(['necessary', 'preferences', 'analytics', 'marketing']);
  });

  it('builds a versioned record where necessary is always on and optional categories default to off', () => {
    const record = createConsentRecord({ analytics: true }, NOW);
    expect(record).toEqual({
      version: CONSENT_VERSION,
      decidedAt: '2026-11-11T10:00:00.000Z',
      categories: { necessary: true, preferences: false, analytics: true, marketing: false },
    });
  });

  it('round-trips through its serialized form', () => {
    const record = createConsentRecord({ preferences: true, marketing: true }, NOW);
    expect(parseConsentRecord(serializeConsentRecord(record))).toEqual(record);
  });

  it('forces necessary on even if a stored record says otherwise', () => {
    const tampered = JSON.stringify({
      version: 1,
      decidedAt: NOW.toISOString(),
      categories: { necessary: false, preferences: false, analytics: false, marketing: false },
    });
    expect(parseConsentRecord(tampered)?.categories.necessary).toBe(true);
  });

  it.each([
    ['null', null],
    ['empty', ''],
    ['not JSON', '{oops'],
    ['a number', '42'],
    ['an array', '[]'],
    ['no version', JSON.stringify({ decidedAt: NOW.toISOString(), categories: {} })],
    ['a fractional version', JSON.stringify({ version: 1.5, decidedAt: NOW.toISOString(), categories: {} })],
    ['a bad date', JSON.stringify({ version: 1, decidedAt: 'yesterday', categories: {} })],
    ['missing categories', JSON.stringify({ version: 1, decidedAt: NOW.toISOString() })],
    [
      'a non-boolean category',
      JSON.stringify({
        version: 1,
        decidedAt: NOW.toISOString(),
        categories: { preferences: 'yes', analytics: false, marketing: false },
      }),
    ],
  ])('treats %s as no decision', (_label, raw) => {
    expect(parseConsentRecord(raw)).toBeNull();
  });
});

describe('versioning and renewal', () => {
  it('renews after 12 months by default (documented constant)', () => {
    expect(CONSENT_RENEWAL_MONTHS).toBe(12);
  });

  it('counts the renewal period in calendar months from the decision', () => {
    const record = createConsentRecord({}, new Date('2026-02-28T12:00:00.000Z'));
    expect(consentExpiresAt(record).toISOString()).toBe('2027-02-28T12:00:00.000Z');
  });

  it('is current inside the period, expired at the boundary and after it', () => {
    const decided = new Date('2026-01-15T09:00:00.000Z');
    const record = createConsentRecord({ analytics: true }, decided);
    expect(isConsentCurrent(record, new Date('2026-06-01T00:00:00.000Z'))).toBe(true);
    expect(isConsentCurrent(record, new Date('2027-01-15T08:59:59.999Z'))).toBe(true);
    expect(isConsentCurrent(record, new Date('2027-01-15T09:00:00.000Z'))).toBe(false);
    expect(isConsentCurrent(record, new Date('2028-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('honours a shorter renewal period passed as a rule', () => {
    const record = createConsentRecord({}, new Date('2026-01-01T00:00:00.000Z'));
    expect(isConsentCurrent(record, new Date('2026-05-01T00:00:00.000Z'), { renewalMonths: 3 })).toBe(false);
    expect(isConsentCurrent(record, new Date('2026-03-01T00:00:00.000Z'), { renewalMonths: 3 })).toBe(true);
  });

  it('asks again when the consent version changes', () => {
    const record = createConsentRecord({ analytics: true }, NOW, 1);
    expect(isConsentCurrent(record, NOW, { version: 1 })).toBe(true);
    expect(isConsentCurrent(record, NOW, { version: 2 })).toBe(false);
  });

  it('counts a decision stamped ahead of the clock as current (clock skew, or a test that freezes time in the past)', () => {
    const ahead = createConsentRecord({}, new Date('2030-01-01T00:00:00.000Z'));
    expect(isConsentCurrent(ahead, NOW)).toBe(true);
    // ... and it still renews 12 months after the date it carries.
    expect(isConsentCurrent(ahead, new Date('2031-01-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('category gating', () => {
  it('always allows necessary, even with no record', () => {
    expect(isCategoryAllowed(null, 'necessary')).toBe(true);
  });

  it('denies every optional category without a record', () => {
    for (const category of ['preferences', 'analytics', 'marketing'] as const) {
      expect(isCategoryAllowed(null, category)).toBe(false);
    }
  });

  it('allows exactly what the record says', () => {
    const record = createConsentRecord({ analytics: true }, NOW);
    expect(isCategoryAllowed(record, 'analytics')).toBe(true);
    expect(isCategoryAllowed(record, 'marketing')).toBe(false);
    expect(isCategoryAllowed(record, 'preferences')).toBe(false);
  });
});

describe('what the banner offers', () => {
  it('uses only the necessary category today, so the banner is an informational notice', () => {
    expect(CONSENT_CATEGORIES_IN_USE).toEqual(['necessary']);
    expect(optionalCategoriesInUse()).toEqual([]);
    expect(consentMode()).toBe('notice');
  });

  it('becomes a real choice as soon as one optional category is in use', () => {
    expect(consentMode(['necessary', 'analytics'])).toBe('choice');
    expect(optionalCategoriesInUse(['necessary', 'marketing', 'analytics'])).toEqual(['analytics', 'marketing']);
  });
});
