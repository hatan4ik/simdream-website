'use client';

import { useEffect } from 'react';
import { loadMediaReleaseSectionIntl } from '@/lib/legal/loaders-intl';
import type { LegalIntlLanguage, LegalSectionBody } from '@/lib/legal/types';

/** The load states `MediaReleaseDisclosure` shows; this loader reports the same three transitions. */
export type MediaReleaseLoadState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; section: LegalSectionBody; language: LegalIntlLanguage };

/**
 * Loads clause 14 in English, Russian, French, Arabic or Spanish and reports it to the disclosure.
 * Renders nothing. CLIENT-ONLY: `MediaReleaseDisclosure` mounts it through `next/dynamic` with
 * `ssr: false`, so the five languages' clause text stays out of the Wix worker.
 */
export default function MediaReleaseLoaderIntl({
  language,
  onState,
}: {
  language: LegalIntlLanguage;
  onState: (state: MediaReleaseLoadState) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    onState({ status: 'loading' });
    loadMediaReleaseSectionIntl(language)
      .then((section) => {
        if (!cancelled) onState({ status: 'ready', section, language });
      })
      .catch(() => {
        if (!cancelled) onState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [language, onState]);
  return null;
}
