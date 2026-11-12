/**
 * Cookie consent UI. Mount <ConsentManager /> once (app/layout.tsx); place <ConsentSettingsLink />
 * wherever visitors should be able to reopen their choice. Logic lives in lib/consent.
 */
export { ConsentManager } from './ConsentManager';
export { ConsentSettingsLink } from './ConsentSettingsLink';
export { useConsentCategory } from './use-consent-state';
