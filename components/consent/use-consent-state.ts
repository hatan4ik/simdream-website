'use client';

import { useSyncExternalStore } from 'react';
import {
  getDefaultConsentStore,
  isConsentSettingsOpen,
  subscribeConsentSettings,
  type ConsentCategory,
  type ConsentRecord,
} from '@/lib/consent';

const subscribe = (listener: () => void) => getDefaultConsentStore().subscribe(listener);
const getSnapshot = (): ConsentRecord | null | undefined => getDefaultConsentStore().getConsent();
// `undefined` is "not hydrated yet": the server and the hydration pass render nothing, so the
// banner never causes a layout shift or a hydration mismatch, and appears only after hydration.
const getServerSnapshot = (): ConsentRecord | null | undefined => undefined;

/**
 * The current decision: `undefined` before hydration, then the current record or `null` when the
 * visitor has not decided (or the decision is outdated or expired).
 */
export function useConsentRecord(): ConsentRecord | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Whether a category may be used right now. For gating a React component, e.g. a third-party embed. */
export function useConsentCategory(category: ConsentCategory): boolean {
  const record = useConsentRecord();
  return category === 'necessary' || record?.categories[category] === true;
}

export function useConsentSettingsOpen(): boolean {
  return useSyncExternalStore(subscribeConsentSettings, isConsentSettingsOpen, () => false);
}
