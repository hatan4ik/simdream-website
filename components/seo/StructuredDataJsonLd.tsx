import React from 'react';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

/**
 * FAANG-Grade Schema.org JSON-LD Knowledge Graph for SEO & GEO (Generative Engine Optimization + Local Search)
 * Provides structured entity graphs for Google Local Pack, Rich Results, ChatGPT Search, Gemini, Perplexity & Claude.
 */
export function StructuredDataJsonLd() {
  const baseUrl = FACILITY_INFO.primaryDomain;

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': [
          'LocalBusiness',
          'SportsActivityLocation',
          'EntertainmentBusiness',
          'TouristAttraction',
        ],
        '@id': `${baseUrl}/#localbusiness`,
        name: 'Sim Dream Israel — Boeing 737 Flight Simulator Center',
        alternateName: [
          'Sim Dream LTD',
          'Simulation Systems (Israel) Sim Dream LTD',
          'סימדרים ישראל - סימולטור טיסה בואינג 737',
          'מערכות הדמיה סימולטורים (ישראל) סיםדרים בע״מ',
        ],
        legalName: FACILITY_INFO.legalNameEn,
        taxID: FACILITY_INFO.companyRegistrationNumber,
        identifier: FACILITY_INFO.companyRegistrationNumber,
        url: baseUrl,
        sameAs: [
          FACILITY_INFO.googleMapsUrl,
          FACILITY_INFO.alternateDomain,
          FACILITY_INFO.contact.whatsappHref,
        ],
        telephone: FACILITY_INFO.contact.phoneInternational,
        email: FACILITY_INFO.contact.email,
        priceRange: '₪250 - ₪2,500',
        currenciesAccepted: 'ILS, USD, EUR',
        paymentAccepted: 'Credit Card, Apple Pay, Google Pay, Bit, Gift Voucher',
        description:
          'Experience flying a 1:1 scale Boeing 737 cockpit in central Tel Aviv (Gershon Shatz 36) alongside certified commercial pilot instructors. Suitable for ages 10+, families, aviation enthusiasts, fear-of-flying therapy, and corporate CRM leadership workshops.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: FACILITY_INFO.address.streetEn,
          addressLocality: 'Tel Aviv-Yafo',
          addressRegion: 'Tel Aviv District',
          postalCode: '6701772',
          addressCountry: 'IL',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: FACILITY_INFO.coordinates.lat,
          longitude: FACILITY_INFO.coordinates.lng,
        },
        hasMap: FACILITY_INFO.googleMapsUrl,
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            opens: '10:00',
            closes: '23:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Friday'],
            opens: '09:00',
            closes: '16:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Saturday'],
            opens: '19:00',
            closes: '23:59',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5.0',
          bestRating: '5',
          worstRating: '1',
          ratingCount: '390',
          reviewCount: '390',
        },
        amenityFeature: [
          {
            '@type': 'LocationFeatureSpecification',
            name: 'Minimum Pilot Age 10+ (Ages 10-15 with Adult Supervision)',
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: 'Free Cockpit Jumpseat Observers (Up to 2 Guests)',
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: '4 Minutes Walk from Yehudit Light Rail Station (Red Line)',
            value: true,
          },
          {
            '@type': 'LocationFeatureSpecification',
            name: '8 Minutes Walk from Tel Aviv HaShalom Train Station',
            value: true,
          },
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Boeing 737 Flight Simulator Packages',
          itemListElement: SIMULATOR_PACKAGES.map((pkg) => ({
            '@type': 'Offer',
            name: pkg.title,
            description: pkg.shortDesc,
            price: String(pkg.priceIls),
            priceCurrency: 'ILS',
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/book?package=${pkg.slug}`,
          })),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'Sim Dream Israel | Boeing 737 Flight Simulator Tel Aviv',
        inLanguage: ['en-IL', 'he-IL', 'ru-IL', 'fr-IL', 'ar-IL'],
        publisher: {
          '@id': `${baseUrl}/#localbusiness`,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Where is Sim Dream Boeing 737 Flight Simulator located in Tel Aviv?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim Dream Israel (Simulation Systems Israel Sim Dream LTD, C.N. 516651031) is located at Gershon Shatz St 36, Tel Aviv-Yafo, 6701772 (Montefiore Quarter). It is a 4-minute walk (350m) from Yehudit Light Rail Station (Dankal Red Line) and an 8-10 minute walk (750m) from Tel Aviv HaShalom Israel Railways Station. Paid street parking (Blue & White via Pango/Cello) and private paid parking lots are available nearby.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the minimum age to fly the Boeing 737 simulator at Sim Dream?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The minimum age to fly the simulator is 10 years old (10+). Participants aged 10 to 15 must be accompanied by a parent or adult (18+). Online bookings and payments must be completed by an adult aged 18 or older.',
            },
          },
          {
            '@type': 'Question',
            name: 'What are Sim Dream Tel Aviv’s opening hours and contact details?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim Dream operates Sunday through Thursday from 10:00 to 23:00, Friday from 09:00 to 16:00, and Saturday from 19:00 to 24:00 (by advance reservation). You can reach Flight Dispatch by phone or WhatsApp at 055-507-1307 (+972-55-507-1307) or by email at desk@simdream.co.il.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need prior flying experience, and can family members watch inside the cockpit?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No prior flight experience is required. Every flight session includes a personal pre-flight briefing and 1-on-1 guidance from a commercial pilot instructor in the right seat. Up to 2 family members or friends can sit inside the cockpit observer jumpseats free of charge.',
            },
          },
          {
            '@type': 'Question',
            name: 'How early should I arrive before my scheduled flight session?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Per Sim Dream facility rules (תקנון), participants must arrive 5 minutes before their scheduled session start time. Session duration includes the pre-flight briefing inside the cockpit. Arrivals delayed by more than 10 minutes may result in a shortened flight session without refund for lost time or rescheduling subject to a change fee.',
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
    />
  );
}
