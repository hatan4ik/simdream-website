import React from 'react';
import { RULES_EXTRA_SECTION_IDS, RULES_SECTIONS } from '@/lib/legal/anchors';
import { RULES_HEADINGS } from '@/lib/legal/rules-headings';
import type { LegalBody, LegalLanguage, LegalSectionBody, RulesCoreLanguage } from '@/lib/legal/types';
import { LegalSectionCard } from '../shared/LegalSectionCard';
import { RULES_SECTION_ICONS } from './rules-section-icons';

interface RulesSectionsProps {
  language: LegalLanguage;
  /** Clauses 1 to 12 and the appendix, in `coreLanguage`. */
  core: LegalBody;
  coreLanguage: RulesCoreLanguage;
  /** Clauses 13 to 15, in the page language. */
  extra: LegalBody;
}

const EXTRA_IDS: ReadonlySet<string> = new Set(RULES_EXTRA_SECTION_IDS);

/**
 * The rules in section order. Clause groups 1 to 12 and the appendix are rendered from the long
 * body; 13 to 15 from the per-language extras. The numbering and ids come from `RULES_SECTIONS`,
 * so they match the original rules and the anchors other modules link to.
 */
export function RulesSections({ language, core, coreLanguage, extra }: RulesSectionsProps) {
  const headings = RULES_HEADINGS[language];
  const byId = new Map<string, { section: LegalSectionBody; bodyLanguage: LegalLanguage }>();
  for (const section of core.sections) byId.set(section.id, { section, bodyLanguage: coreLanguage });
  for (const section of extra.sections) byId.set(section.id, { section, bodyLanguage: language });

  return (
    <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
      {RULES_SECTIONS.map(({ id, number }) => {
        const entry = byId.get(id);
        if (!entry) return null;
        return (
          <LegalSectionCard
            key={id}
            id={id}
            number={number}
            title={headings[id]}
            intro={entry.section.intro}
            clauses={entry.section.clauses}
            icon={RULES_SECTION_ICONS[id]}
            bodyLanguage={EXTRA_IDS.has(id) ? language : entry.bodyLanguage}
            pageLanguage={language}
          />
        );
      })}
    </div>
  );
}
