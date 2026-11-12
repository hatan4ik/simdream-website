import type { SupportedLanguage } from '@/lib/i18n/translations';

/** The six site languages; legal copy is keyed by these codes only. */
export type LegalLanguage = SupportedLanguage;

/**
 * Every language except Hebrew. The server renders Hebrew only, so the text of these five is
 * loaded by client-only modules (`*Intl`, `./loaders-intl`); see docs/modules/wix-bundle-diet.md.
 */
export type LegalIntlLanguage = Exclude<LegalLanguage, 'he'>;

/** Languages that carry the long, pre-existing rules body (clauses 1 to 12 and the appendix). */
export type RulesCoreLanguage = 'he' | 'en';

/** A link that closes a clause, such as the refund form behind clause 13.1. */
export interface LegalClauseAction {
  /** Site path, optionally with a hash. Never an external URL. */
  href: string;
  label: string;
}

/**
 * One numbered clause. The `number` is the clause reference quoted in the original rules
 * (for example "4.6") and must never change once published, because customers and counsel cite it.
 */
export interface LegalClause {
  /** Reference such as "4.6". Absent for unnumbered paragraphs (the privacy appendix, definitions lists). */
  number?: string;
  /** Short bold lead-in: the defined term ("The Center") or the topic ("Photography"). */
  term?: string;
  text: string;
  /** Bullet or amount lines that belong under the clause text. */
  items?: readonly string[];
  action?: LegalClauseAction;
  /** Passage that is not in the owner's original text; listed in docs/modules/legal-content.md. */
  added?: true;
  /** Wording that needs a lawyer's decision before it is relied upon; listed in the handoff. */
  needsLegalReview?: true;
}

export interface LegalSectionBody {
  /** Stable DOM id and anchor, for example `refunds`. */
  id: string;
  intro?: string;
  clauses: readonly LegalClause[];
}

export interface LegalBody {
  sections: readonly LegalSectionBody[];
}

/** A privacy section carries its own title because every language has a full translation. */
export interface PrivacySectionBody extends LegalSectionBody {
  title: string;
  number: string;
  added?: true;
}

export interface PrivacyBody {
  sections: readonly PrivacySectionBody[];
}
