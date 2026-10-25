import type { Metadata } from 'next';
import { FACILITY_INFO } from '@/lib/config/facility-info';

export type SeoPageKey =
  | 'home'
  | 'book'
  | 'experiences'
  | 'about'
  | 'simulator'
  | 'pro'
  | 'workshops'
  | 'vouchers'
  | 'contact'
  | 'rules'
  | 'privacy';

interface PageSeoDefinition {
  path: string;
  title: string;
  description: string;
  keywords: string[];
}

const BASE_URL = FACILITY_INFO.primaryDomain;

const COMMON_GEO_AND_BUSINESS_META: Record<string, string> = {
  'geo.region': 'IL-TA',
  'geo.placename': 'Tel Aviv-Yafo, Israel',
  'geo.position': `${FACILITY_INFO.coordinates.lat};${FACILITY_INFO.coordinates.lng}`,
  ICBM: `${FACILITY_INFO.coordinates.lat}, ${FACILITY_INFO.coordinates.lng}`,
  'business:contact_data:street_address': FACILITY_INFO.address.streetEn,
  'business:contact_data:locality': 'Tel Aviv-Yafo',
  'business:contact_data:postal_code': '6701772',
  'business:contact_data:country_name': 'Israel',
  'business:contact_data:email': FACILITY_INFO.contact.email,
  'business:contact_data:phone_number': FACILITY_INFO.contact.phoneInternational,
  'business:contact_data:website': BASE_URL,
};

const COMMON_KEYWORDS = [
  'Sim Dream',
  'Sim Dream Israel',
  'simdream.co.il',
  'Boeing 737 MAX flight simulator Tel Aviv',
  'flight simulator Israel',
  'סימולטור טיסה תל אביב',
  'סימולטור בואינג 737',
  'סים דרים תל אביב',
  'גרשון שץ 36 תל אביב',
  'Gershon Shatz 36 Tel Aviv',
  'אטרקציות בתל אביב',
  'מתנה מקורית בתל אביב',
];

export const PAGE_SEO_DEFINITIONS: Record<SeoPageKey, PageSeoDefinition> = {
  home: {
    path: '/',
    title: 'Sim Dream Israel | Boeing 737 Flight Simulator Experience in Tel Aviv (סימולטור טיסה)',
    description:
      'Take the Captain’s seat in a 1:1 scale Boeing 737 cockpit at Gershon Shatz 36, Tel Aviv (near Yehudit Light Rail & HaShalom Train). Guided by commercial pilots for ages 10+, families, aviation lovers, fear-of-flying relief, and corporate CRM workshops. Rated 5.0★ on Google (390+ verified reviews).',
    keywords: [
      ...COMMON_KEYWORDS,
      'things to do in Tel Aviv',
      'Boeing 737 cockpit experience',
      'flight simulator gift voucher Israel',
      'corporate team building Tel Aviv',
    ],
  },
  book: {
    path: '/book',
    title: 'Book Your Flight Simulator Session Online | Sim Dream Tel Aviv (הזמנת טיסה)',
    description:
      'Instant online booking for the Sim Dream Boeing 737 flight simulator in Tel Aviv (Gershon Shatz 36). Choose 20, 30, 60, or 90-minute flights, add iconic world airport bundles, and get instant flight dispatch confirmation.',
    keywords: [
      ...COMMON_KEYWORDS,
      'book flight simulator Tel Aviv',
      'הזמנת סימולטור טיסה',
      'flight simulator prices Israel',
      'Boeing 737 session booking',
    ],
  },
  experiences: {
    path: '/experiences',
    title: 'Flight Simulator Packages, World Airport Bundles & Pricing | Sim Dream Tel Aviv',
    description:
      'Compare Boeing 737 flight simulator packages in Tel Aviv: 20-min Takeoff & Landing (₪250), 30-min Discovery Flight (₪399), 60-min Captain’s Experience (₪649), 90-min Airline Assessment (₪949), Fearless Flying therapy, and 11 global airport bundles.',
    keywords: [
      ...COMMON_KEYWORDS,
      'flight simulator packages Israel',
      'חבילות סימולטור טיסה',
      'fear of flying course Tel Aviv',
      'חרדת טיסה טיפול בסימולטור',
      'pilot assessment preparation Israel',
    ],
  },
  about: {
    path: '/about',
    title: 'Professional Training & Airline Assessment Preparation | Sim Dream Tel Aviv (הדרכה מקצועית לטייסים)',
    description:
      'Professional Boeing 737 MAX flight training for commercial pilots and airline applicants in Tel Aviv (Gershon Shatz 36). Airline Interview Prep 60, 90, and 120 PRO packages covering Raw Data manual flying, V1 Cut, Single-Engine ILS, and QRH procedures.',
    keywords: [
      ...COMMON_KEYWORDS,
      'airline interview prep 60 pro',
      'airline interview prep 90 pro',
      'airline interview prep 120 pro',
      'professional flight training Tel Aviv',
      'הדרכה מקצועית לטייסים',
      'הכנה למבדקי חברות תעופה',
    ],
  },
  simulator: {
    path: '/simulator',
    title: 'PRO Flight Sessions & Airline Assessment Preparation | Sim Dream Tel Aviv (אימון טיסה מקצועי)',
    description:
      'Professional Boeing 737 flight training for commercial pilots and airline cadets in Tel Aviv (Gershon Shatz 36). Airline interview prep, raw data manual flight, V1 engine failures, single-engine ILS, and QRH procedures across 60, 90, and 120 PRO sessions.',
    keywords: [
      ...COMMON_KEYWORDS,
      'Boeing 737 airline interview prep',
      'airline assessment simulator Israel',
      'הכנה למיוני חברות תעופה',
      'אימון טייסים מקצועי סימולטור',
      'raw data manual flying Boeing 737',
    ],
  },
  pro: {
    path: '/pro',
    title: 'Professional Training & Airline Assessment Preparation | Sim Dream Tel Aviv (הדרכה מקצועית לטייסים)',
    description:
      'Professional Boeing 737 MAX flight training for commercial pilots and airline applicants in Tel Aviv (Gershon Shatz 36). Airline Interview Prep 60, 90, and 120 PRO packages covering Raw Data manual flying, V1 Cut, Single-Engine ILS, and QRH procedures.',
    keywords: [
      ...COMMON_KEYWORDS,
      'airline interview prep 60 pro',
      'airline interview prep 90 pro',
      'airline interview prep 120 pro',
      'professional flight training Tel Aviv',
      'הדרכה מקצועית לטייסים',
      'הכנה למבדקי חברות תעופה',
    ],
  },
  workshops: {
    path: '/workshops',
    title: 'Corporate Aviation CRM & Executive Leadership Workshops | Sim Dream Tel Aviv',
    description:
      'High-impact corporate team-building and Crew Resource Management (CRM) executive workshops inside a Boeing 737 cockpit in Tel Aviv. Train decision-making, communication under pressure, and crisis leadership.',
    keywords: [
      ...COMMON_KEYWORDS,
      'corporate workshops Tel Aviv',
      'Crew Resource Management workshop Israel',
      'סדנאות מנהלים בתל אביב',
      'יום גיבוש לעובדים סימולטור טיסה',
      'executive leadership training Israel',
    ],
  },
  vouchers: {
    path: '/vouchers',
    title: 'Flight Simulator Gift Vouchers & Present Packages | Sim Dream Tel Aviv (שובר מתנה)',
    description:
      'Give the unforgettable gift of flying a Boeing 737 in Tel Aviv. Instant digital PDF gift vouchers for birthdays, bar/bat mitzvahs (ages 10+), anniversaries, and aviation enthusiasts.',
    keywords: [
      ...COMMON_KEYWORDS,
      'flight simulator gift card Israel',
      'שובר מתנה סימולטור טיסה',
      'מתנה ליום הולדת תל אביב',
      'מתנה לבר מצווה חווית טיסה',
    ],
  },
  contact: {
    path: '/contact',
    title: 'Location, Arrival Instructions & Opening Hours — Gershon Shatz 36 | Sim Dream Tel Aviv',
    description:
      'Visit Sim Dream at Gershon Shatz St 36, Tel Aviv-Yafo (4 min walk from Yehudit Light Rail, 8 min from HaShalom Train Station). Live opening hours (Sun-Thu 10:00-23:00, Fri 09:00-16:00, Sat 19:00-24:00), parking info, phone 055-507-1307 & email desk@simdream.co.il.',
    keywords: [
      ...COMMON_KEYWORDS,
      'Sim Dream address Tel Aviv',
      'Gershon Shatz 36 parking',
      'Yehudit light rail station to Sim Dream',
      'HaShalom train station to Sim Dream',
      '055-507-1307',
      'desk@simdream.co.il',
    ],
  },
  rules: {
    path: '/rules',
    title: 'Facility Rules, Terms & Conditions (תקנון ותנאי שימוש) | Sim Dream LTD',
    description:
      'Official terms and conditions (תקנון) for Simulation Systems (Israel) Sim Dream LTD (C.N. 516651031) at Gershon Shatz 36, Tel Aviv. Booking age (18+), participant minimum age (10+, ages 10-15 with adult), 5-minute early arrival rule, voucher validity, and cancellation policy.',
    keywords: [
      ...COMMON_KEYWORDS,
      'Sim Dream rules',
      'תקנון סים דרים',
      'תנאי שימוש סימולטור טיסה',
      'Simulation Systems Israel Sim Dream LTD 516651031',
    ],
  },
  privacy: {
    path: '/privacy-policy',
    title: 'Privacy & Cookie Policy (מדיניות פרטיות) | Sim Dream LTD',
    description:
      'Official Privacy Policy and Cookie Disclosure for Simulation Systems (Israel) Sim Dream LTD (C.N. 516651031). Learn how we protect your booking data, PCI-DSS payment security, cookie preferences, and your privacy rights under Israeli law.',
    keywords: [
      ...COMMON_KEYWORDS,
      'Sim Dream privacy policy',
      'מדיניות פרטיות סים דרים',
      'cookie policy simdream.co.il',
    ],
  },
};

export function buildPageMetadata(pageKey: SeoPageKey): Metadata {
  const def = PAGE_SEO_DEFINITIONS[pageKey];
  const canonicalUrl = `${BASE_URL}${def.path === '/' ? '' : def.path}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: def.title,
    description: def.description,
    keywords: def.keywords,
    authors: [{ name: FACILITY_INFO.legalNameEn, url: BASE_URL }],
    creator: FACILITY_INFO.legalNameEn,
    publisher: FACILITY_INFO.legalNameEn,
    category: 'Aviation & Entertainment Simulation',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-IL': canonicalUrl,
        'he-IL': canonicalUrl,
        'ru-IL': canonicalUrl,
        'fr-IL': canonicalUrl,
        'ar-IL': canonicalUrl,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: def.title,
      description: def.description,
      url: canonicalUrl,
      siteName: 'Sim Dream Israel — Boeing 737 Flight Simulator Center',
      locale: 'en_IL',
      alternateLocale: ['he_IL', 'ru_IL', 'fr_FR', 'ar_IL'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: def.title,
      description: def.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: COMMON_GEO_AND_BUSINESS_META,
  };
}

