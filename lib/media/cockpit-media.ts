/**
 * Verified SimDream aviation media catalog and provenance guards.
 *
 * Enforces AGENTS.md §2 (Marketing Art Direction Rule) and the performance-safe
 * multimedia policy:
 * - No `.gif` files anywhere.
 * - Never substitutes `/gift-cards/` voucher artwork for cockpit or airport photography.
 * - Only verified local `/...` assets from `public/` or approved HTTPS Wix Media URLs.
 * - Explicit pixel dimensions to prevent CLS.
 * - Factual, localized scenario metadata (never disguised as live telemetry).
 */
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';

export type MediaAspect = 'video' | 'portrait' | 'vertical';

export interface ApprovedCockpitMedia {
  readonly id: string;
  readonly posterSrc: string;
  readonly width: number;
  readonly height: number;
  readonly aspect: MediaAspect;
  /** Optional rights-cleared H.264 MP4 clip (must pass assertApprovedMediaUrl). */
  readonly videoSrc?: string;
  /** Optional WebM alternative only when proven to save mobile bytes. */
  readonly webmSrc?: string;
  /** Factual ICAO / aircraft / runway identifier (always rendered dir="ltr" tabular-nums). */
  readonly scenarioTag: string;
  readonly alt: LocalizedRecord<string>;
  readonly caption?: LocalizedRecord<string>;
}

const APPROVED_WIX_MEDIA_HOSTS = new Set([
  'static.wixstatic.com',
  'video.wixstatic.com',
]);

const GIF_PATTERN = /\.gif(?:[?#].*)?$/i;
const GIFT_CARD_ARTWORK_PATTERN = /^\/gift-cards\//i;

/**
 * Returns true iff the URL is a non-GIF, non-voucher-artwork local public asset
 * or an approved HTTPS Wix Media asset.
 */
export function isApprovedMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || GIF_PATTERN.test(trimmed) || GIFT_CARD_ARTWORK_PATTERN.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && APPROVED_WIX_MEDIA_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/** Validates an approved media asset at runtime/test time; throws on GIF, voucher art, or unapproved origin. */
export function assertApprovedMediaAsset(
  media: Pick<ApprovedCockpitMedia, 'posterSrc' | 'videoSrc' | 'webmSrc'>
): void {
  if (!isApprovedMediaUrl(media.posterSrc)) {
    throw new Error(`Unapproved, voucher-artwork, or GIF poster media URL: ${media.posterSrc}`);
  }
  if (media.videoSrc !== undefined && !isApprovedMediaUrl(media.videoSrc)) {
    throw new Error(`Unapproved or GIF video media URL: ${media.videoSrc}`);
  }
  if (media.webmSrc !== undefined && !isApprovedMediaUrl(media.webmSrc)) {
    throw new Error(`Unapproved or GIF webm media URL: ${media.webmSrc}`);
  }
}

export function pickLocalizedMediaText(record: LocalizedRecord<string>, language: Language): string {
  return record[language] || record.en;
}

export interface ReelTeaserMedia extends ApprovedCockpitMedia {
  readonly channel: 'Instagram' | 'YouTube';
  readonly badge: LocalizedRecord<string>;
}

/**
 * Verified SimDream Wix Media aviation stills (sourced from lib/data/blog-posts.json)
 * used as consent-safe external Reel poster teasers on `/about`.
 */
export const ABOUT_REEL_TEASERS: readonly ReelTeaserMedia[] = [
  {
    id: 'about-reel-instagram',
    channel: 'Instagram',
    posterSrc: 'https://static.wixstatic.com/media/49097a_e88e8006233746c89766cbfb2e0b3888~mv2.webp',
    width: 1280,
    height: 720,
    aspect: 'video',
    scenarioTag: 'LLBG • RWY 26 · REELS',
    badge: {
      he: 'רילס מתא הטייס באינסטגרם',
      en: 'Cockpit Reels on Instagram',
      ru: 'Ролики из кабины в Instagram',
      fr: 'Reels cockpit sur Instagram',
      ar: 'مقاطع القمرة على إنستغرام',
      es: 'Reels de cabina en Instagram',
      de: 'Cockpit-Reels auf Instagram',
    },
    alt: {
      he: 'רגע המראה ונחיתה מתוך תא הטייס של Sim Dream באינסטגרם',
      en: 'Sim Dream cockpit takeoff and approach moments on Instagram Reels',
      ru: 'Моменты взлёта и посадки из кабины Sim Dream в Instagram Reels',
      fr: 'Moments de décollage et d’approche en cockpit Sim Dream sur Instagram Reels',
      ar: 'لحظات الإقلاع والهبوط من قمرة Sim Dream على إنستغرام ريلز',
      es: 'Momentos de despegue y aproximación en cabina Sim Dream en Instagram Reels',
      de: 'Sim Dream Cockpit-Start- und Anflugmomente auf Instagram Reels',
    },
  },
  {
    id: 'about-reel-youtube',
    channel: 'YouTube',
    posterSrc: 'https://static.wixstatic.com/media/49097a_9db77324ea6d4d1dba77adeb1cacbe2e~mv2.webp',
    width: 1280,
    height: 720,
    aspect: 'video',
    scenarioTag: 'VHHX • RWY 13 · SHORTS',
    badge: {
      he: 'גישות נחיתה ביוטיוב',
      en: 'Approach Clips on YouTube',
      ru: 'Заходы на посадку на YouTube',
      fr: 'Approches filmées sur YouTube',
      ar: 'مقاطع مقاربات الهبوط على يوتيوب',
      es: 'Clips de aproximación en YouTube',
      de: 'Anflug-Clips auf YouTube',
    },
    alt: {
      he: 'סרטוני גישות נחיתה מאתגרות מתא הטייס ביוטיוב של Sim Dream',
      en: 'Challenging cockpit approach videos on the official Sim Dream YouTube channel',
      ru: 'Видео сложных заходов из кабины на официальном канале Sim Dream в YouTube',
      fr: 'Vidéos d’approches exigeantes en cockpit sur la chaîne YouTube Sim Dream',
      ar: 'فيديوهات مقاربات هبوط متقدمة من القمرة على قناة Sim Dream في يوتيوب',
      es: 'Videos de aproximaciones desafiantes en cabina en el canal oficial de YouTube de Sim Dream',
      de: 'Anspruchsvolle Cockpit-Anflugvideos auf dem offiziellen Sim Dream YouTube-Kanal',
    },
  },
];

export interface RouteScenarioVisual {
  readonly id: string;
  readonly routeId: string;
  readonly airportIndex: 0 | 1 | 2;
  readonly icao: string;
  readonly runwayTag: string;
  readonly media: ApprovedCockpitMedia;
}

/**
 * Verified SimDream Wix Media approach photos (sourced from lib/data/blog-posts.json)
 * paired with iconic WORLD_ROUTES entries on `/experiences#world-routes`.
 */
export const EXPERIENCE_ROUTE_SCENARIOS: readonly RouteScenarioVisual[] = [
  {
    id: 'scenario-vhhx',
    routeId: 'route-extreme-airports',
    airportIndex: 1,
    icao: 'VHHX',
    runwayTag: 'VHHX • RWY 13',
    media: {
      id: 'route-visual-vhhx',
      posterSrc: 'https://static.wixstatic.com/media/49097a_5654792b0b7d4701acef68df5cf5f62b~mv2.webp',
      width: 1280,
      height: 720,
      aspect: 'video',
      scenarioTag: 'VHHX • RWY 13',
      alt: {
        he: 'גישת קאי טאק הונג קונג VHHX מסלול 13 בתא טייס בואינג 737 MAX',
        en: 'Hong Kong Kai Tak VHHX Runway 13 approach in the Boeing 737 MAX cockpit',
        ru: 'Заход в Гонконг Кай-Так VHHX ВПП 13 в кабине Boeing 737 MAX',
        fr: 'Approche Hong Kong Kai Tak VHHX piste 13 en cockpit Boeing 737 MAX',
        ar: 'مقاربة هونغ كونغ كاي تاك VHHX المدرج 13 في قمرة بوينغ 737 MAX',
        es: 'Aproximación a Hong Kong Kai Tak VHHX pista 13 en cabina Boeing 737 MAX',
        de: 'Anflug Hongkong Kai Tak VHHX Piste 13 im Boeing 737 MAX Cockpit',
      },
    },
  },
  {
    id: 'scenario-vqpr',
    routeId: 'route-extreme-airports',
    airportIndex: 0,
    icao: 'VQPR',
    runwayTag: 'VQPR • RWY 15',
    media: {
      id: 'route-visual-vqpr',
      posterSrc: 'https://static.wixstatic.com/media/49097a_89df782bcec442a4921ae970d077c0f1~mv2.webp',
      width: 1280,
      height: 720,
      aspect: 'video',
      scenarioTag: 'VQPR • RWY 15',
      alt: {
        he: 'גישת עמק פארו בהוטן VQPR מסלול 15 בין רכסי ההימלאיה',
        en: 'Paro Bhutan VQPR Runway 15 Himalayan valley approach',
        ru: 'Горный заход в Паро Бутан VQPR ВПП 15 в Гималаях',
        fr: 'Approche de la vallée himalayenne de Paro Bhoutan VQPR piste 15',
        ar: 'مقاربة وادي بارو بوتان VQPR المدرج 15 بين جبال الهيمالايا',
        es: 'Aproximación al valle de Paro Bután VQPR pista 15 en el Himalaya',
        de: 'Himalaya-Talanflug Paro Bhutan VQPR Piste 15',
      },
    },
  },
  {
    id: 'scenario-lowi',
    routeId: 'route-extreme-airports',
    airportIndex: 2,
    icao: 'LOWI',
    runwayTag: 'LOWI • RWY 08',
    media: {
      id: 'route-visual-lowi',
      posterSrc: 'https://static.wixstatic.com/media/49097a_d2262ee688ff47a09611ce7051f62393~mv2.webp',
      width: 1280,
      height: 720,
      aspect: 'video',
      scenarioTag: 'LOWI • RWY 08',
      alt: {
        he: 'גישת עמק אלפיני לאינסברוק LOWI מסלול 08 בסימולטור בואינג 737',
        en: 'Innsbruck Alpine valley approach LOWI Runway 08 in the Boeing 737 simulator',
        ru: 'Альпийский заход в Инсбрук LOWI ВПП 08 на тренажёре Boeing 737',
        fr: 'Approche alpine d’Innsbruck LOWI piste 08 en simulateur Boeing 737',
        ar: 'مقاربة وادي جبال الألب في إنسبروك LOWI المدرج 08 في محاكي بوينغ 737',
        es: 'Aproximación alpina a Innsbruck LOWI pista 08 en el simulador Boeing 737',
        de: 'Alpen-Talanflug Innsbruck LOWI Piste 08 im Boeing 737 Simulator',
      },
    },
  },
];
