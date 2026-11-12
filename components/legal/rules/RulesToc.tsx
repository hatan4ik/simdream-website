import React from 'react';
import { RULES_SECTIONS } from '@/lib/legal/anchors';
import { RULES_HEADINGS } from '@/lib/legal/rules-headings';
import type { LegalLanguage } from '@/lib/legal/types';
import { LegalToc } from '../shared/LegalToc';

/** Table of contents of the rules: all sixteen sections, titled in the visitor's language. */
export function RulesToc({ language, label }: { language: LegalLanguage; label: string }) {
  const headings = RULES_HEADINGS[language];
  const items = RULES_SECTIONS.map(({ id, number }) => ({ id, number, title: headings[id] }));
  return <LegalToc label={label} items={items} />;
}
