import { CONSENT_WIX_SYNC_ENABLED } from './config';
import type { ConsentCategories, ConsentRecord } from './types';

/**
 * Adapter to Wix's consent policy. Documented API, not an invention:
 *  - `window.consentPolicyManager.setConsentPolicy(policy, onSuccess, onError)` and the
 *    `consentPolicyManagerReady` window event
 *    https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/feature-guides/manage-cookie-consent
 *  - the `{ essential, functional, analytics, advertising, dataToThirdParty }` policy shape
 *    https://dev.wix.com/docs/sdk/host-modules/site/consent-policy-manager/set-consent-policy
 *
 * It does something only when Wix's runtime is on the page, i.e. when the project loads Wix's site
 * script (`manage.wix.com/_api/headless-business-setup/v1/headless-business/site-script.js`).
 * This app does not load it, so the flag defaults to off and the adapter is inert.
 */
export interface WixConsentPolicy {
  essential: true;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  dataToThirdParty: boolean;
}

/**
 * Our categories to Wix's. `preferences` is Wix's `functional`; `marketing` is `advertising` and,
 * because Wix describes `dataToThirdParty` as the CCPA "do not sell/share" switch, also
 * `dataToThirdParty`. This mapping is an assumption, listed in docs/modules/cookie-consent.md.
 */
export function toWixConsentPolicy(categories: ConsentCategories): WixConsentPolicy {
  return {
    essential: true,
    functional: categories.preferences,
    analytics: categories.analytics,
    advertising: categories.marketing,
    dataToThirdParty: categories.marketing,
  };
}

export interface WixConsentPolicyManager {
  setConsentPolicy(
    policy: Partial<WixConsentPolicy>,
    onSuccess?: (details: unknown) => void,
    onError?: (error: string) => void
  ): unknown;
}

/** The slice of `window` the adapter touches. */
export interface WixConsentTarget {
  consentPolicyManager?: WixConsentPolicyManager;
  addEventListener(type: 'consentPolicyManagerReady', listener: () => void, options?: { once: boolean }): void;
}

export type WixSyncResult = 'disabled' | 'synced' | 'waiting' | 'failed';

/**
 * Tells Wix the visitor's choice. `waiting` means the manager is not on the page yet; the policy is
 * applied once Wix announces it (the latest record then, not the one passed here). Wix applies a
 * new policy to its scripts after the next page load, so a withdrawal is only complete on reload.
 */
export function syncConsentToWix(
  getRecord: () => ConsentRecord | null,
  options: { enabled?: boolean; target?: WixConsentTarget } = {}
): WixSyncResult {
  const enabled = options.enabled ?? CONSENT_WIX_SYNC_ENABLED;
  if (!enabled) return 'disabled';
  const target = options.target ?? (typeof window === 'undefined' ? undefined : (window as unknown as WixConsentTarget));
  if (!target) return 'disabled';

  const apply = (): WixSyncResult => {
    const record = getRecord();
    const manager = target.consentPolicyManager;
    if (!record || !manager) return 'failed';
    try {
      manager.setConsentPolicy(toWixConsentPolicy(record.categories));
      return 'synced';
    } catch {
      return 'failed';
    }
  };

  if (target.consentPolicyManager) return apply();
  target.addEventListener('consentPolicyManagerReady', apply, { once: true });
  return 'waiting';
}
