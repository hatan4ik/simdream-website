import { describe, expect, it } from 'vitest';
import {
  CONSENT_COPY,
  CONSENT_LINKS,
  MEDIA_RELEASE_PATH,
  getConsentCopy,
  splitConsentLabel,
} from '@/lib/legal/consent-copy';
import { buildConsentRecord } from '@/lib/legal/consent-record';
import { LEGAL_PATHS, RULES_SECTIONS, legalPathAnchor } from '@/lib/legal/anchors';
import { REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION, REFUND_WINDOW_DAYS } from '@/lib/legal/policy-constants';
import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import { FORBIDDEN_SCRIPTS, LANGUAGES, RULES_EXTRA, keyPaths, stringLeaves } from './_support/legal-fixtures';

describe('checkout consent copy', () => {
  it('ships all six languages', () => {
    expect(Object.keys(CONSENT_COPY).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(LANGUAGES.filter((language) => language !== 'en'))('has exactly the same keys in %s as in English', (language) => {
    expect(keyPaths(CONSENT_COPY[language])).toEqual(keyPaths(CONSENT_COPY.en));
  });

  it.each(LANGUAGES)('has no empty strings in %s', (language) => {
    const leaves = stringLeaves(CONSENT_COPY[language]);
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves.filter(([, text]) => text.trim() === '')).toEqual([]);
  });

  it.each(LANGUAGES)('keeps %s free of foreign-script letters', (language) => {
    const violations = stringLeaves(CONSENT_COPY[language]).flatMap(([path, text]) =>
      FORBIDDEN_SCRIPTS[language].filter(({ pattern }) => pattern.test(text)).map(({ name }) => `${path}: ${name}`)
    );
    expect(violations).toEqual([]);
  });

  it.each(LANGUAGES)('gives both checkboxes an accessible name, an error and a plain summary in %s', (language) => {
    const copy = CONSENT_COPY[language];
    for (const text of [copy.rules.ariaLabel, copy.rules.error, copy.rules.summary, copy.media.ariaLabel, copy.media.error, copy.media.summary]) {
      expect(text.trim().length).toBeGreaterThan(10);
    }
    // The plain-language summary is one sentence, short enough to read at a glance.
    expect(copy.rules.summary.length).toBeLessThan(260);
    expect(copy.media.summary.length).toBeLessThan(330);
  });

  it.each(LANGUAGES)('states the age declaration and the guardian consent for minors in %s', (language) => {
    expect(CONSENT_COPY[language].media.guardianNote).toContain('18');
    expect(CONSENT_COPY[language].media.optOutNote).toContain('6.4');
  });

  it.each(LANGUAGES)('quotes the refund terms from the registry in the %s summary', (language) => {
    const summary = CONSENT_COPY[language].rules.summary;
    expect(summary).toContain(String(REFUND_WINDOW_DAYS));
    expect(summary).toContain(String(REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION));
  });

  it.each(LANGUAGES)('puts the three links of the rules checkbox into the %s label', (language) => {
    const parts = splitConsentLabel(CONSENT_COPY[language].rules);
    expect(parts.filter((part) => part.type === 'link').map((part) => (part.type === 'link' ? part.key : ''))).toEqual([
      'rules',
      'refunds',
      'privacy',
    ]);
    expect(parts.every((part) => part.text.trim() !== '')).toBe(true);
    // No raw token survives.
    expect(parts.map((part) => part.text).join('')).not.toMatch(/[{}]/);
  });

  it('points the links at the rules, the refund clause and the privacy policy', () => {
    expect(CONSENT_LINKS).toEqual({ rules: '/rules', refunds: '/rules#refunds', privacy: '/privacy-policy' });
    expect(MEDIA_RELEASE_PATH).toBe('/rules#media-release');
  });

  it('only links to anchors that exist on the rules page', () => {
    const sectionIds = new Set<string>(RULES_SECTIONS.map((section) => section.id));
    const hashes = [...Object.values(CONSENT_LINKS), MEDIA_RELEASE_PATH, LEGAL_PATHS.consent]
      .map(legalPathAnchor)
      .filter((anchor): anchor is string => anchor !== null);
    expect(hashes.sort()).toEqual(['consent', 'media-release', 'refunds']);
    for (const hash of hashes) expect(sectionIds.has(hash)).toBe(true);
  });

  it('keeps the full media release clause and the consent summary in the same wording family', () => {
    // The expandable loads clause 14 from the rules extras: it must exist in every language.
    for (const language of LANGUAGES) {
      expect(RULES_EXTRA[language].sections.some((section) => section.id === 'media-release')).toBe(true);
    }
  });

  it('falls back to English for an unknown language', () => {
    expect(getConsentCopy('xx')).toBe(CONSENT_COPY.en);
    expect(getConsentCopy('he')).toBe(CONSENT_COPY.he);
  });
});

describe('consent record', () => {
  const NOW = new Date('2026-11-11T10:00:00.000Z');

  it('records both mandatory confirmations with the current versions and a server timestamp', () => {
    const result = buildConsentRecord({ language: 'ar', rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true, now: NOW });
    expect(result).toEqual({
      ok: true,
      record: {
        legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
        consentVersion: CONSENT_VERSION,
        acceptedAt: '2026-11-11T10:00:00.000Z',
        language: 'ar',
        rulesRefundsAndPrivacy: true,
        mediaReleaseAndWaiver: true,
      },
    });
  });

  it('refuses a record unless both confirmations are literally true, and names what is missing', () => {
    expect(buildConsentRecord({ language: 'en', rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: false, now: NOW })).toEqual({
      ok: false,
      missing: ['mediaReleaseAndWaiver'],
    });
    expect(buildConsentRecord({ language: 'en', rulesRefundsAndPrivacy: false, mediaReleaseAndWaiver: false, now: NOW })).toEqual({
      ok: false,
      missing: ['rulesRefundsAndPrivacy', 'mediaReleaseAndWaiver'],
    });
    const truthy = { language: 'en', rulesRefundsAndPrivacy: 'yes', mediaReleaseAndWaiver: 1, now: NOW } as unknown as Parameters<typeof buildConsentRecord>[0];
    expect(buildConsentRecord(truthy)).toMatchObject({ ok: false });
  });

  it('stamps the current time when none is given', () => {
    const result = buildConsentRecord({ language: 'en', rulesRefundsAndPrivacy: true, mediaReleaseAndWaiver: true });
    expect(result.ok && Date.parse(result.record.acceptedAt)).toBeGreaterThan(Date.parse('2026-11-11T00:00:00Z'));
  });
});
