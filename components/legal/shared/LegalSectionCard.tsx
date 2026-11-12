import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { languageDirection } from '@/lib/i18n/language-preference';
import type { LegalClause, LegalLanguage } from '@/lib/legal/types';
import { LegalClauseList } from './LegalClauseList';

interface LegalSectionCardProps {
  /** DOM id and anchor of the section. */
  id: string;
  /** Section number as in the original document, or empty for the appendix. */
  number: string;
  title: string;
  /** Optional lead paragraph (the recital of the media release, for example). */
  intro?: string;
  clauses: readonly LegalClause[];
  icon: LucideIcon;
  /** Language of the clause text when it differs from the page language (English body on a Russian page). */
  bodyLanguage?: LegalLanguage;
  pageLanguage: LegalLanguage;
}

/** One card per clause group: icon, numbered heading, optional intro and the clause list. */
export function LegalSectionCard({
  id,
  number,
  title,
  intro,
  clauses,
  icon: Icon,
  bodyLanguage,
  pageLanguage,
}: LegalSectionCardProps) {
  const foreignBody = bodyLanguage !== undefined && bodyLanguage !== pageLanguage;
  const bodyProps = foreignBody ? { lang: bodyLanguage, dir: languageDirection(bodyLanguage) } : {};

  return (
    <Card className="p-6 space-y-4 scroll-mt-24" id={id}>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0 text-sky-400" aria-hidden="true" />
        {number ? (
          <span dir="ltr" className="shrink-0">
            {number}.
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      <div className="space-y-3" {...bodyProps}>
        {intro ? <p className="text-xs sm:text-sm leading-relaxed">{intro}</p> : null}
        <LegalClauseList clauses={clauses} />
      </div>
    </Card>
  );
}
