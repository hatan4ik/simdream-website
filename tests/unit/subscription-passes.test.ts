import { describe, expect, it } from 'vitest';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import type { Language } from '@/lib/i18n/translations';
import {
  findSubscriptionPass,
  getSubscriptionPassFinancials,
  getSubscriptionPassTrainingAddons,
  SUBSCRIPTION_PASSES,
  SUBSCRIPTION_SECTION_COPY,
} from '@/lib/data/subscription-passes';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar'];
const HEBREW = /[\u0590-\u05FF]/;
const ARABIC = /[\u0600-\u06FF]/;
const FORBIDDEN: Record<Language, RegExp[]> = {
  he: [ARABIC],
  ar: [HEBREW],
  en: [HEBREW, ARABIC],
  ru: [HEBREW, ARABIC],
  fr: [HEBREW, ARABIC],
};

function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringLeaves);
  return [];
}

describe('prepaid flight-pass catalogue', () => {
  it('ships exactly the four approved pass shapes', () => {
    expect(SUBSCRIPTION_PASSES.map((pass) => pass.id)).toEqual([
      'flight-foundations-5x60',
      'advanced-captain-5x90',
      'atpl-concepts-10x60',
      'airline-readiness-10x90',
    ]);
    expect(SUBSCRIPTION_PASSES.map((pass) => [pass.sessions, pass.sessionMinutes])).toEqual([
      [5, 60],
      [5, 90],
      [10, 60],
      [10, 90],
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
    for (const pass of SUBSCRIPTION_PASSES) {
      expect(pass).not.toHaveProperty('standardValueIls');
      expect(pass).not.toHaveProperty('trainingAddonPriceIls');
      expect(pass).not.toHaveProperty('trainingAddonMinutes');
      expect(pass.trainingAddonIds.length, pass.id).toBeGreaterThan(0);
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

describe('prepaid flight-pass five-language discipline', () => {
  it.each(CODES)('provides complete, non-empty copy in %s', (language) => {
    const section = SUBSCRIPTION_SECTION_COPY[language];
    expect(stringLeaves(section).filter((text) => text.trim() === '')).toEqual([]);
    for (const pass of SUBSCRIPTION_PASSES) {
      const copy = pass.copy[language];
      expect(copy.title.trim(), `${pass.id} title`).not.toHaveLength(0);
      expect(copy.summary.trim(), `${pass.id} summary`).not.toHaveLength(0);
      expect(copy.curriculum, `${pass.id} curriculum`).toHaveLength(5);
      expect(copy.curriculum.filter((item) => item.trim() === '')).toEqual([]);
    }
  });

  it.each(CODES)('keeps foreign scripts out of %s pass copy', (language) => {
    const copy = [
      ...stringLeaves(SUBSCRIPTION_SECTION_COPY[language]),
      ...SUBSCRIPTION_PASSES.flatMap((pass) => stringLeaves(pass.copy[language])),
    ];
    expect(copy.filter((text) => FORBIDDEN[language].some((pattern) => pattern.test(text)))).toEqual([]);
  });

  it.each(['he', 'ar'] as const)('uses its own script for %s curriculum prose', (language) => {
    const ownScript = language === 'he' ? HEBREW : ARABIC;
    const curriculum = SUBSCRIPTION_PASSES.flatMap((pass) => pass.copy[language].curriculum);
    expect(curriculum.filter((item) => !ownScript.test(item))).toEqual([]);
  });
});
