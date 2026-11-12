/**
 * Public API of the legal module (rules, privacy policy, checkout consent).
 *
 * - Versions: `LEGAL_DOCUMENT_VERSION`, `CONSENT_VERSION`
 * - Checkout consent copy (six languages), link helpers and the server-side consent record
 * - Anchors and paths of the legal pages, and the refund terms as numbers
 * - Dynamic loaders for the long Hebrew clause text (one module per document)
 *
 * UI lives in `components/legal/`. Never import `./content/*` directly: use the loaders, so the
 * client bundle only carries the language it displays. The text in the other five languages is
 * client-only (`./loaders-intl`, reached through `next/dynamic` with `ssr: false`, never from this
 * index) so it stays out of the Wix worker: docs/modules/wix-bundle-diet.md. The page-only copy (`./page-copy`,
 * `./rules-headings`) is deliberately not exported here: it belongs to the `/rules` and
 * `/privacy-policy` pages and would only add weight to the checkout bundle.
 */
export { CONSENT_VERSION, LEGAL_DOCUMENT_VERSION, currentLegalVersionStamp } from './versions';
export type { LegalVersionStamp } from './versions';
export {
  CONSENT_COPY,
  CONSENT_LINKS,
  MEDIA_RELEASE_PATH,
  getConsentCopy,
  splitConsentLabel,
} from './consent-copy';
export type { ConsentCopy, ConsentLabelPart, ConsentLinkKey } from './consent-copy';
export { buildConsentRecord } from './consent-record';
export type { ConsentInput, ConsentMissing, ConsentRecord, ConsentResult } from './consent-record';
export { LEGAL_PATHS, RULES_EXTRA_SECTION_IDS, RULES_SECTIONS, legalPathAnchor } from './anchors';
export type { RulesSectionId } from './anchors';
export {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
  SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS,
} from './policy-constants';
export {
  loadMediaReleaseSectionHe,
  loadPrivacyHe,
  loadRulesCoreHe,
  loadRulesExtraHe,
  rulesCoreLanguageFor,
} from './loaders';
export type {
  LegalBody,
  LegalClause,
  LegalClauseAction,
  LegalIntlLanguage,
  LegalLanguage,
  LegalSectionBody,
  PrivacyBody,
  PrivacySectionBody,
  RulesCoreLanguage,
} from './types';
