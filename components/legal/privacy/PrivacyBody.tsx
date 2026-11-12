'use client';

import React, { use } from 'react';
import { loadPrivacyPolicy } from '@/lib/legal/loaders';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { PrivacySections } from './PrivacySections';

/** Loads the privacy policy text for the visitor's language and renders it (see `RulesBody`). */
export function PrivacyBody({ language, tocLabel }: { language: LegalLanguage; tocLabel: string }) {
  const body = use(loadPrivacyPolicy(language));
  return (
    <>
      <PrivacySections language={language} body={body} tocLabel={tocLabel} />
      <LegalHashScroll />
    </>
  );
}
