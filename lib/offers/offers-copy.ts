import type { SupportedLanguage } from '@/lib/i18n/translations';
import { OFFERS_COPY_AR } from './copy/ar';
import { OFFERS_COPY_DE } from './copy/de';
import { OFFERS_COPY_EN } from './copy/en';
import { OFFERS_COPY_ES } from './copy/es';
import { OFFERS_COPY_FR } from './copy/fr';
import { OFFERS_COPY_HE } from './copy/he';
import { OFFERS_COPY_RU } from './copy/ru';
import type { OffersCopy } from './copy/types';

export type { OffersCopy, OffersStep } from './copy/types';

/** The /offers page copy in all six languages; resolve with `OFFERS_COPY[language] || OFFERS_COPY.en`. */
export const OFFERS_COPY: Record<SupportedLanguage, OffersCopy> = {
  he: OFFERS_COPY_HE,
  en: OFFERS_COPY_EN,
  ru: OFFERS_COPY_RU,
  fr: OFFERS_COPY_FR,
  ar: OFFERS_COPY_AR,
  es: OFFERS_COPY_ES,
  de: OFFERS_COPY_DE,
};

/** Fills `{name}` placeholders; an unknown placeholder stays visible so a missing value is noticed. */
export function fillOffersTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
