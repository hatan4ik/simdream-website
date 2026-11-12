import React from 'react';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal/versions';
import type { RulesPageCopy } from '@/lib/legal/page-copy';
import { LegalDocumentHeader } from '../shared/LegalDocumentHeader';

export function RulesHeader({ copy }: { copy: RulesPageCopy }) {
  return (
    <LegalDocumentHeader
      badge={copy.badge}
      badgeVariant="sky"
      title={copy.title}
      legalLine={copy.legalLine}
      address={copy.address}
      versionLabel={copy.versionLabel}
      version={LEGAL_DOCUMENT_VERSION}
    />
  );
}
