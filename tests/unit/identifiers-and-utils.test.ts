import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cn,
  extractErrorMessage,
  formatCurrency,
  formatDate,
  formatLocalYMD,
  generateBookingReference,
  generateVoucherCode,
} from '@/lib/utils';

// No 0/O or 1/I, so references survive being read aloud or copied by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SAMPLES = 10_000;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Makes crypto.getRandomValues return the given 32-bit words. */
function feedRandomWords(words: readonly number[]) {
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
    if (array instanceof Uint32Array) array.set(words.slice(0, array.length));
    return array;
  });
}

describe.each([
  { name: 'generateBookingReference', generate: generateBookingReference, prefix: 'SD-737-', length: 16 },
  { name: 'generateVoucherCode', generate: generateVoucherCode, prefix: 'SD-VOUCH-', length: 18 },
])('$name', ({ generate, prefix, length }) => {
  const format = new RegExp(`^${prefix}[${ALPHABET}]{${length}}$`);

  it(`uses the ${prefix} prefix and ${length} unambiguous symbols`, () => {
    const samples = Array.from({ length: SAMPLES }, generate);
    expect(samples.filter((sample) => !format.test(sample))).toEqual([]);
  });

  it(`produces no collisions across ${SAMPLES.toLocaleString('en-US')} samples`, () => {
    expect(new Set(Array.from({ length: SAMPLES }, generate)).size).toBe(SAMPLES);
  });

  it('spreads symbols evenly over the whole alphabet', () => {
    const counts = new Map<string, number>();
    for (const sample of Array.from({ length: SAMPLES }, generate)) {
      for (const symbol of sample.slice(prefix.length)) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
    const expected = (SAMPLES * length) / ALPHABET.length;
    expect([...counts.keys()].sort().join('')).toBe([...ALPHABET].sort().join(''));
    // ±10% is more than 7 standard deviations at this sample size.
    expect([...counts.values()].filter((count) => Math.abs(count - expected) > expected * 0.1)).toEqual([]);
  });

  it('maps each random word to a symbol by its value modulo the alphabet size', () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 2 ** 32 - 1 }), { minLength: length, maxLength: length }), (words) => {
        feedRandomWords(words);
        expect(generate()).toBe(prefix + words.map((word) => ALPHABET[word % ALPHABET.length]).join(''));
      })
    );
    // 2^32 is a multiple of 32, so every symbol is equally likely.
    expect(2 ** 32 % ALPHABET.length).toBe(0);
  });

  it('draws its randomness from the cryptographic generator', () => {
    const spy = feedRandomWords(Array.from({ length }, (_, index) => index));
    generate();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeInstanceOf(Uint32Array);
  });

  it('refuses to generate when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generate()).toThrow('Secure random number generation is unavailable.');
  });
});

describe('formatLocalYMD', () => {
  it('formats any local calendar date as zero-padded YYYY-MM-DD', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), (year, month, day) => {
        expect(formatLocalYMD(new Date(year, month - 1, day, 23, 59))).toBe(
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        );
      })
    );
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD date on its own calendar day, without a timezone shift', () => {
    expect(formatDate('2026-11-01')).toBe('Sun, 1 Nov 2026');
    expect(formatDate('2026-11-07')).toBe('Sat, 7 Nov 2026');
  });

  it('formats a full timestamp too', () => {
    expect(formatDate('2026-11-06T12:00:00')).toBe('Fri, 6 Nov 2026');
  });
});

describe('extractErrorMessage', () => {
  it.each([
    [new Error('Slot taken'), 'Slot taken'],
    [new Error(''), 'fallback'],
    ['Network down', 'Network down'],
    ['   ', 'fallback'],
    [{ message: 'not an Error' }, 'fallback'],
    [null, 'fallback'],
    [undefined, 'fallback'],
  ])('turns %j into %j', (error, expected) => {
    expect(extractErrorMessage(error, 'fallback')).toBe(expected);
  });
});

describe('formatCurrency', () => {
  it('formats shekels with the ₪ symbol, rounded to whole shekels', () => {
    const formatted = formatCurrency(1_250.4);
    expect(formatted).toContain('₪');
    expect(formatted).toContain('1,250');
    expect(formatted).not.toContain('ILS');
  });

  it('formats dollars for the US price list', () => {
    expect(formatCurrency(70, 'USD')).toBe('$70');
  });
});

describe('cn', () => {
  it('drops falsy classes and lets the later Tailwind utility win', () => {
    expect(cn('px-2 text-sm', false, undefined, 'px-4')).toBe('text-sm px-4');
  });
});
