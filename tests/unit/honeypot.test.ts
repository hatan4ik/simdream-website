import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { HONEYPOT_FIELD, isHoneypotFilled } from '@/lib/security/honeypot';
import { translations, type Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];

describe('isHoneypotFilled', () => {
  it('reads the decoy from the website property', () => {
    expect(HONEYPOT_FIELD).toBe('website');
    expect(isHoneypotFilled({ website: 'https://spam.example' })).toBe(true);
    expect(isHoneypotFilled({ other: 'https://spam.example' })).toBe(false);
    expect(isHoneypotFilled({ other: 'x' }, 'other')).toBe(true);
  });

  it('treats a missing, null or empty decoy as a person', () => {
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled({ website: '' })).toBe(false);
    expect(isHoneypotFilled({ website: null })).toBe(false);
    expect(isHoneypotFilled({ website: undefined })).toBe(false);
  });

  it('treats every other value in the decoy as a script', () => {
    for (const value of [' ', '0', 'x', 0, 1, false, true, [], {}, ['a']]) {
      expect(isHoneypotFilled({ website: value }), JSON.stringify(value)).toBe(true);
    }
  });

  it('has nothing to read in a body that is not an object', () => {
    for (const body of [null, undefined, 'website', 7, true, [], ['website']]) {
      expect(isHoneypotFilled(body), JSON.stringify(body)).toBe(false);
    }
  });

  it('ignores a decoy inherited from the prototype chain', () => {
    expect(isHoneypotFilled(JSON.parse('{"__proto__":{"website":"x"}}'))).toBe(false);
  });
});

describe('HoneypotField', () => {
  const markup = renderToStaticMarkup(
    React.createElement(HoneypotField, { label: 'Leave this field empty', name: 'decoy_field', value: '', onChange: () => undefined })
  );

  it('is off-screen, out of the tab order and out of the accessibility tree', () => {
    expect(markup).toMatch(/^<div aria-hidden="true" class="[^"]*absolute[^"]*-start-\[9999px\][^"]*overflow-hidden[^"]*">/);
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('name="decoy_field"');
    expect(markup).toContain('type="text"');
  });

  it('starts empty and adds no copy outside its own hidden label', () => {
    expect(markup).toContain('value=""');
    expect(markup.replace(/<[^>]+>/g, '')).toBe('Leave this field empty');
  });
});

describe('workshop honeypot label', () => {
  it.each(LANGUAGES)('is written for %s', (language) => {
    const label = translations[language].workshops.honeypotLabel;

    expect(label.trim()).not.toBe('');
    if (language !== 'en') expect(label).not.toBe(translations.en.workshops.honeypotLabel);
  });
});
