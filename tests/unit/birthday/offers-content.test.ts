import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GIFT_CARD_DESIGNS } from '@/lib/catalog/gift-card-designs';
import {
  CONSUMER_SUBSCRIPTION_PASSES,
  PRO_SUBSCRIPTION_PASSES,
  getSubscriptionPassFinancials,
} from '@/lib/data/subscription-passes';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { applyBirthdayDiscount } from '@/lib/discounts/birthday';
import type { SupportedLanguage } from '@/lib/i18n/translations';
import { OFFERS_NAV_LABEL } from '@/lib/offers/nav-label';
import { OFFERS_COPY, fillOffersTemplate, type OffersCopy } from '@/lib/offers/offers-copy';
import {
  getBirthdayExample,
  getConsumerTrackSavingPercent,
  getDaytimePromotion,
  getGiftCardRange,
  getProTrackSavingRange,
} from '@/lib/offers/offers-data';
import { PUBLIC_SITE_ROUTES } from '@/lib/seo/site-routes';
import { PAGE_SEO_DEFINITIONS } from '@/lib/seo/seo-config';
import { REPO_ROOT, sourceFiles } from '../_support/source';

const LANGUAGES: SupportedLanguage[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;
const FORBIDDEN: Record<SupportedLanguage, RegExp[]> = {
  he: [ARABIC],
  ar: [HEBREW],
  en: [HEBREW, ARABIC],
  ru: [HEBREW, ARABIC],
  fr: [HEBREW, ARABIC],
  es: [HEBREW, ARABIC],
};
const EMOJI = /\p{Extended_Pictographic}/u;
const KNOWN_PLACEHOLDERS = new Set([
  'percent',
  'days',
  'lookback',
  'minAge',
  'flight',
  'regular',
  'total',
  'saving',
  'minutes',
  'price',
  'min',
  'max',
  'start',
  'end',
]);

/** Every string in a copy object, with the key path it sits at. */
function flatten(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return [];
}

/** The shape of a copy object: key paths only. */
const shape = (copy: OffersCopy) => flatten(copy).map(([path]) => path).sort();

describe('Offers page copy', () => {
  it('has the same keys, three steps and six terms in all six languages', () => {
    expect(Object.keys(OFFERS_COPY).sort()).toEqual([...LANGUAGES].sort());
    const reference = shape(OFFERS_COPY.en);
    for (const language of LANGUAGES) {
      expect(shape(OFFERS_COPY[language]), language).toEqual(reference);
      expect(OFFERS_COPY[language].steps, language).toHaveLength(3);
      expect(OFFERS_COPY[language].terms, language).toHaveLength(6);
    }
  });

  it('keeps scripts apart, has no emoji and no empty string', () => {
    for (const language of LANGUAGES) {
      for (const [path, value] of flatten(OFFERS_COPY[language])) {
        expect(value.trim(), `${language}.${path}`).not.toBe('');
        expect(EMOJI.test(value), `${language}.${path} has an emoji`).toBe(false);
        for (const forbidden of FORBIDDEN[language]) expect(forbidden.test(value), `${language}.${path}`).toBe(false);
      }
    }
  });

  it('never types a price, a percentage or a day count: every figure is a placeholder', () => {
    for (const language of LANGUAGES) {
      for (const [path, value] of flatten(OFFERS_COPY[language])) {
        expect(value, `${language}.${path}`).not.toMatch(/\d/);
        expect(value, `${language}.${path}`).not.toContain('₪');
      }
    }
  });

  it('uses only placeholders it knows and each language uses the same ones as English', () => {
    const placeholdersOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name);
    for (const [path, englishValue] of flatten(OFFERS_COPY.en)) {
      const expected = placeholdersOf(englishValue).sort();
      for (const name of expected) expect(KNOWN_PLACEHOLDERS.has(name), `${path}: ${name}`).toBe(true);
      for (const language of LANGUAGES) {
        const translated = flatten(OFFERS_COPY[language]).find(([candidate]) => candidate === path)?.[1] ?? '';
        expect(placeholdersOf(translated).sort(), `${language}.${path}`).toEqual(expected);
      }
    }
  });

  it('fills a template and leaves an unknown placeholder visible', () => {
    expect(fillOffersTemplate('{percent}% of {total}', { percent: 15, total: '₪1' })).toBe('15% of ₪1');
    expect(fillOffersTemplate('{nobody}', {})).toBe('{nobody}');
  });
});

describe('Offers navigation label', () => {
  it('exists in all six languages without foreign script', () => {
    for (const language of LANGUAGES) {
      const label = OFFERS_NAV_LABEL[language];
      expect(label.trim(), language).not.toBe('');
      for (const forbidden of FORBIDDEN[language]) expect(forbidden.test(label), language).toBe(false);
    }
  });

  it('is the same wording as the page heading (a link names its destination)', () => {
    for (const language of LANGUAGES) expect(OFFERS_COPY[language].heroTitle, language).toBe(OFFERS_NAV_LABEL[language]);
  });
});

describe('Offers page data comes from the registries', () => {
  it('prices the worked example from the package registry through the engine', () => {
    const example = getBirthdayExample();
    const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === example.packageId)!;
    expect(example.price).toEqual(applyBirthdayDiscount(pkg.priceIls));
    expect(example.durationMinutes).toBe(pkg.durationMinutes);
    expect(pkg.daytimeOnly).toBeFalsy();
  });

  it('reads the Discounted Promotion from the registry flag', () => {
    const promo = getDaytimePromotion();
    const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.daytimeOnly)!;
    expect(promo).toEqual({ id: pkg.id, slug: pkg.slug, durationMinutes: pkg.durationMinutes, priceIls: pkg.priceIls });
  });

  it('derives the track savings from the subscription registry', () => {
    const consumer = CONSUMER_SUBSCRIPTION_PASSES.map((pass) => getSubscriptionPassFinancials(pass).savingsPercent);
    const pro = PRO_SUBSCRIPTION_PASSES.map((pass) => getSubscriptionPassFinancials(pass).savingsPercent);
    expect(getConsumerTrackSavingPercent()).toBe(Math.max(...consumer));
    expect(getProTrackSavingRange()).toEqual({ minPercent: Math.min(...pro), maxPercent: Math.max(...pro) });
  });

  it('derives the gift-card range from the voucher catalogue', () => {
    const amounts = GIFT_CARD_DESIGNS.map((design) => design.amountIls);
    expect(getGiftCardRange()).toEqual({ minIls: Math.min(...amounts), maxIls: Math.max(...amounts) });
  });
});

describe('Offers sources never retype a registry number', () => {
  const files = sourceFiles('components/offers', 'lib/offers', 'lib/discounts/birthday').filter((file) => !file.includes('/copy/'));

  it.each(files.map((file) => [file.replace(REPO_ROOT, ''), file]))('%s has no shekel amount and no percentage literal', (_name, file) => {
    const text = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)) // comments may quote an example
      .join('\n');
    expect(text).not.toMatch(/₪\s?\d/);
    expect(text).not.toMatch(/\b\d+\s?%/);
  });
});

describe('Offers page registration', () => {
  it('is in the public route list and has its own metadata', () => {
    expect(PUBLIC_SITE_ROUTES.map((route) => route.path)).toContain('/offers');
    expect(PAGE_SEO_DEFINITIONS.offers.path).toBe('/offers');
    const others = Object.entries(PAGE_SEO_DEFINITIONS).filter(([key]) => key !== 'offers');
    for (const [key, definition] of others) {
      expect(definition.title, key).not.toBe(PAGE_SEO_DEFINITIONS.offers.title);
      expect(definition.description, key).not.toBe(PAGE_SEO_DEFINITIONS.offers.description);
    }
  });

  it('quotes the birthday percentage and the promotion price from the constants and the registry', () => {
    const promo = getDaytimePromotion();
    expect(PAGE_SEO_DEFINITIONS.offers.description).toContain(`${promo.priceIls.toLocaleString('en-US')}`);
  });
});
