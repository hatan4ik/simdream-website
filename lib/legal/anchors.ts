/**
 * Stable anchors of the legal pages. Other modules (checkout consent, the refund form, the footer)
 * link here instead of retyping paths, and `tests/unit/legal-content.test.ts` checks that every
 * anchor names a section that really renders.
 */

/** DOM ids of the rules sections, in page order. The numbers are the clause numbers of the rules. */
export const RULES_SECTIONS = [
  { id: 'definitions', number: '1' },
  { id: 'principles', number: '2' },
  { id: 'booking', number: '3' },
  { id: 'changes', number: '4' },
  { id: 'liability', number: '5' },
  { id: 'safety', number: '6' },
  { id: 'disclaimer', number: '7' },
  { id: 'promotions', number: '8' },
  { id: 'website', number: '9' },
  { id: 'accessibility', number: '10' },
  { id: 'force-majeure', number: '11' },
  { id: 'disputes', number: '12' },
  { id: 'refunds', number: '13' },
  { id: 'media-release', number: '14' },
  { id: 'consent', number: '15' },
  { id: 'privacy-appendix', number: '' },
] as const;

export type RulesSectionId = (typeof RULES_SECTIONS)[number]['id'];

/** Sections 1 to 12 and the appendix come from the long body; 13 to 15 from the per-language extras. */
export const RULES_EXTRA_SECTION_IDS = ['refunds', 'media-release', 'consent'] as const;

export const LEGAL_PATHS = {
  rules: '/rules',
  refunds: '/rules#refunds',
  mediaRelease: '/rules#media-release',
  consent: '/rules#consent',
  privacyPolicy: '/privacy-policy',
  /** The online refund request form. Deliberately unlisted: it is linked from clause 13 and checkout only. */
  refundForm: '/refund',
} as const;

/** The hash part of a legal path, or null when it has none. */
export function legalPathAnchor(path: string): string | null {
  const index = path.indexOf('#');
  return index === -1 ? null : path.slice(index + 1);
}
