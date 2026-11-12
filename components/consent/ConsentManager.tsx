'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  CONSENT_OPEN_EVENT,
  CONSENT_WIX_SYNC_ENABLED,
  getConsent,
  openConsentSettings,
  subscribe,
  syncConsentToWix,
} from '@/lib/consent';
import { useConsentRecord, useConsentSettingsOpen } from './use-consent-state';

// The banner and dialog (with all six languages of copy) load only when they are needed: a returning
// visitor with a valid decision never downloads them until "Cookie settings" is clicked. `ssr: false`
// also keeps them out of the server bundle, which has a hard size budget on Wix.
const ConsentBanner = dynamic(() => import('./ConsentBanner').then((module) => module.ConsentBanner), { ssr: false });
const ConsentDialog = dynamic(() => import('./ConsentDialog').then((module) => module.ConsentDialog), { ssr: false });

/**
 * The single mount point (app/layout.tsx). Renders nothing during server rendering and hydration
 * (`record === undefined`), then the banner when there is no current decision and the dialog when
 * something asked for it. Adds no tracker and sets no cookie.
 */
export function ConsentManager() {
  const record = useConsentRecord();
  const settingsOpen = useConsentSettingsOpen();

  // Lets code outside React (or a plain link) ask for the dialog: window.dispatchEvent(new Event(CONSENT_OPEN_EVENT)).
  useEffect(() => {
    window.addEventListener(CONSENT_OPEN_EVENT, openConsentSettings);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openConsentSettings);
  }, []);

  // Wix consent policy: inert unless NEXT_PUBLIC_CONSENT_WIX_SYNC=true (lib/consent/wix-sync.ts).
  useEffect(() => {
    if (!CONSENT_WIX_SYNC_ENABLED) return undefined;
    const sync = () => syncConsentToWix(getConsent);
    sync();
    return subscribe(sync);
  }, []);

  return (
    <>
      {record === null && <ConsentBanner />}
      {settingsOpen && <ConsentDialog />}
    </>
  );
}
