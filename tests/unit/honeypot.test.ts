import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { HONEYPOT_FIELD, isHoneypotFilled } from '@/lib/security/honeypot';
import { translations, type Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];

/** Words that browser address autofill and password managers classify form fields by. */
const AUTOFILL_TOKENS = ['company', 'name', 'email', 'phone', 'tel', 'address', 'url', 'site', 'org', 'user', 'pass'];

describe('the honeypot field name', () => {
  it('carries no word autofill or a password manager would act on', () => {
    expect(AUTOFILL_TOKENS.filter((token) => HONEYPOT_FIELD.toLowerCase().includes(token))).toEqual([]);
  });
});

describe('isHoneypotFilled', () => {
  const trap = (value: unknown) => ({ [HONEYPOT_FIELD]: value });

  it('reads the decoy from the shared field name', () => {
    expect(isHoneypotFilled(trap('https://spam.example'))).toBe(true);
    expect(isHoneypotFilled({ other: 'https://spam.example' })).toBe(false);
    expect(isHoneypotFilled({ other: 'x' }, 'other')).toBe(true);
  });

  it('treats a missing, null or empty decoy as a person', () => {
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled(trap(''))).toBe(false);
    expect(isHoneypotFilled(trap(null))).toBe(false);
    expect(isHoneypotFilled(trap(undefined))).toBe(false);
  });

  it('treats every other value in the decoy as a script', () => {
    for (const value of [' ', '0', 'x', 0, 1, false, true, [], {}, ['a']]) {
      expect(isHoneypotFilled(trap(value)), JSON.stringify(value)).toBe(true);
    }
  });

  it('has nothing to read in a body that is not an object', () => {
    for (const body of [null, undefined, HONEYPOT_FIELD, 7, true, [], [HONEYPOT_FIELD]]) {
      expect(isHoneypotFilled(body), JSON.stringify(body)).toBe(false);
    }
  });

  it('ignores a decoy inherited from the prototype chain', () => {
    expect(isHoneypotFilled(JSON.parse(`{"__proto__":{"${HONEYPOT_FIELD}":"x"}}`))).toBe(false);
  });
});

describe('HoneypotField', () => {
  const markup = renderToStaticMarkup(
    React.createElement(HoneypotField, { label: 'Leave this field empty', value: '', onChange: () => undefined })
  );

  it('is off-screen, out of the tab order and out of the accessibility tree', () => {
    expect(markup).toMatch(/^<div aria-hidden="true" data-honeypot="" class="[^"]*absolute[^"]*-start-\[9999px\][^"]*overflow-hidden[^"]*">/);
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('type="text"');
  });

  it('is named by the shared token-free field name and has no id', () => {
    expect(markup).toContain(`name="${HONEYPOT_FIELD}"`);
    expect(markup).not.toMatch(/\sid=/);
  });

  it('tells password managers and autofill to leave it alone', () => {
    expect(markup).toContain('data-1p-ignore="true"');
    expect(markup).toContain('data-lpignore="true"');
    expect(markup).toContain('data-bwignore="true"');
    expect(markup).toContain('data-form-type="other"');
  });

  it('starts empty and adds no copy outside its own hidden label', () => {
    expect(markup).toContain('value=""');
    expect(markup.replace(/<[^>]+>/g, '')).toBe('Leave this field empty');
  });
});

describe('workshop honeypot label', () => {
  it.each(LANGUAGES)('is written for %s and carries no autofill word', (language) => {
    const label = translations[language].workshops.honeypotLabel;

    expect(label.trim()).not.toBe('');
    if (language !== 'en') expect(label).not.toBe(translations.en.workshops.honeypotLabel);
    expect(AUTOFILL_TOKENS.filter((token) => label.toLowerCase().includes(token))).toEqual([]);
  });
});
