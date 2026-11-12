import { describe, expect, it } from 'vitest';
import {
  loadMediaReleaseSectionHe,
  loadPrivacyHe,
  loadRulesCoreHe,
  loadRulesExtraHe,
  mediaReleaseSectionOf,
  memoLoad,
} from '@/lib/legal/loaders';
import {
  loadMediaReleaseSectionIntl,
  loadPrivacyIntl,
  loadRulesCoreIntl,
  loadRulesExtraIntl,
} from '@/lib/legal/loaders-intl';
import type { LegalIntlLanguage } from '@/lib/legal/types';
import { PRIVACY, RULES_CORE, RULES_EXTRA } from './_support/legal-fixtures';

const INTL: readonly LegalIntlLanguage[] = ['en', 'ru', 'fr', 'ar', 'es'];

describe('Hebrew loaders (server-reachable)', () => {
  it('resolve to the Hebrew bodies', async () => {
    expect(await loadRulesCoreHe()).toBe(RULES_CORE.he);
    expect(await loadRulesExtraHe()).toBe(RULES_EXTRA.he);
    expect(await loadPrivacyHe()).toBe(PRIVACY.he);
  });

  it('share one promise per document, so React use() reads a stable thenable', () => {
    expect(loadRulesCoreHe()).toBe(loadRulesCoreHe());
    expect(loadRulesExtraHe()).toBe(loadRulesExtraHe());
    expect(loadPrivacyHe()).toBe(loadPrivacyHe());
  });

  it('return clause 14 from the Hebrew extras', async () => {
    const section = await loadMediaReleaseSectionHe();
    expect(section.id).toBe('media-release');
    expect(section).toBe(RULES_EXTRA.he.sections.find((candidate) => candidate.id === 'media-release'));
  });
});

describe('client-only loaders (English, Russian, French, Arabic, Spanish)', () => {
  it('serve the English original of rules clauses 1 to 12 for every non-Hebrew language', async () => {
    expect(await loadRulesCoreIntl()).toBe(RULES_CORE.en);
    expect(loadRulesCoreIntl()).toBe(loadRulesCoreIntl());
  });

  it.each(INTL)('resolve the rules extras and the privacy policy in %s', async (language) => {
    expect(await loadRulesExtraIntl(language)).toBe(RULES_EXTRA[language]);
    expect(await loadPrivacyIntl(language)).toBe(PRIVACY[language]);
    expect(loadRulesExtraIntl(language)).toBe(loadRulesExtraIntl(language));
    expect(loadPrivacyIntl(language)).toBe(loadPrivacyIntl(language));
  });

  it.each(INTL)('return clause 14 in %s', async (language) => {
    const section = await loadMediaReleaseSectionIntl(language);
    expect(section.id).toBe('media-release');
    expect(section).toBe(RULES_EXTRA[language].sections.find((candidate) => candidate.id === 'media-release'));
  });
});

describe('memoLoad', () => {
  it('forgets a failed load so the next call retries', async () => {
    let attempts = 0;
    const loader = () => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ default: 'ok' });
    };
    await expect(memoLoad('test:retry', loader)).rejects.toThrow('offline');
    await expect(memoLoad('test:retry', loader)).resolves.toBe('ok');
    expect(attempts).toBe(2);
  });
});

describe('mediaReleaseSectionOf', () => {
  it('names the language when the clause is missing', () => {
    expect(() => mediaReleaseSectionOf({ sections: [] }, 'fr')).toThrow('Media release clause missing for language fr');
  });
});
