import { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION } from './versions';
import type { LegalLanguage } from './types';

/**
 * The record that proves what a customer accepted at checkout (rules clause 15). The server builds
 * it from the two checkbox values, never from client-supplied versions or times, and stores it with
 * the order. Pure: no I/O, so it is unit-tested directly.
 */
export interface ConsentRecord {
  /** `LEGAL_DOCUMENT_VERSION` in force when the boxes were ticked (rules and privacy policy). */
  legalDocumentVersion: string;
  /** `CONSENT_VERSION` in force: the checkout wording and the media release clause. */
  consentVersion: string;
  /** ISO 8601 timestamp in UTC, taken on the server. */
  acceptedAt: string;
  /** Page language the customer read the wording in. */
  language: LegalLanguage;
  /** Both confirmations are mandatory, so a stored record always has both set. */
  rulesRefundsAndPrivacy: true;
  mediaReleaseAndWaiver: true;
}

export type ConsentMissing = 'rulesRefundsAndPrivacy' | 'mediaReleaseAndWaiver';

export interface ConsentInput {
  language: LegalLanguage;
  rulesRefundsAndPrivacy: boolean;
  mediaReleaseAndWaiver: boolean;
  now?: Date;
}

export type ConsentResult = { ok: true; record: ConsentRecord } | { ok: false; missing: ConsentMissing[] };

/** Builds the record, or names the confirmations that are missing. Only literal `true` counts. */
export function buildConsentRecord(input: ConsentInput): ConsentResult {
  const missing: ConsentMissing[] = [];
  if (input.rulesRefundsAndPrivacy !== true) missing.push('rulesRefundsAndPrivacy');
  if (input.mediaReleaseAndWaiver !== true) missing.push('mediaReleaseAndWaiver');
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    record: {
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
      consentVersion: CONSENT_VERSION,
      acceptedAt: (input.now ?? new Date()).toISOString(),
      language: input.language,
      rulesRefundsAndPrivacy: true,
      mediaReleaseAndWaiver: true,
    },
  };
}
