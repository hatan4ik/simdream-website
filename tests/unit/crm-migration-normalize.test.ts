import { describe, expect, it } from 'vitest';
import {
  emailExactKey,
  emailMatchKey,
  nameTokens,
  namesCompatible,
  phoneKey,
} from '../../tools/crm-migration/normalize';

describe('emailExactKey', () => {
  it('trims and lowercases', () => {
    expect(emailExactKey('  Dana.Levi@Example.COM ')).toBe('dana.levi@example.com');
  });

  it('rejects values without a plausible address', () => {
    expect(emailExactKey('')).toBeNull();
    expect(emailExactKey(undefined)).toBeNull();
    expect(emailExactKey('not-an-email')).toBeNull();
    expect(emailExactKey('a@b')).toBeNull();
  });
});

describe('emailMatchKey', () => {
  it('equals the exact key for ordinary providers', () => {
    expect(emailMatchKey('Dana.Levi@Example.com')).toBe('dana.levi@example.com');
  });

  it('ignores dots and plus tags on Gmail, which delivers them to one mailbox', () => {
    expect(emailMatchKey('d.a.n.a+flights@gmail.com')).toBe('dana@gmail.com');
    expect(emailMatchKey('dana@googlemail.com')).toBe('dana@gmail.com');
  });

  it('keeps dots significant on other providers', () => {
    expect(emailMatchKey('d.ana@outlook.com')).not.toBe(emailMatchKey('dana@outlook.com'));
  });
});

describe('phoneKey', () => {
  it('treats every way of writing one Israeli mobile number as the same key', () => {
    const variants = ['050-123-4567', '0501234567', '+972 50 123 4567', '972501234567', '00972-50-1234567', '+972 (0) 50 123 4567'];
    const keys = new Set(variants.map((value) => phoneKey(value)));
    expect(keys).toEqual(new Set(['501234567']));
  });

  it('keeps the country code for foreign numbers so they cannot collide with Israeli ones', () => {
    expect(phoneKey('+1 212 555 0134')).toBe('12125550134');
    expect(phoneKey('+44 7911 123456')).toBe('447911123456');
    expect(phoneKey('+1 212 555 0134')).not.toBe(phoneKey('0212555013'));
  });

  it('refuses values too short to identify a person', () => {
    expect(phoneKey('12345')).toBeNull();
    expect(phoneKey('')).toBeNull();
    expect(phoneKey(undefined)).toBeNull();
    expect(phoneKey('n/a')).toBeNull();
  });
});

describe('nameTokens / namesCompatible', () => {
  it('lowercases, strips punctuation, diacritics and Hebrew niqqud', () => {
    expect(nameTokens({ first: 'José', last: "O'Brien-Smith" })).toEqual(['jose', 'obrien', 'smith']);
    expect(nameTokens({ first: 'דָּנָה', last: 'לוי' })).toEqual(['דנה', 'לוי']);
  });

  it('is empty when no name was given', () => {
    expect(nameTokens({})).toEqual([]);
    expect(nameTokens(undefined)).toEqual([]);
  });

  it('accepts identical, reordered and partial names', () => {
    expect(namesCompatible(['dana', 'levi'], ['levi', 'dana'])).toBe(true);
    expect(namesCompatible(['dana'], ['dana', 'levi'])).toBe(true);
    expect(namesCompatible([], ['dana', 'levi'])).toBe(true);
  });

  it('rejects people who merely share one name, such as siblings on a family phone', () => {
    expect(namesCompatible(['dan', 'cohen'], ['dan', 'levi'])).toBe(false);
    expect(namesCompatible(['dana', 'levi'], ['noa', 'levi'])).toBe(false);
  });
});
