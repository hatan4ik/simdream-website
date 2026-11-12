/**
 * Consent categories, ordered from least to most intrusive. `necessary` is always on and is never
 * stored as a choice: the record keeps it for completeness so a reader sees one shape for all four.
 */
export const CONSENT_CATEGORIES = ['necessary', 'preferences', 'analytics', 'marketing'] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

/** The categories a visitor can switch on or off. */
export type OptionalConsentCategory = Exclude<ConsentCategory, 'necessary'>;

export const OPTIONAL_CONSENT_CATEGORIES: readonly OptionalConsentCategory[] = ['preferences', 'analytics', 'marketing'];

export type ConsentCategories = Record<ConsentCategory, boolean>;

/** What is persisted under `CONSENT_STORAGE_KEY`. */
export interface ConsentRecord {
  /** `CONSENT_VERSION` at the time of the decision; a different current version re-asks. */
  version: number;
  /** ISO 8601 timestamp of the decision; the renewal period counts from here. */
  decidedAt: string;
  categories: ConsentCategories;
}
