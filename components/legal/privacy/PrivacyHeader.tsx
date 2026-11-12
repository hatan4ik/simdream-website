import React from 'react';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import type { PrivacyPageCopy } from '@/lib/legal/page-copy';
import { LegalDocumentHeader } from '../shared/LegalDocumentHeader';

export function PrivacyHeader({ copy }: { copy: PrivacyPageCopy }) {
  return (
    <LegalDocumentHeader
      badge={copy.badge}
      badgeVariant="emerald"
      title={copy.title}
      legalLine={copy.legalLine}
      address={copy.address}
      versionLabel={copy.versionLabel}
      version={LEGAL_DOCUMENT_VERSION}
    />
  );
}
