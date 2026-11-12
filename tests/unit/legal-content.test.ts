import { describe, expect, it } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { LEGAL_PATHS, RULES_EXTRA_SECTION_IDS, RULES_SECTIONS } from '@/lib/legal/anchors';
import {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
  SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS,
} from '@/lib/legal/policy-constants';
import { RULES_HEADINGS } from '@/lib/legal/rules-headings';
import {
  ARABIC,
  FORBIDDEN_SCRIPTS,
  HEBREW,
  LANGUAGES,
  PRIVACY,
  RULES_CORE,
  RULES_EXTRA,
  allClauses,
  stringLeaves,
} from './_support/legal-fixtures';

/** The clause numbers of the owner's original rules (https://www.simdream.co.il/rules). */
const ORIGINAL_CLAUSE_NUMBERS = [
  ...Array.from({ length: 12 }, (_, i) => `1.${i + 1}`),
  ...['2.1', '2.2', '2.3'],
  ...Array.from({ length: 7 }, (_, i) => `3.${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `4.${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `5.${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `6.${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `7.${i + 1}`),
  '8.1',
  ...['9.1', '9.2', '9.3'],
  '10.1',
  '11.1',
  '12.1',
];

const numbersOf = (body: { sections: ReadonlyArray<{ clauses: ReadonlyArray<{ number?: string }> }> }) =>
  body.sections.flatMap((section) => section.clauses.map((clause) => clause.number).filter((n): n is string => Boolean(n)));

const clauseText = (body: Parameters<typeof allClauses>[0], number: string) => {
  const clause = allClauses(body).find((candidate) => candidate.number === number);
  if (!clause) throw new Error(`clause ${number} missing`);
  return [clause.term, clause.text, ...(clause.items ?? [])].filter(Boolean).join(' ');
};

describe('rules: faithful port of the original numbering (clauses 1 to 12)', () => {
  it.each(['he', 'en'] as const)('keeps every original clause number, in order, in %s', (language) => {
    expect(numbersOf(RULES_CORE[language])).toEqual(ORIGINAL_CLAUSE_NUMBERS);
  });

  it('keeps the privacy appendix as three unnumbered paragraphs in both core languages', () => {
    for (const language of ['he', 'en'] as const) {
      const appendix = RULES_CORE[language].sections.find((section) => section.id === 'privacy-appendix');
      expect(appendix?.clauses).toHaveLength(3);
      expect(appendix?.clauses.every((clause) => clause.number === undefined)).toBe(true);
    }
  });

  it('gives Hebrew and English the same section ids, clause counts and list sizes', () => {
    const shape = (body: (typeof RULES_CORE)['he']) =>
      body.sections.map((section) => [section.id, section.clauses.map((clause) => clause.items?.length ?? 0)]);
    expect(shape(RULES_CORE.en)).toEqual(shape(RULES_CORE.he));
  });

  it('keeps the contractual figures of clauses 3 to 4 exactly as the owner wrote them', () => {
    expect(REFUND_WINDOW_DAYS).toBe(14);
    expect(REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION).toBe(2);
    expect(FREE_RESCHEDULE_NOTICE_HOURS).toBe(24);
    expect(RESCHEDULE_FEE_ILS).toBe(150);
    expect(SUBSCRIPTION_REFUND_USED_SESSION_RATE_ILS).toEqual({ 30: 450, 60: 650, 90: 850 });

    for (const language of ['he', 'en'] as const) {
      const core = RULES_CORE[language];
      expect(clauseText(core, '4.2')).toContain('150');
      expect(clauseText(core, '4.3')).toContain('14');
      expect(clauseText(core, '4.3')).toMatch(/\b2\b/);
      expect(clauseText(core, '4.3')).toContain('100%');
      const rates = allClauses(core).find((clause) => clause.number === '4.6')?.items ?? [];
      expect(rates).toHaveLength(3);
      expect(rates.join('|')).toContain('450');
      expect(rates.join('|')).toContain('650');
      expect(rates.join('|')).toContain('850');
    }
  });

  it('carries the clauses the previous page version had dropped: 3.2 voucher entry, 6.4 opt-out, 7.8 commercial use, 9.3 cookies', () => {
    const he = RULES_CORE.he;
    expect(clauseText(he, '3.2')).toContain('שובר');
    expect(clauseText(he, '3.2')).toContain('תבוטל באופן אוטומטי');
    expect(clauseText(he, '6.4')).toContain('Opt-out');
    expect(clauseText(he, '7.8')).toContain('שימוש מסחרי, פרסומי ופרסומי־תדמית');
    expect(clauseText(he, '9.3')).toContain('Cookies');
    const en = RULES_CORE.en;
    expect(clauseText(en, '3.2')).toContain('cancelled automatically');
    expect(clauseText(en, '6.4')).toContain('Opt-out');
    expect(clauseText(en, '7.8')).toContain('commercial, advertising and image-promotion use');
    expect(clauseText(en, '9.3')).toContain('Cookies');
  });

  it('takes company number, address, e-mail and the age and timing rules from the facility registry', () => {
    for (const language of ['he', 'en'] as const) {
      const core = RULES_CORE[language];
      expect(clauseText(core, '1.1')).toContain(FACILITY_INFO.companyRegistrationNumber);
      expect(clauseText(core, '10.1')).toContain(FACILITY_INFO.contact.email);
      expect(clauseText(core, '3.5')).toContain(String(FACILITY_INFO.requirements.arriveEarlyMinutes));
      expect(clauseText(core, '3.5')).toContain(String(FACILITY_INFO.requirements.lateThresholdMinutes));
      expect(clauseText(core, '3.6')).toContain(String(FACILITY_INFO.requirements.minimumAgeYears));
      expect(clauseText(core, '3.1')).toContain(String(FACILITY_INFO.requirements.minBookingCustomerAgeYears));
    }
  });
});

describe('rules: new clauses 13 to 15 in six languages', () => {
  it('numbers the new clauses 13 to 15 without touching the original numbers', () => {
    for (const language of LANGUAGES) {
      expect(numbersOf(RULES_EXTRA[language])).toEqual([
        '13.1', '13.2', '13.3', '13.4',
        '14.1', '14.2', '14.3', '14.4', '14.5', '14.6', '14.7',
        '15.1', '15.2', '15.3', '15.4',
      ]);
    }
  });

  it.each(LANGUAGES)('has the same structure in %s as in English', (language) => {
    const shape = (body: (typeof RULES_EXTRA)['en']) =>
      body.sections.map((section) => ({
        id: section.id,
        intro: Boolean(section.intro),
        clauses: section.clauses.map((clause) => ({
          number: clause.number,
          term: Boolean(clause.term),
          items: clause.items?.length ?? 0,
          action: clause.action?.href ?? null,
          added: clause.added ?? false,
          review: clause.needsLegalReview ?? false,
        })),
      }));
    expect(shape(RULES_EXTRA[language])).toEqual(shape(RULES_EXTRA.en));
  });

  it('exposes the three stable anchors', () => {
    expect(RULES_EXTRA_SECTION_IDS).toEqual(['refunds', 'media-release', 'consent']);
    for (const language of LANGUAGES) {
      expect(RULES_EXTRA[language].sections.map((section) => section.id)).toEqual(['refunds', 'media-release', 'consent']);
    }
  });

  it.each(LANGUAGES)('links clause 13.1 to the unlisted refund form in %s', (language) => {
    const clause = allClauses(RULES_EXTRA[language]).find((candidate) => candidate.number === '13.1');
    expect(clause?.action?.href).toBe('/refund');
    expect(clause?.action?.href).toBe(LEGAL_PATHS.refundForm);
    expect(clause?.action?.label.trim()).not.toBe('');
  });

  it.each(LANGUAGES)('restates clauses 4.1 to 4.6 by reference and quotes the registry figures in %s', (language) => {
    const text = clauseText(RULES_EXTRA[language], '13.2');
    for (const figure of [REFUND_WINDOW_DAYS, REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION, FREE_RESCHEDULE_NOTICE_HOURS, RESCHEDULE_FEE_ILS]) {
      expect(text).toContain(String(figure));
    }
    for (const reference of ['4.1', '4.2', '4.3', '4.4', '4.6']) expect(text).toContain(reference);
  });

  it.each(LANGUAGES)('covers every point of the media release form in %s', (language) => {
    const section = RULES_EXTRA[language].sections.find((candidate) => candidate.id === 'media-release');
    expect(section?.intro?.length).toBeGreaterThan(100);
    const purposes = section?.clauses.find((clause) => clause.number === '14.2');
    expect(purposes?.items).toHaveLength(3);
    const joined = stringLeaves(section).map(([, text]) => text).join(' ');
    for (const platform of ['Facebook', 'Instagram', 'TikTok', 'YouTube']) expect(joined).toContain(platform);
    // Privacy Protection Law 5741-1981 and the defamation law 5725-1965 are named in the waiver of claims.
    expect(joined).toContain('1981');
    expect(joined).toContain('1965');
    // Adult declaration and parent or guardian approval for minors.
    expect(joined).toContain('18');
    expect(section?.clauses.map((clause) => clause.number)).toContain('14.6');
    // The written opt-out of clause 6.4 survives.
    expect(clauseText(RULES_EXTRA[language], '14.7')).toContain('6.4');
  });

  it('marks clauses that are not in the original text as added, and keeps the waiver text unmarked', () => {
    const extra = allClauses(RULES_EXTRA.en);
    expect(extra.filter((clause) => clause.added).map((clause) => clause.number)).toEqual([
      '13.1', '13.2', '13.3', '13.4', '14.7', '15.1', '15.2', '15.3', '15.4',
    ]);
    expect(extra.filter((clause) => clause.needsLegalReview).map((clause) => clause.number)).toEqual([
      '13.4', '14.7', '15.2', '15.3', '15.4',
    ]);
  });
});

describe('headings and anchors', () => {
  it('has a non-empty heading for every rules section in every language', () => {
    for (const language of LANGUAGES) {
      expect(Object.keys(RULES_HEADINGS[language]).sort()).toEqual(RULES_SECTIONS.map((section) => section.id).sort());
      expect(Object.values(RULES_HEADINGS[language]).filter((heading) => heading.trim() === '')).toEqual([]);
    }
  });

  it('numbers the rules sections 1 to 15 plus an unnumbered appendix', () => {
    expect(RULES_SECTIONS.map((section) => section.number)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '',
    ]);
  });

  it('renders every anchor the rest of the site links to', () => {
    const rendered = new Set([
      ...RULES_CORE.he.sections.map((section) => section.id),
      ...RULES_EXTRA.he.sections.map((section) => section.id),
    ]);
    expect([...rendered].sort()).toEqual(RULES_SECTIONS.map((section) => section.id).sort());
    for (const path of [LEGAL_PATHS.refunds, LEGAL_PATHS.mediaRelease, LEGAL_PATHS.consent]) {
      expect(rendered.has(path.split('#')[1])).toBe(true);
    }
  });
});

describe('privacy policy', () => {
  const SECTION_IDS = [
    'general', 'information-and-consent', 'purposes', 'third-parties', 'your-rights', 'security',
    'checkout-data', 'photos-and-video', 'cookies', 'version',
  ];

  it.each(LANGUAGES)('keeps the original six sections, then the added ones, in %s', (language) => {
    expect(PRIVACY[language].sections.map((section) => section.id)).toEqual(SECTION_IDS);
    expect(PRIVACY[language].sections.map((section) => section.number)).toEqual(SECTION_IDS.map((_, i) => String(i + 1)));
    expect(PRIVACY[language].sections.slice(0, 6).every((section) => !section.added)).toBe(true);
    expect(PRIVACY[language].sections.slice(6).every((section) => section.added)).toBe(true);
  });

  it.each(LANGUAGES)('has the same structure in %s as in English', (language) => {
    const shape = (body: (typeof PRIVACY)['en']) =>
      body.sections.map((section) => ({
        id: section.id,
        clauses: section.clauses.map((clause) => ({ term: Boolean(clause.term), items: clause.items?.length ?? 0, added: clause.added ?? false })),
      }));
    expect(shape(PRIVACY[language])).toEqual(shape(PRIVACY.en));
  });

  it.each(LANGUAGES)('discloses Wix, payment processors and Google / Meta, and names the contact e-mail in %s', (language) => {
    const all = stringLeaves(PRIVACY[language].sections.find((section) => section.id === 'third-parties')).map(([, text]) => text).join(' ');
    expect(all).toContain('Wix.com');
    expect(all).toContain('Google / Meta');
    const rights = stringLeaves(PRIVACY[language].sections.find((section) => section.id === 'your-rights')).map(([, text]) => text).join(' ');
    expect(rights).toContain(FACILITY_INFO.contact.email);
  });

  it.each(LANGUAGES)('describes the new data points, cookies and local storage honestly in %s', (language) => {
    const checkout = PRIVACY[language].sections.find((section) => section.id === 'checkout-data');
    expect(checkout?.clauses).toHaveLength(4);
    const cookies = PRIVACY[language].sections.find((section) => section.id === 'cookies');
    expect(cookies?.clauses).toHaveLength(3);
    // Google / Meta tools are mentioned only as consent-gated; the statistics clause is flagged for review.
    expect(cookies?.clauses[2].needsLegalReview).toBe(true);
    expect(PRIVACY[language].sections.find((section) => section.id === 'version')?.clauses).toHaveLength(1);
  });
});

describe('no cross-script contamination in any legal text (AGENTS.md section 5)', () => {
  type Document = [name: string, body: unknown, language: (typeof LANGUAGES)[number]];
  const documents: Document[] = [
    ...LANGUAGES.map((language): Document => [`rules-extra.${language}`, RULES_EXTRA[language], language]),
    ...LANGUAGES.map((language): Document => [`privacy.${language}`, PRIVACY[language], language]),
    ['rules-core.he', RULES_CORE.he, 'he'],
    ['rules-core.en', RULES_CORE.en, 'en'],
  ];

  it.each(documents)('%s uses only its own script', (_name, body, language) => {
    const violations = stringLeaves(body).flatMap(([path, text]) =>
      FORBIDDEN_SCRIPTS[language].filter(({ pattern }) => pattern.test(text)).map(({ name }) => `${path}: ${name}`)
    );
    expect(violations).toEqual([]);
  });

  it('keeps each document in the script of its language', () => {
    expect(stringLeaves(RULES_CORE.he).some(([, text]) => HEBREW.test(text))).toBe(true);
    expect(stringLeaves(PRIVACY.ar).some(([, text]) => ARABIC.test(text))).toBe(true);
    expect(stringLeaves(RULES_EXTRA.ar).some(([, text]) => ARABIC.test(text))).toBe(true);
  });
});
