import { describe, expect, it } from 'vitest';
import { GROUND_SCHOOL_COPY, GROUND_SCHOOL_TUITION_ILS, groundSchoolCopy } from '@/lib/data/ground-school';
import { LANGUAGES } from '@/lib/i18n/translations';

describe('Ground School public registry', () => {
  it('keeps the published total tuition as an integer ILS amount', () => {
    expect(GROUND_SCHOOL_TUITION_ILS).toBe(3_806);
    expect(Number.isInteger(GROUND_SCHOOL_TUITION_ILS)).toBe(true);
  });

  it.each(LANGUAGES)('provides the full enrollment journey in $nativeName', ({ code: language }) => {
    const copy = groundSchoolCopy(language);

    expect(copy).toBe(GROUND_SCHOOL_COPY[language]);
    expect(copy.heroTitle.length).toBeGreaterThan(20);
    expect(copy.modules).toHaveLength(4);
    expect(copy.advantages).toHaveLength(4);
    expect(Object.keys(copy.pathwayOptions)).toEqual(['faa', 'easa', 'exploring']);
    expect(Object.keys(copy.modalityOptions)).toEqual(['online', 'in_person', 'hybrid']);
    expect(copy.disclosure).toMatch(/not|אינם|не|n’est|ليست|no|keine/i);
  });
});
