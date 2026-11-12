'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { PRIVACY_PAGE_COPY } from '@/lib/legal/page-copy';
import { LegalContactBox } from './shared/LegalContactBox';
import { LegalLoadingFallback } from './shared/LegalLoadingFallback';
import { PrivacyBody } from './privacy/PrivacyBody';
import { PrivacyHeader } from './privacy/PrivacyHeader';

/**
 * `/privacy-policy`: header, the policy text for the visitor's language (table of contents and
 * sections) and the contact box. The text lives in `lib/legal/content/privacy.*`, one module per
 * language, loaded on demand.
 */
export function PrivacyPolicyContentView() {
  const { language } = useLanguage();
  const copy = PRIVACY_PAGE_COPY[language] || PRIVACY_PAGE_COPY.en;

  return (
    <div className="flex-1 w-full min-w-0 py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      <PrivacyHeader copy={copy} />
      <Suspense fallback={<LegalLoadingFallback label={copy.loading} />}>
        <PrivacyBody language={language} tocLabel={copy.tocLabel} />
      </Suspense>
      <LegalContactBox question={copy.contactOfficer} crossLinkHref="/rules" crossLinkLabel={copy.rulesLink} />
    </div>
  );
}
