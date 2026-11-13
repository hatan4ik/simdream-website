import { describe, expect, it } from 'vitest';
import {
  formatLoyaltyPercent,
  getLoyaltyCheckoutCopy,
  LOYALTY_CHECKOUT_COPY,
  type LoyaltyCheckoutCopy,
} from '@/lib/booking/client/loyalty-copy';
import { LANGUAGE_CODES } from '@/lib/i18n/language-preference';

const HEBREW_SCRIPT = /[\u0590-\u05FF]/;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const UNFILLED_PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/;

const COPY_FIELDS: ReadonlyArray<keyof LoyaltyCheckoutCopy> = [
  'returningTierBadge',
  'returningTierBanner',
  'nonStackablePackageAlert',
  'singleWinnerNotice',
  'prepaidModeLabel',
  'prepaidModeNotice',
];

describe('loyalty checkout copy (7 languages)', () => {
  it('provides complete, non-empty copy for every LANGUAGE_CODES entry', () => {
    expect(Object.keys(LOYALTY_CHECKOUT_COPY).sort()).toEqual([...LANGUAGE_CODES].sort());

    for (const language of LANGUAGE_CODES) {
      const copy = getLoyaltyCheckoutCopy(language);
      for (const field of COPY_FIELDS) {
        const value = copy[field];
        expect(typeof value, `${language}.${field}`).toBe('string');
        expect(value.trim().length, `${language}.${field}`).toBeGreaterThan(0);
      }
      expect(copy.returningTierBadge).toContain('{percent}');
      expect(copy.returningTierBanner).toContain('{percent}');
      expect(formatLoyaltyPercent(copy.returningTierBadge, 7)).not.toMatch(UNFILLED_PLACEHOLDER);
      expect(formatLoyaltyPercent(copy.returningTierBanner, 10)).not.toMatch(UNFILLED_PLACEHOLDER);
      expect(copy.nonStackablePackageAlert).not.toMatch(UNFILLED_PLACEHOLDER);
      expect(copy.singleWinnerNotice).not.toMatch(UNFILLED_PLACEHOLDER);
      expect(copy.prepaidModeLabel).not.toMatch(UNFILLED_PLACEHOLDER);
      expect(copy.prepaidModeNotice).not.toMatch(UNFILLED_PLACEHOLDER);
    }
  });

  it('keeps Hebrew and Arabic free of cross-script contamination', () => {
    for (const language of LANGUAGE_CODES) {
      const allText = Object.values(getLoyaltyCheckoutCopy(language)).join('\n');
      if (language === 'he') {
        expect(allText).toMatch(HEBREW_SCRIPT);
        expect(allText).not.toMatch(ARABIC_SCRIPT);
      } else if (language === 'ar') {
        expect(allText).toMatch(ARABIC_SCRIPT);
        expect(allText).not.toMatch(HEBREW_SCRIPT);
      } else {
        expect(allText).not.toMatch(HEBREW_SCRIPT);
        expect(allText).not.toMatch(ARABIC_SCRIPT);
      }
    }
  });
});
