import type { SupportedLanguage } from '@/lib/i18n/translations';

/**
 * The label of the Offers page in the header menu, the drawer and the footer. Kept in its own tiny
 * file so the shared chrome never imports the page copy.
 *
 * "Offers & Benefits" rather than "Discounts" or "Sale": a premium aviation brand sells an experience,
 * and "offers" reads as a privilege where "discount" reads as a clearance. Alternatives and the
 * placement reasoning: docs/modules/birthday-offers.md.
 */
export const OFFERS_NAV_LABEL: Record<SupportedLanguage, string> = {
  en: 'Offers & Benefits',
  he: 'הטבות ומבצעים',
  ru: 'Акции и привилегии',
  fr: 'Offres et avantages',
  ar: 'العروض والمزايا',
  es: 'Ofertas y ventajas',
  de: 'Angebote & Vorteile',
};

export function getOffersNavLabel(language: SupportedLanguage): string {
  return OFFERS_NAV_LABEL[language] || OFFERS_NAV_LABEL.en;
}
