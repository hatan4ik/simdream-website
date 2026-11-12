import { describe, expect, it } from 'vitest';
import { LANGUAGES, translations } from '@/lib/i18n/translations';

/**
 * The compact Book button on phones and tablets reads `nav.bookFlightShort`. It used to be derived
 * with `bookFlight.split(' ')[0]`, which gave Russian the long word "Забронировать" and pushed the menu
 * trigger out of view at narrow widths. Every language except Russian must keep exactly the label it
 * had, so nothing else moves by a pixel.
 */
describe('nav.bookFlightShort', () => {
  const codes = LANGUAGES.map((language) => language.code);

  it('exists in all six languages', () => {
    expect(codes.sort()).toEqual(['ar', 'en', 'es', 'fr', 'he', 'ru']);
    for (const code of codes) expect(translations[code].nav.bookFlightShort.trim(), code).not.toBe('');
  });

  it('is the first word of the full label in every language but Russian', () => {
    for (const code of codes.filter((candidate) => candidate !== 'ru')) {
      expect(translations[code].nav.bookFlightShort, code).toBe(translations[code].nav.bookFlight.split(' ')[0]);
    }
  });

  it('is the short word "Бронь" in Russian', () => {
    expect(translations.ru.nav.bookFlightShort).toBe('Бронь');
    expect(translations.ru.nav.bookFlightShort.length).toBeLessThan(translations.ru.nav.bookFlight.split(' ')[0].length);
  });

  it('keeps the desktop label untouched', () => {
    expect(translations.ru.nav.bookFlight).toBe('Забронировать полет');
    expect(translations.en.nav.bookFlight).toBe('Book a Flight');
  });
});
