import { describe, expect, it } from 'vitest';
import { translations, type Language } from '@/lib/i18n/translations';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const CARD_KEYS = ['cardPresetsLabel', 'cardPresetsSubtitle', 'cardDetailsTitle', 'cardDetailsSubtitle'] as const;

// The /vouchers Gift Card flow has its own step copy (quick-select balance, then personalized card details).
describe('gift card step copy', () => {
  it('spells the English card step titles correctly', () => {
    expect(translations.en.vouchers.cardDetailsTitle).toBe('Personalized Gift Card Details');
    expect(translations.en.vouchers.cardPresetsLabel).toBe('Quick-Select Gift Card Credit Balance');
  });

  it.each(CODES)('gives %s card-specific step titles with no baked-in step number or trailing colon', (code) => {
    const v = translations[code].vouchers;
    expect(v.cardDetailsTitle).not.toBe(v.customizeDesignTitle);
    expect(v.cardDetailsSubtitle).not.toBe(v.customizeDesignSubtitle);
    // The numbered badge supplies the step number, and a heading never ends in a colon.
    for (const key of CARD_KEYS) expect(v[key], `${code}.${key}`).not.toMatch(/^\s*\d+\s*[.)]/);
    expect(v.cardPresetsLabel).not.toMatch(/[:：]\s*$/);
  });

  it.each(CODES.filter((code) => code !== 'en'))('translates every card step string for %s instead of falling back to English', (code) => {
    for (const key of CARD_KEYS) {
      expect(translations[code].vouchers[key], `${code}.${key}`).not.toBe(translations.en.vouchers[key]);
    }
  });
});
