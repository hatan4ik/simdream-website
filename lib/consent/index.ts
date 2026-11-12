/**
 * Consent management: pure logic and the browser store. UI lives in components/consent.
 * Nothing here loads or enables a tracker; see docs/modules/cookie-consent.md.
 */
import { getDefaultConsentStore } from './default-store';
import type { ConsentChoices } from './store';
import type { ConsentCategory, ConsentRecord } from './types';

export * from './config';
export * from './types';
export {
  consentExpiresAt,
  consentMode,
  createConsentRecord,
  isCategoryAllowed,
  isConsentCurrent,
  noOptionalCategories,
  optionalCategoriesInUse,
  parseConsentRecord,
  serializeConsentRecord,
  type ConsentMode,
} from './record';
export { createConsentStore, resolveBrowserStorage, type ConsentChoices, type ConsentStore, type StorageLike } from './store';
export { getDefaultConsentStore } from './default-store';
export { loadScriptWhenConsented, whenConsented } from './gating';
export {
  closeConsentSettings,
  isConsentSettingsOpen,
  openConsentSettings,
  subscribeConsentSettings,
} from './settings-ui';
export {
  syncConsentToWix,
  toWixConsentPolicy,
  type WixConsentPolicy,
  type WixConsentTarget,
  type WixSyncResult,
} from './wix-sync';

/** The current decision, or `null` (none, outdated, expired). */
export const getConsent = (): ConsentRecord | null => getDefaultConsentStore().getConsent();
export const hasConsent = (category: ConsentCategory): boolean => getDefaultConsentStore().hasConsent(category);
export const subscribe = (listener: () => void): (() => void) => getDefaultConsentStore().subscribe(listener);
export const acceptAll = (): ConsentRecord => getDefaultConsentStore().acceptAll();
export const rejectNonEssential = (): ConsentRecord => getDefaultConsentStore().rejectNonEssential();
export const savePreferences = (choices: ConsentChoices): ConsentRecord => getDefaultConsentStore().savePreferences(choices);
export const acknowledge = (): ConsentRecord => getDefaultConsentStore().acknowledge();
export const withdraw = (): ConsentRecord => getDefaultConsentStore().withdraw();
export const clearConsent = (): void => getDefaultConsentStore().clear();
