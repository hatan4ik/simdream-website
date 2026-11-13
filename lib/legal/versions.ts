/**
 * Version stamps for the legal documents and the checkout consent wording.
 *
 * Both are written into the consent record at checkout, so a dispute can always be matched with
 * the exact text the customer saw. Bump them whenever the wording changes:
 *
 * - `LEGAL_DOCUMENT_VERSION`: the rules (`/rules`) or the privacy policy (`/privacy-policy`) changed.
 *   It is a calendar date (YYYY-MM-DD) and is shown at the top of both pages.
 * - `CONSENT_VERSION`: the checkout consent copy or the media release and waiver (clause 14)
 *   changed. `<date>.<n>` where `n` counts the revisions made on that date.
 *
 * `tests/unit/legal-versions.test.ts` pins a digest of the wording and fails when the text changes
 * without these constants being bumped.
 */
export const LEGAL_DOCUMENT_VERSION = '2026-11-13';

export const CONSENT_VERSION = '2026-11-13.1';

/** Shape of the version stamp stored with an order's consent record. */
export interface LegalVersionStamp {
  legalDocumentVersion: string;
  consentVersion: string;
}

export function currentLegalVersionStamp(): LegalVersionStamp {
  return { legalDocumentVersion: LEGAL_DOCUMENT_VERSION, consentVersion: CONSENT_VERSION };
}
