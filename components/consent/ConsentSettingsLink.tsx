'use client';

import React from 'react';
import { openConsentSettings } from '@/lib/consent';
import { useLanguage } from '@/lib/i18n/language-context';
import { CONSENT_LINK_LABEL } from './link-label';

/**
 * "Cookie settings": reopens the consent dialog from anywhere (the footer, the privacy policy page).
 * A button, because it acts rather than navigates. It carries no copy beyond its label, so mounting
 * it does not load the banner or the dialog.
 */
export function ConsentSettingsLink({ className }: { className?: string }) {
  const { language } = useLanguage();
  return (
    <button type="button" data-consent-settings-link onClick={openConsentSettings} className={className}>
      {CONSENT_LINK_LABEL[language] || CONSENT_LINK_LABEL.en}
    </button>
  );
}
