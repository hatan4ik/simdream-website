import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface LegalDocumentHeaderProps {
  badge: string;
  badgeVariant: 'sky' | 'emerald';
  title: string;
  /** Legal entity line (name and registration number), already in the script of the page language. */
  legalLine: string;
  address: string;
  versionLabel: string;
  version: string;
}

/** Title block shared by the rules and the privacy policy, with the document version stamp. */
export function LegalDocumentHeader({
  badge,
  badgeVariant,
  title,
  legalLine,
  address,
  versionLabel,
  version,
}: LegalDocumentHeaderProps) {
  return (
    <header className="space-y-4 border-b border-slate-800 pb-8">
      <Badge variant={badgeVariant}>{badge}</Badge>
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{title}</h1>
      <p className="text-sm text-slate-300 font-mono">{legalLine}</p>
      <p className="text-xs text-slate-400">{address}</p>
      <p className="text-xs text-slate-400">
        {versionLabel}:{' '}
        <span dir="ltr" data-legal-version={version} className="font-mono text-slate-300">
          {version}
        </span>
      </p>
    </header>
  );
}
