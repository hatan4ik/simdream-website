import { FACILITY_INFO, ROUTE_ORIGIN_PRESETS } from '@/lib/config/facility-info';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { LANGUAGES, type Language } from '@/lib/i18n/translations';
import type { SimulatorPackage } from '@/types';

/**
 * Schema.org JSON-LD builders (AGENTS.md §8).
 *
 * Every fact a search engine or an AI assistant can quote from here is derived from an
 * authoritative registry: prices from `SIMULATOR_PACKAGES`, hours, address, contact and
 * social profiles from `FACILITY_INFO`, languages from `LANGUAGES`. Nothing in this file
 * repeats a price, an hour or a rating by hand, and `tests/unit/seo-integrity.test.ts`
 * compares the emitted graph with those registries.
 */

export const SITE_NAME = 'Sim Dream Israel | Boeing 737 Flight Simulator Tel Aviv';
export const LOCAL_BUSINESS_NAME = 'Sim Dream Israel — Boeing 737 Flight Simulator Center';

/** The city, region and country fields that complete `FACILITY_INFO.address` for schema.org. */
export const POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: FACILITY_INFO.address.streetEn,
  addressLocality: 'Tel Aviv-Yafo',
  addressRegion: 'Tel Aviv District',
  postalCode: FACILITY_INFO.address.postalCode,
  addressCountry: 'IL',
} as const;

const ILS = (amount: number) => `₪${amount.toLocaleString('en-US')}`;

/** `₪450 - ₪4,500`: the cheapest and the most expensive catalogue package. */
export function packagePriceRange(packages: readonly SimulatorPackage[] = SIMULATOR_PACKAGES): string {
  const prices = packages.map((pkg) => pkg.priceIls);
  return `${ILS(Math.min(...prices))} - ${ILS(Math.max(...prices))}`;
}

/**
 * schema.org `Time` has no 24:00. The operating window closes at midnight (`24:00`, 1440 min),
 * which Google's LocalBusiness guidance writes as `23:59` for an end-of-day close; every other
 * closing time is emitted unchanged.
 */
export function schemaClosingTime(close: string): string {
  return close === '24:00' ? '23:59' : close;
}

/** BCP-47 tags for the six interface languages as spoken in Israel (`he-IL`, `en-IL`, …). */
export function siteLanguageTags(): string[] {
  return LANGUAGES.map((language) => `${language.code}-IL`);
}

/** Maps, the alternate domain, WhatsApp and the three social profiles from the facility config. */
export function sameAsProfiles(): string[] {
  return [
    FACILITY_INFO.googleMapsUrl,
    FACILITY_INFO.alternateDomain,
    FACILITY_INFO.contact.whatsappHref,
    FACILITY_INFO.social.instagramUrl,
    FACILITY_INFO.social.facebookUrl,
    FACILITY_INFO.social.youtubeUrl,
  ];
}

export interface OfferSchema {
  '@type': 'Offer';
  name: string;
  description: string;
  price: string;
  priceCurrency: 'ILS';
  availability: 'https://schema.org/InStock';
  url: string;
}

export function packageOffer(pkg: SimulatorPackage, baseUrl: string = FACILITY_INFO.primaryDomain): OfferSchema {
  return {
    '@type': 'Offer',
    name: pkg.title,
    description: pkg.shortDesc,
    price: String(pkg.priceIls),
    priceCurrency: 'ILS',
    availability: 'https://schema.org/InStock',
    url: `${baseUrl}/book?package=${pkg.slug}`,
  };
}

const CONSUMER_CATEGORIES: ReadonlyArray<SimulatorPackage['category']> = ['recreational', 'fear_of_flying'];
const PROFESSIONAL_CATEGORIES: ReadonlyArray<SimulatorPackage['category']> = ['training'];

export const CONSUMER_OFFER_PACKAGES = SIMULATOR_PACKAGES.filter((pkg) => CONSUMER_CATEGORIES.includes(pkg.category));
/** The three PRO tiers (AGENTS.md §2). */
export const PROFESSIONAL_OFFER_PACKAGES = SIMULATOR_PACKAGES.filter((pkg) => PROFESSIONAL_CATEGORIES.includes(pkg.category));

function walkingMinutesFrom(presetId: string): number {
  const preset = ROUTE_ORIGIN_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset?.walkingMinutes) throw new Error(`Route preset ${presetId} has no walking time`);
  return preset.walkingMinutes;
}

/**
 * The site-wide knowledge graph rendered in the root layout: the local business, its
 * offer catalogues and the WebSite node. It deliberately carries no FAQPage: FAQ markup
 * belongs next to a visible FAQ (`buildFaqPageStructuredData`), never on every route.
 */
export function buildSiteStructuredData(baseUrl: string = FACILITY_INFO.primaryDomain) {
  const { requirements, hours } = FACILITY_INFO;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LocalBusiness', 'SportsActivityLocation', 'EntertainmentBusiness', 'TouristAttraction'],
        '@id': `${baseUrl}/#localbusiness`,
        name: LOCAL_BUSINESS_NAME,
        alternateName: [
          'Sim Dream LTD',
          FACILITY_INFO.legalNameEn,
          'סימדרים ישראל - סימולטור טיסה בואינג 737',
          FACILITY_INFO.legalNameHe,
        ],
        legalName: FACILITY_INFO.legalNameEn,
        taxID: FACILITY_INFO.companyRegistrationNumber,
        identifier: FACILITY_INFO.companyRegistrationNumber,
        url: baseUrl,
        sameAs: sameAsProfiles(),
        telephone: FACILITY_INFO.contact.phoneInternational,
        email: FACILITY_INFO.contact.email,
        priceRange: packagePriceRange(),
        currenciesAccepted: 'ILS, USD, EUR',
        paymentAccepted: 'Credit Card, Apple Pay, Google Pay, Bit, Gift Voucher',
        description:
          `Experience flying a 1:1 scale Boeing 737 cockpit in central Tel Aviv (${FACILITY_INFO.address.streetEn}) alongside certified commercial pilot instructors. ` +
          `Suitable for ages ${requirements.minimumAgeYears}+, first-time flyers, families, aviation enthusiasts, unforgettable gifts, and fear-of-flying support.`,
        address: POSTAL_ADDRESS,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: FACILITY_INFO.coordinates.lat,
          longitude: FACILITY_INFO.coordinates.lng,
        },
        hasMap: FACILITY_INFO.googleMapsUrl,
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: hours.daily.open,
            closes: schemaClosingTime(hours.daily.close),
          },
        ],
        amenityFeature: [
          {
            '@type': 'LocationFeatureSpecification',
            name: `Minimum Pilot Age ${requirements.minimumAgeYears}+ (Ages ${requirements.adultSupervisionAgeRange} with Adult Supervision)`,
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: `Free Cockpit Jumpseat Observers (Up to ${requirements.maxJumpseatGuests} Guests)`,
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: `${walkingMinutesFrom('yehudit-lrt')} Minutes Walk from Yehudit Light Rail Station (Red Line)`,
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: `${walkingMinutesFrom('hashalom-train')} Minutes Walk from Tel Aviv HaShalom Train Station`,
            value: true,
          },
        ],
        hasOfferCatalog: [
          {
            '@type': 'OfferCatalog',
            name: 'Boeing 737 Flight Simulator Packages',
            itemListElement: CONSUMER_OFFER_PACKAGES.map((pkg) => packageOffer(pkg, baseUrl)),
          },
          {
            '@type': 'OfferCatalog',
            name: 'Airline Interview & Assessment Preparation (PRO)',
            url: `${baseUrl}/pro`,
            itemListElement: PROFESSIONAL_OFFER_PACKAGES.map((pkg) => packageOffer(pkg, baseUrl)),
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: SITE_NAME,
        inLanguage: siteLanguageTags(),
        publisher: {
          '@id': `${baseUrl}/#localbusiness`,
        },
      },
    ],
  };
}

export interface VisibleFaq {
  question: string;
  answer: string;
}

/**
 * FAQPage markup for one route, built from the very strings that route renders in the
 * visitor's language. Callers pass the same array they map over in JSX, so the markup can
 * never say something the page does not show (Google's structured-data content policy).
 */
export function buildFaqPageStructuredData(input: { url: string; language: Language; faqs: readonly VisibleFaq[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${input.url}#faq`,
    url: input.url,
    inLanguage: input.language,
    mainEntity: input.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** Serialises JSON-LD for a `<script type="application/ld+json">` without an early `</script>` break. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
