import { describe, expect, it } from 'vitest';
import type { SupportedLanguage } from '@/lib/i18n/translations';
import {
  BIRTHDAY_CHECKOUT_COPY,
  BIRTHDAY_DISCOUNT_PERCENT,
  BIRTHDAY_MIN_PILOT_AGE_YEARS,
  fillBirthdayTemplate,
  getBirthdayBannerText,
  getBirthdayCheckoutCopy,
  getBirthdayErrorText,
  type BirthdayDateError,
} from '@/lib/discounts/birthday';

const LANGUAGES: SupportedLanguage[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;
const FORBIDDEN: Record<SupportedLanguage, RegExp[]> = {
  he: [ARABIC],
  ar: [HEBREW],
  en: [HEBREW, ARABIC],
  ru: [HEBREW, ARABIC],
  fr: [HEBREW, ARABIC],
  es: [HEBREW, ARABIC],
  de: [HEBREW, ARABIC],
};
const EMOJI = /\p{Extended_Pictographic}/u;
const KEYS = Object.keys(BIRTHDAY_CHECKOUT_COPY.en);

describe('birthday checkout copy', () => {
  it('has exactly the same keys in all six languages', () => {
    expect(Object.keys(BIRTHDAY_CHECKOUT_COPY).sort()).toEqual([...LANGUAGES].sort());
    for (const language of LANGUAGES) expect(Object.keys(BIRTHDAY_CHECKOUT_COPY[language]).sort(), language).toEqual([...KEYS].sort());
  });

  it('keeps scripts apart, has no emoji and no empty string', () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(BIRTHDAY_CHECKOUT_COPY[language])) {
        expect(value.trim(), `${language}.${key}`).not.toBe('');
        expect(EMOJI.test(value), `${language}.${key} has an emoji`).toBe(false);
        for (const forbidden of FORBIDDEN[language]) expect(forbidden.test(value), `${language}.${key}`).toBe(false);
      }
    }
  });

  it('never types the percentage or the age in a sentence: they are placeholders', () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(BIRTHDAY_CHECKOUT_COPY[language])) {
        expect(value, `${language}.${key}`).not.toContain(String(BIRTHDAY_DISCOUNT_PERCENT));
        expect(value, `${language}.${key}`).not.toMatch(new RegExp(`(?<![{\\w])${BIRTHDAY_MIN_PILOT_AGE_YEARS}(?![}\\w])`));
      }
      expect(BIRTHDAY_CHECKOUT_COPY[language].bannerSameMonth).toContain('{percent}');
      expect(BIRTHDAY_CHECKOUT_COPY[language].tooYoung).toContain('{minAge}');
    }
  });

  it('fills every placeholder from the constants', () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(getBirthdayCheckoutCopy(language))) {
        expect(value, `${language}.${key}`).not.toMatch(/[{}]/);
      }
      expect(getBirthdayCheckoutCopy(language).bannerSameMonth).toContain(String(BIRTHDAY_DISCOUNT_PERCENT));
      expect(getBirthdayCheckoutCopy(language).tooYoung).toContain(String(BIRTHDAY_MIN_PILOT_AGE_YEARS));
    }
  });

  it('leaves an unknown placeholder visible instead of printing undefined', () => {
    expect(fillBirthdayTemplate('{percent}% {nobody}')).toBe(`${BIRTHDAY_DISCOUNT_PERCENT}% {nobody}`);
    expect(fillBirthdayTemplate('{percent}', { percent: 20 })).toBe('20');
  });

  it('falls back to English for an unsupported language code', () => {
    expect(getBirthdayCheckoutCopy('xx' as SupportedLanguage).bannerTitle).toBe(BIRTHDAY_CHECKOUT_COPY.en.bannerTitle);
  });

  it('chooses the congratulations text by reason', () => {
    for (const language of LANGUAGES) {
      const copy = getBirthdayCheckoutCopy(language);
      expect(getBirthdayBannerText(language, 'same_month')).toEqual({ title: copy.bannerTitle, body: copy.bannerSameMonth });
      expect(getBirthdayBannerText(language, 'grace_before')?.body).toBe(copy.bannerGraceBefore);
      expect(getBirthdayBannerText(language, 'grace_after')?.body).toBe(copy.bannerGraceAfter);
      expect(getBirthdayBannerText(language, 'none')).toBeNull();
    }
  });

  it('has a message for every date error', () => {
    const errors: BirthdayDateError[] = [
      'invalid_birth_date',
      'invalid_flight_date',
      'birth_date_in_future',
      'pilot_too_young',
      'pilot_too_old',
    ];
    for (const language of LANGUAGES) {
      for (const error of errors) expect(getBirthdayErrorText(language, error).trim(), `${language}/${error}`).not.toBe('');
    }
  });
});
