import React from 'react';
import type { LegalLanguage, PrivacyBody } from '@/lib/legal/types';
import { LegalSectionCard } from '../shared/LegalSectionCard';
import { LegalToc } from '../shared/LegalToc';
import { PRIVACY_FALLBACK_ICON, PRIVACY_SECTION_ICONS } from './privacy-section-icons';

interface PrivacySectionsProps {
  language: LegalLanguage;
  body: PrivacyBody;
  tocLabel: string;
}

/** Table of contents plus one card per privacy section, all in the visitor's language. */
export function PrivacySections({ language, body, tocLabel }: PrivacySectionsProps) {
  const toc = body.sections.map(({ id, number, title }) => ({ id, number, title }));
  return (
    <>
      <LegalToc label={tocLabel} items={toc} />
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        {body.sections.map((section) => (
          <LegalSectionCard
            key={section.id}
            id={section.id}
            number={section.number}
            title={section.title}
            intro={section.intro}
            clauses={section.clauses}
            icon={PRIVACY_SECTION_ICONS[section.id] ?? PRIVACY_FALLBACK_ICON}
            pageLanguage={language}
          />
        ))}
      </div>
    </>
  );
}
