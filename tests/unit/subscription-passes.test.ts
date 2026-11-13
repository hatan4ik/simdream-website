import { describe, expect, it } from 'vitest';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import type { Language } from '@/lib/i18n/translations';
import {
  CONSUMER_SUBSCRIPTION_PASSES,
  findSubscriptionPass,
  getSubscriptionPassFinancials,
  getSubscriptionPassTrainingAddons,
  PRO_SUBSCRIPTION_PASSES,
  SUBSCRIPTION_PASSES,
  SUBSCRIPTION_SECTION_COPY,
  subscriptionPassReturnPath,
} from '@/lib/data/subscription-passes';
import { SUBSCRIPTION_PAGE_COPY } from '@/lib/data/subscription-page-copy';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];
const HEBREW = /[\u0590-\u05FF]/;
const ARABIC = /[\u0600-\u06FF]/;
const FORBIDDEN: Record<Language, RegExp[]> = {
  he: [ARABIC],
  ar: [HEBREW],
  en: [HEBREW, ARABIC],
  ru: [HEBREW, ARABIC],
  fr: [HEBREW, ARABIC],
  es: [HEBREW, ARABIC],
  de: [HEBREW, ARABIC],
};
const LEGACY_TERMS: Record<Language, RegExp[]> = {
  en: [/\bpass(?:es)?\b/i, /multi-flight/i],
  he: [/כרטיסי/],
  ru: [/\bпасс/iu],
  fr: [/\bpass\b/iu],
  ar: [/بطاق/u],
  es: [/\bpass(?:es)?\b/iu, /multi-flight/i],
  de: [/\bpass(?:es)?\b/iu, /multi-flight/i],
};
const SUBSCRIPTION_TERMS: Record<Language, RegExp> = {
  en: /subscription/i,
  he: /מנוי/,
  ru: /абонемент/i,
  fr: /abonnement/i,
  ar: /اشتراك/,
  es: /subscription|suscripci[oó]n/i,
  de: /abonnement|abo/i,
};

function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringLeaves);
  return [];
}

describe('flight subscription catalogue', () => {
  it('ships exactly the four consumer tracks and the two PRO tracks', () => {
    expect(SUBSCRIPTION_PASSES.map((pass) => [pass.id, pass.audience])).toEqual([
      ['flight-foundations-5x60', 'consumer'],
      ['advanced-captain-5x90', 'consumer'],
      ['atpl-concepts-10x60', 'consumer'],
      ['airline-readiness-10x90', 'consumer'],
      ['pro-interview-3x90', 'pro'],
      ['pro-interview-5x60', 'pro'],
    ]);
    expect(SUBSCRIPTION_PASSES.map((pass) => [pass.sessions, pass.sessionMinutes])).toEqual([
      [5, 60],
      [5, 90],
      [10, 60],
      [10, 90],
      [3, 90],
      [5, 60],
    ]);
    expect(CONSUMER_SUBSCRIPTION_PASSES).toHaveLength(4);
    expect(PRO_SUBSCRIPTION_PASSES).toHaveLength(2);
  });

  it('builds consumer tracks on recreational packages and PRO tracks on the PRO tiers, returning each to its own route', () => {
    for (const pass of CONSUMER_SUBSCRIPTION_PASSES) {
      expect(SIMULATOR_PACKAGES.find((entry) => entry.id === pass.packageId)?.category, pass.id).toBe('recreational');
      expect(subscriptionPassReturnPath(pass)).toBe(`/subscriptions#${pass.id}`);
    }
    for (const pass of PRO_SUBSCRIPTION_PASSES) {
      expect(SIMULATOR_PACKAGES.find((entry) => entry.id === pass.packageId)?.category, pass.id).toBe('training');
      expect(subscriptionPassReturnPath(pass)).toBe('/pro#pro-tracks');
    }
    // The approved PRO track prices and their savings against the single PRO sessions.
    expect(PRO_SUBSCRIPTION_PASSES.map((pass) => [pass.id, pass.priceIls, getSubscriptionPassFinancials(pass)])).toEqual([
      ['pro-interview-3x90', 2565, { standardValueIls: 3855, savingsIls: 1290, savingsPercent: 33 }],
      ['pro-interview-5x60', 4165, { standardValueIls: 4750, savingsIls: 585, savingsPercent: 12 }],
    ]);
  });

  it('derives standard value and savings from the authoritative base package prices', () => {
    for (const pass of SUBSCRIPTION_PASSES) {
      const basePackage = SIMULATOR_PACKAGES.find((entry) => entry.id === pass.packageId);
      expect(basePackage, pass.id).toBeDefined();
      expect(basePackage?.durationMinutes, pass.id).toBe(pass.sessionMinutes);

      const financials = getSubscriptionPassFinancials(pass);
      expect(financials.standardValueIls, pass.id).toBe(basePackage!.priceIls * pass.sessions);
      expect(financials.savingsIls, pass.id).toBe(financials.standardValueIls - pass.priceIls);
      expect(financials.savingsIls, pass.id).toBeGreaterThan(0);
      expect(financials.savingsPercent, pass.id).toBeGreaterThan(0);
      expect(pass.validityMonths, pass.id).toBe(12);
    }
  });

  it('uses real add-on registry identifiers for every training theme without copying their prices or minutes', () => {
    // PRO tracks carry zero add-on noise (AGENTS.md §3).
    for (const pass of PRO_SUBSCRIPTION_PASSES) expect(pass.trainingAddonIds, pass.id).toEqual([]);
    for (const pass of SUBSCRIPTION_PASSES) {
      expect(pass).not.toHaveProperty('standardValueIls');
      expect(pass).not.toHaveProperty('trainingAddonPriceIls');
      expect(pass).not.toHaveProperty('trainingAddonMinutes');
      if (pass.audience === 'consumer') expect(pass.trainingAddonIds.length, pass.id).toBeGreaterThan(0);
      expect(getSubscriptionPassTrainingAddons(pass).map((addon) => addon.id)).toEqual(pass.trainingAddonIds);
      for (const addonId of pass.trainingAddonIds) {
        expect(FLIGHT_ADDONS.some((addon) => addon.id === addonId), `${pass.id} ${addonId}`).toBe(true);
      }
    }
  });

  it('looks up known pass ids and refuses unknown ids', () => {
    for (const pass of SUBSCRIPTION_PASSES) expect(findSubscriptionPass(pass.id)).toBe(pass);
    expect(findSubscriptionPass('untrusted-pass-id')).toBeUndefined();
    expect(findSubscriptionPass(null)).toBeUndefined();
  });
});

describe('flight subscription five-language discipline', () => {
  it.each(CODES)('provides complete, non-empty copy in %s', (language) => {
    const section = SUBSCRIPTION_SECTION_COPY[language] ?? SUBSCRIPTION_SECTION_COPY.en;
    expect(stringLeaves(section).filter((text) => text.trim() === '')).toEqual([]);
    expect(stringLeaves(SUBSCRIPTION_PAGE_COPY[language] ?? SUBSCRIPTION_PAGE_COPY.en).filter((text) => text.trim() === '')).toEqual([]);
    for (const pass of SUBSCRIPTION_PASSES) {
      const copy = pass.copy[language] ?? pass.copy.en;
      expect(copy.title.trim(), `${pass.id} title`).not.toHaveLength(0);
      expect(copy.summary.trim(), `${pass.id} summary`).not.toHaveLength(0);
      expect(copy.curriculum, `${pass.id} curriculum`).toHaveLength(5);
      expect(copy.curriculum.filter((item) => item.trim() === '')).toEqual([]);
    }
  });

  it.each(CODES)('keeps foreign scripts out of %s subscription copy', (language) => {
    const copy = [
      ...stringLeaves(SUBSCRIPTION_SECTION_COPY[language] ?? SUBSCRIPTION_SECTION_COPY.en),
      ...stringLeaves(SUBSCRIPTION_PAGE_COPY[language] ?? SUBSCRIPTION_PAGE_COPY.en),
      ...SUBSCRIPTION_PASSES.flatMap((pass) => stringLeaves(pass.copy[language] ?? pass.copy.en)),
    ];
    expect(copy.filter((text) => FORBIDDEN[language].some((pattern) => pattern.test(text)))).toEqual([]);
  });

  it.each(CODES)('uses localized subscription vocabulary in %s without legacy pass terminology', (language) => {
    const copy = [
      ...stringLeaves(SUBSCRIPTION_SECTION_COPY[language] ?? SUBSCRIPTION_SECTION_COPY.en),
      ...stringLeaves(SUBSCRIPTION_PAGE_COPY[language] ?? SUBSCRIPTION_PAGE_COPY.en),
      ...SUBSCRIPTION_PASSES.flatMap((subscription) => stringLeaves(subscription.copy[language] ?? subscription.copy.en)),
    ];
    expect(copy.some((text) => SUBSCRIPTION_TERMS[language].test(text))).toBe(true);
    expect(copy.filter((text) => LEGACY_TERMS[language].some((pattern) => pattern.test(text)))).toEqual([]);
  });

  it.each(['he', 'ar'] as const)('uses its own script for %s curriculum prose', (language) => {
    const ownScript = language === 'he' ? HEBREW : ARABIC;
    const curriculum = SUBSCRIPTION_PASSES.flatMap((pass) => pass.copy[language].curriculum);
    expect(curriculum.filter((item) => !ownScript.test(item))).toEqual([]);
  });
});

/**
 * Product decision (2026-11-11): `/subscriptions` sells to non-professional customers. Airline
 * interviews, assessments and screening, and the professional acronyms, belong to `/pro` and its
 * PRO tracks. "Airline captain" as the mentor stays (brand pillar 2).
 */
const PRO_VOCABULARY: Record<Exclude<Language, 'es'>, RegExp> = {
  en: /interview|assessment|screening|\bSOP\b|\bQRH\b|\bV1\b|raw[- ]data|\bATPL\b|airline[- ]style|airline syllabus/i,
  he: /מיון|מיונ|מבדק|\bSOP\b|\bQRH\b|\bV1\b|\bATPL\b|Raw Data|בסגנון חברת תעופה|בסגנון חברות תעופה|סילבוס חברת תעופה/,
  ru: /отбор|скрининг|собеседован|\bSOP\b|\bQRH\b|\bV1\b|\bATPL\b|сырым данным|в стиле авиакомпании|в стиле авиалиний/i,
  fr: /sélection|entretien|\bSOP\b|\bQRH\b|\bV1\b|\bATPL\b|raw data|style compagnie/i,
  ar: /مقابلة|مقابلات|اختبار قبول|اختبارات|\bSOP\b|\bQRH\b|\bV1\b|\bATPL\b|البيانات الخام|بأسلوب شركات الطيران/,
  de: /interview|auswahl|screening|\bSOP\b|\bQRH\b|\bV1\b|raw[- ]data|\bATPL\b|airline[- ]/i,
};

describe('consumer flight tracks never speak to airline candidates', () => {
  it.each(Object.keys(PRO_VOCABULARY) as Array<keyof typeof PRO_VOCABULARY>)(
    'keeps interview, assessment and cockpit acronyms out of the %s consumer copy',
    (language) => {
      const page = SUBSCRIPTION_PAGE_COPY[language];
      const copy = [
        ...CONSUMER_SUBSCRIPTION_PASSES.flatMap((pass) => stringLeaves(pass.copy[language])),
        ...page.pillars.flatMap((pillar) => [pillar.title, pillar.description]),
        page.filter5,
        page.filter10,
        ...page.stages.flatMap((stage) => [stage.title, stage.description]),
        ...page.comparisonRows.flatMap((row) => [row.feature, row.single, row.sub5, row.sub10]),
        page.heroTitle,
        page.heroSubtitle,
      ];
      expect(copy.filter((text) => PRO_VOCABULARY[language].test(text))).toEqual([]);
    }
  );

  it('names the flagship consumer track the Captains’ Course in every language', () => {
    const flagship = findSubscriptionPass('airline-readiness-10x90')!;
    expect(flagship.copy.en.title).toBe('Captains’ Course · 10 × 90 min');
    expect(flagship.copy.he.title).toBe('קורס הקברניטים · 10 × 90 דקות');
  });

  it.each(Object.keys(PRO_VOCABULARY) as Array<keyof typeof PRO_VOCABULARY>)(
    'keeps the PRO tracks explicitly about airline interview preparation in %s',
    (language) => {
      for (const pass of PRO_SUBSCRIPTION_PASSES) {
        expect(PRO_VOCABULARY[language].test(pass.copy[language].title), `${pass.id} ${language} title`).toBe(true);
      }
    }
  );
});

describe('PRO track scripts', () => {
  it.each(['he', 'ar'] as const)('writes the %s PRO summaries and curriculum in their own script', (language) => {
    const ownScript = language === 'he' ? HEBREW : ARABIC;
    const curriculum = PRO_SUBSCRIPTION_PASSES.flatMap((pass) => [pass.copy[language].summary, ...pass.copy[language].curriculum]);
    expect(curriculum.filter((item) => !ownScript.test(item))).toEqual([]);
  });
});

/**
 * Product decision (2026-11-09): the portal sells the outcome of a track, never its
 * duration. Limited-time phrasing reads as a deadline and a lock-in, so it is banned
 * from the marketing copy. The validity term is a real commercial condition and is
 * disclosed exactly once, in the billing FAQ answer, as reassurance.
 */
const LIMITED_TIME_TERMS: Record<Exclude<Language, 'es'>, RegExp> = {
  en: /\b12[- ]?months?\b|\bannual|\b365\b|\byears?\b|\bvalid(?:ity)?\b|\bexpir|\bunlimited\b/i,
  he: /12 חודש|שנתי|שנה|365|תוקף|פג|ללא הגבלה/,
  ru: /12 месяц|годов|(?:^|\s)года?(?=[\s.,;:!?]|$)|365|срок действ|действует|действителен|истек|безлимит|неограничен/iu,
  fr: /12 mois|annuel|\ban\b|année|365|validit|valable|expir|illimit/i,
  ar: /12 شهر|سنوي|سنة|365|صلاحي|صالح|تنتهي|غير محدود/,
  de: /\b12[- ]?monat|\bjährlich|\bjahr|\b365\b|\bgültig|\bläuft ab|\bunbegrenzt/i,
};

describe('flight track copy never leads with a deadline', () => {
  it.each(Object.keys(LIMITED_TIME_TERMS) as Array<keyof typeof LIMITED_TIME_TERMS>)(
    'mentions the validity only in the %s billing FAQ answer, never as a limited-time hook',
    (language) => {
      const page = SUBSCRIPTION_PAGE_COPY[language];
      const billingFaqAnswer = page.faqs[3].answer;
      const copy = [
        ...stringLeaves(SUBSCRIPTION_SECTION_COPY[language]),
        ...stringLeaves(page),
        ...SUBSCRIPTION_PASSES.flatMap((track) => stringLeaves(track.copy[language])),
      ];
      const offenders = copy.filter((text) => LIMITED_TIME_TERMS[language].test(text));
      expect(offenders).toEqual([billingFaqAnswer]);
      // The one disclosure is reassurance, not a hook: it sits next to the no-renewal promise.
      expect(page.faqs[3].question).toMatch(SUBSCRIPTION_TERMS[language]);
    }
  );

  it('keeps the commercial validity on the data model for Wix, where it belongs', () => {
    for (const track of SUBSCRIPTION_PASSES) expect(track.validityMonths).toBe(12);
  });

  it.each(['he', 'ar'] as const)('writes the %s first-person reasons in their own script', (language) => {
    const ownScript = language === 'he' ? HEBREW : ARABIC;
    const page = SUBSCRIPTION_PAGE_COPY[language];
    const prose = [page.heroTitle, page.heroSubtitle, page.reasonsTitle, ...page.pillars.flatMap((pillar) => [pillar.title, pillar.description])];
    expect(prose.filter((text) => !ownScript.test(text))).toEqual([]);
  });
});
