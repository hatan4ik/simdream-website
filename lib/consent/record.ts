import { CONSENT_CATEGORIES_IN_USE, CONSENT_RENEWAL_MONTHS, CONSENT_VERSION } from './config';
import {
  OPTIONAL_CONSENT_CATEGORIES,
  type ConsentCategories,
  type ConsentCategory,
  type ConsentRecord,
  type OptionalConsentCategory,
} from './types';

export interface ConsentRules {
  version?: number;
  renewalMonths?: number;
}

/** Builds a record. `necessary` is always true; an omitted optional category is off (opt-in only). */
export function createConsentRecord(
  choices: Partial<Record<OptionalConsentCategory, boolean>>,
  now: Date,
  version: number = CONSENT_VERSION
): ConsentRecord {
  return {
    version,
    decidedAt: now.toISOString(),
    categories: {
      necessary: true,
      preferences: choices.preferences === true,
      analytics: choices.analytics === true,
      marketing: choices.marketing === true,
    },
  };
}

export function serializeConsentRecord(record: ConsentRecord): string {
  return JSON.stringify(record);
}

/** Parses what storage returned; anything malformed is "no decision" rather than an error. */
export function parseConsentRecord(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { version?: unknown; decidedAt?: unknown; categories?: unknown };
  if (typeof candidate.version !== 'number' || !Number.isInteger(candidate.version)) return null;
  if (typeof candidate.decidedAt !== 'string' || Number.isNaN(Date.parse(candidate.decidedAt))) return null;
  if (!candidate.categories || typeof candidate.categories !== 'object') return null;
  const stored = candidate.categories as Record<string, unknown>;
  for (const category of OPTIONAL_CONSENT_CATEGORIES) {
    if (typeof stored[category] !== 'boolean') return null;
  }
  return {
    version: candidate.version,
    decidedAt: candidate.decidedAt,
    categories: {
      necessary: true,
      preferences: stored.preferences as boolean,
      analytics: stored.analytics as boolean,
      marketing: stored.marketing as boolean,
    },
  };
}

/** The moment a decision stops counting: `renewalMonths` calendar months after it was made. */
export function consentExpiresAt(record: ConsentRecord, renewalMonths: number = CONSENT_RENEWAL_MONTHS): Date {
  const expires = new Date(record.decidedAt);
  expires.setUTCMonth(expires.getUTCMonth() + renewalMonths);
  return expires;
}

/**
 * True while the record is for the current version and not yet due for renewal. There is no upper
 * bound on `decidedAt`: a decision stamped ahead of this device's clock (clock skew, or a test that
 * freezes time in the past) simply counts as current until its renewal date.
 */
export function isConsentCurrent(record: ConsentRecord, now: Date, rules: ConsentRules = {}): boolean {
  const { version = CONSENT_VERSION, renewalMonths = CONSENT_RENEWAL_MONTHS } = rules;
  if (record.version !== version) return false;
  return now.getTime() < consentExpiresAt(record, renewalMonths).getTime();
}

/**
 * Whether `category` may be used. `necessary` is always allowed; every other category needs a
 * current record that says yes. No record, a stale one or a malformed one means no.
 */
export function isCategoryAllowed(record: ConsentRecord | null, category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  return record?.categories[category] === true;
}

/** Categories the visitor can actually choose today: in use, and not the always-on one. */
export function optionalCategoriesInUse(
  inUse: readonly ConsentCategory[] = CONSENT_CATEGORIES_IN_USE
): OptionalConsentCategory[] {
  return OPTIONAL_CONSENT_CATEGORIES.filter((category) => inUse.includes(category));
}

/**
 * `choice` when at least one optional category is in use (the banner offers Accept all / Reject
 * non-essential / Customize); `notice` when none is (a single "Got it", no toggles).
 */
export type ConsentMode = 'notice' | 'choice';

export function consentMode(inUse: readonly ConsentCategory[] = CONSENT_CATEGORIES_IN_USE): ConsentMode {
  return optionalCategoriesInUse(inUse).length > 0 ? 'choice' : 'notice';
}

/** A fresh all-off set, handy for the dialog's initial toggle state. */
export function noOptionalCategories(): ConsentCategories {
  return { necessary: true, preferences: false, analytics: false, marketing: false };
}
