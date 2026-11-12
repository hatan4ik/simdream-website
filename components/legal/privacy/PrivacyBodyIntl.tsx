'use client';

import React, { use } from 'react';
import { loadPrivacyIntl } from '@/lib/legal/loaders-intl';
import type { LegalIntlLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { PrivacySections } from './PrivacySections';

/**
 * The privacy policy text in English, Russian, French, Arabic or Spanish. CLIENT-ONLY: loaded through
 * `next/dynamic` with `ssr: false` from `PrivacyBody`, so none of it is in the Wix worker.
 */
export default function PrivacyBodyIntl({ language, tocLabel }: { language: LegalIntlLanguage; tocLabel: string }) {
  const body = use(loadPrivacyIntl(language));
  return (
    <>
      <PrivacySections language={language} body={body} tocLabel={tocLabel} />
      <LegalHashScroll />
    </>
  );
}
