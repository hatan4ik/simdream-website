import { describe, expect, it } from 'vitest';
import { getPackageFormulaBadge } from '@/lib/scheduler/package-presentation';
import type { Language } from '@/lib/i18n/translations';

const LANGUAGES: Language[] = ['en', 'he', 'ru', 'fr', 'ar', 'es'];

describe('getPackageFormulaBadge', () => {
  it.each(LANGUAGES)('returns a non-empty localized label for %s', (language) => {
    const result = getPackageFormulaBadge(60, 'recreational', language);
    expect(result.text).not.toBe('');
    expect(result.cls).toContain('border-');
  });

  it('keeps training and fear-of-flying copy distinct from consumer duration copy', () => {
    expect(getPackageFormulaBadge(60, 'training', 'en').text).toContain('Checkride');
    expect(getPackageFormulaBadge(60, 'fear_of_flying', 'en').text).toContain('Therapy');
    expect(getPackageFormulaBadge(60, 'recreational', 'en').text).toContain('World Trio');
  });

  it('uses the SimDream cerulean scale rather than an off-brand cyan training badge', () => {
    expect(getPackageFormulaBadge(90, 'training', 'en').cls).toContain('sky-');
    expect(getPackageFormulaBadge(90, 'training', 'en').cls).not.toContain('cyan-');
  });

  it('localizes unsupported durations rather than falling back to English copy', () => {
    const arabic = getPackageFormulaBadge(120, 'recreational', 'ar').text;
    const hebrew = getPackageFormulaBadge(120, 'recreational', 'he').text;
    expect(arabic).toMatch(/[\u0600-\u06FF]/);
    expect(hebrew).toMatch(/[\u0590-\u05FF]/);
  });
});
