import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CONSENT_COPY } from '@/lib/legal/consent-copy';
import { RULES_HEADINGS } from '@/lib/legal/rules-headings';
import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION, currentLegalVersionStamp } from '@/lib/legal/versions';
import { PRIVACY, RULES_CORE, RULES_EXTRA } from './_support/legal-fixtures';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

/**
 * Wording guards. The legal text is versioned (the version is stored with every order's consent
 * record), so changing the wording without a new version would make the record lie. When one of
 * these digests fails: bump the matching constant in lib/legal/versions.ts, then paste the new digest.
 */
const LEGAL_DOCUMENT_DIGEST = '804e9001e1a8affe';
const CONSENT_DIGEST = '0dbba211d3fdc6b5';

describe('legal versions', () => {
  it('pins the current version constants', () => {
    expect(LEGAL_DOCUMENT_VERSION).toBe('2026-11-11');
    expect(CONSENT_VERSION).toBe('2026-11-11.1');
  });

  it('uses a calendar date for the document version and date.revision for the consent version', () => {
    expect(LEGAL_DOCUMENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(LEGAL_DOCUMENT_VERSION))).toBe(false);
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(CONSENT_VERSION.startsWith(LEGAL_DOCUMENT_VERSION)).toBe(true);
  });

  it('exposes both versions as one stamp', () => {
    expect(currentLegalVersionStamp()).toEqual({ legalDocumentVersion: LEGAL_DOCUMENT_VERSION, consentVersion: CONSENT_VERSION });
  });

  it('fails when the rules or privacy wording changes without a new LEGAL_DOCUMENT_VERSION', () => {
    const current = digest({ core: RULES_CORE, extra: RULES_EXTRA, privacy: PRIVACY, headings: RULES_HEADINGS });
    expect({ version: LEGAL_DOCUMENT_VERSION, digest: current }).toEqual({ version: '2026-11-11', digest: LEGAL_DOCUMENT_DIGEST });
  });

  it('fails when the checkout consent wording changes without a new CONSENT_VERSION', () => {
    const mediaRelease = Object.fromEntries(
      Object.entries(RULES_EXTRA).map(([language, body]) => [language, body.sections.filter((section) => section.id !== 'refunds')])
    );
    const current = digest({ copy: CONSENT_COPY, mediaRelease });
    expect({ version: CONSENT_VERSION, digest: current }).toEqual({ version: '2026-11-11.1', digest: CONSENT_DIGEST });
  });
});
