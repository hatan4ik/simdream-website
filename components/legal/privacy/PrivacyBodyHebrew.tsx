import React from 'react';
import { loadPrivacyHe } from '@/lib/legal/loaders';
import { PRIVACY_PAGE_COPY } from '@/lib/legal/page-copy';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { PrivacySections } from './PrivacySections';

/**
 * The Hebrew privacy policy text, rendered by the server and placed into `PrivacyPolicyContentView`
 * as a slot. A server component on purpose, for the reason given in `RulesBodyHebrew`: inside a
 * `<Suspense>` boundary the text is streamed and, hydrated early, every section id exists twice.
 */
export async function PrivacyBodyHebrew() {
  const body = await loadPrivacyHe();
  return (
    <>
      <PrivacySections language="he" body={body} tocLabel={PRIVACY_PAGE_COPY.he.tocLabel} />
      <LegalHashScroll />
    </>
  );
}
