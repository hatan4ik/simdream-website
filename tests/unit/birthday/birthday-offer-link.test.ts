import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BirthdayOfferLink } from '@/components/offers';
import { BIRTHDAY_CHECKOUT_COPY } from '@/lib/discounts/birthday';
import { LanguageProvider } from '@/lib/i18n/language-context';
import type { SupportedLanguage } from '@/lib/i18n/translations';

const LANGUAGES: SupportedLanguage[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];

function render(language: SupportedLanguage, className?: string): string {
  return renderToStaticMarkup(
    React.createElement(LanguageProvider, {
      initialLanguage: language,
      children: React.createElement(BirthdayOfferLink, { className }),
    })
  );
}

describe('<BirthdayOfferLink />', () => {
  it.each(LANGUAGES)('points at /offers#birthday with the %s label', (language) => {
    const html = render(language);
    expect(html).toContain('href="/offers#birthday"');
    expect(html).toContain('data-birthday-offer-link');
    expect(html).toContain(BIRTHDAY_CHECKOUT_COPY[language].linkLabel);
  });

  it('keeps a 44px tap target and accepts a layout class', () => {
    const html = render('en', 'mt-2');
    expect(html).toContain('min-h-11');
    expect(html).toContain('mt-2');
  });
});
