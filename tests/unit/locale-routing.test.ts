import { describe, expect, it } from 'vitest';
import {
  languageFromLocalePathname,
  localizeInternalHref,
  stripLocalePrefix,
} from '@/lib/i18n/locale-routing';

describe('Wix Multilingual URL routing', () => {
  it('recognizes only the five supported secondary language URL prefixes', () => {
    expect(languageFromLocalePathname('/en/book')).toBe('en');
    expect(languageFromLocalePathname('/ar')).toBe('ar');
    expect(languageFromLocalePathname('/he/book')).toBeNull();
    expect(languageFromLocalePathname('/de/book')).toBeNull();
  });

  it('removes only a supported secondary locale prefix before the Next route resolves', () => {
    expect(stripLocalePrefix('/en/book')).toBe('/book');
    expect(stripLocalePrefix('/fr')).toBe('/');
    expect(stripLocalePrefix('/book')).toBe('/book');
    expect(stripLocalePrefix('/de/book')).toBe('/de/book');
  });

  it('creates canonical language URLs while retaining query strings and fragments', () => {
    expect(localizeInternalHref('/book?package=captains-command-60#checkout', 'en')).toBe(
      '/en/book?package=captains-command-60#checkout'
    );
    expect(localizeInternalHref('/en/book?package=captains-command-60', 'fr')).toBe(
      '/fr/book?package=captains-command-60'
    );
    expect(localizeInternalHref('/fr/book#checkout', 'he')).toBe('/book#checkout');
    expect(localizeInternalHref('https://example.com/book', 'es')).toBe('https://example.com/book');
    expect(localizeInternalHref('#plans', 'ru')).toBe('#plans');
  });
});
