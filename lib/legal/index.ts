/**
 * Public API of the legal module (rules, privacy policy, checkout consent).
 *
 * - Versions: `LEGAL_DOCUMENT_VERSION`, `CONSENT_VERSION`
 * - Checkout consent copy (six languages), link helpers and the server-side consent record
 * - Anchors and paths of the legal pages, and the refund terms as numbers
 * - Dynamic loaders for the long clause text (one module per language and document)
 *
 * UI lives in `components/legal/`. Never import `./content/*` directly: use the loaders, so the
 * client bundle only carries the language it displays.
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
export { RULES_HEADINGS } from './rules-headings';
export { PRIVACY_PAGE_COPY, RULES_PAGE_COPY } from './page-copy';
export type { PrivacyPageCopy, RulesPageCopy } from './page-copy';
export {
  loadMediaReleaseSection,
  loadPrivacyPolicy,
  loadRulesCore,
  loadRulesExtra,
  rulesCoreLanguageFor,
} from './loaders';
export type {
  LegalBody,
  LegalClause,
  LegalClauseAction,
  LegalLanguage,
  LegalSectionBody,
  PrivacyBody,
  PrivacySectionBody,
  RulesCoreLanguage,
} from './types';
