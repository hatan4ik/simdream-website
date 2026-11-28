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
    width: 1536,
    height: 1024,
    aspect: 'video',
    scenarioTag: 'SIM DREAM • REELS',
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
      he: 'תמונת תא טייס ומסלול המשמשת כתמונת פתיחה לרילס של Sim Dream באינסטגרם',
      en: 'Cockpit and runway image used as the poster for Sim Dream Instagram Reels',
      ru: 'Изображение кабины и взлётно-посадочной полосы для Reels Sim Dream в Instagram',
      fr: 'Image de cockpit et de piste utilisée comme visuel pour les Reels Instagram de Sim Dream',
      ar: 'صورة لقمرة القيادة والمدرج تُستخدم كملصق لمقاطع Sim Dream على إنستغرام',
      es: 'Imagen de cabina y pista usada como póster para los Reels de Sim Dream en Instagram',
      de: 'Cockpit- und Pistenbild als Vorschau für Sim Dream Reels auf Instagram',
    },
  },
  {
    id: 'about-reel-youtube',
    channel: 'YouTube',
    posterSrc: 'https://static.wixstatic.com/media/49097a_9db77324ea6d4d1dba77adeb1cacbe2e~mv2.webp',
    width: 1536,
    height: 1024,
    aspect: 'video',
    scenarioTag: 'SIM DREAM • VIDEO',
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
      he: 'תמונת תא טייס ומסלול המשמשת כתמונת פתיחה לסרטוני Sim Dream ביוטיוב',
      en: 'Cockpit and runway image used as the poster for Sim Dream YouTube videos',
      ru: 'Изображение кабины и взлётно-посадочной полосы для видео Sim Dream на YouTube',
      fr: 'Image de cockpit et de piste utilisée comme visuel pour les vidéos YouTube de Sim Dream',
      ar: 'صورة لقمرة القيادة والمدرج تُستخدم كملصق لفيديوهات Sim Dream على يوتيوب',
      es: 'Imagen de cabina y pista usada como póster para los vídeos de Sim Dream en YouTube',
      de: 'Cockpit- und Pistenbild als Vorschau für Sim Dream Videos auf YouTube',
    },
  },
];

export interface RouteScenarioVisual {
  readonly id: string;
  readonly routeId: string;
  readonly airportIndex: 0 | 1 | 2;
  readonly icao: string;
  readonly runwayTag: string;
  /** Makes clear that the cockpit image sets briefing context and is not airport photography. */
  readonly illustrativeNote: LocalizedRecord<string>;
  readonly media: ApprovedCockpitMedia;
}

/**
 * Verified SimDream Wix Media stills (sourced from lib/data/blog-posts.json)
 * provide cockpit context for WORLD_ROUTES; they are not airport photography.
 */
const ILLUSTRATIVE_ROUTE_VISUAL_NOTE: LocalizedRecord<string> = {
  he: 'תמונת הקוקפיט היא אילוסטרציה בלבד; קוד המסלול מתאר את משימת הטיסה שנבחרה.',
  en: 'The cockpit image is illustrative; the route code identifies the selected flight mission.',
  ru: 'Изображение кабины носит иллюстративный характер; код маршрута обозначает выбранное задание полёта.',
  fr: 'L’image du cockpit est illustrative ; le code de route identifie la mission de vol sélectionnée.',
  ar: 'صورة قمرة القيادة توضيحية؛ يعرّف رمز المسار مهمة الطيران المختارة.',
  es: 'La imagen de cabina es ilustrativa; el código de ruta identifica la misión de vuelo seleccionada.',
  de: 'Das Cockpitbild ist illustrativ; der Routencode bezeichnet die ausgewählte Flugmission.',
};
export const EXPERIENCE_ROUTE_SCENARIOS: readonly RouteScenarioVisual[] = [
  {
    id: 'scenario-vhhx',
    routeId: 'route-extreme-airports',
    airportIndex: 1,
    icao: 'VHHX',
    runwayTag: 'VHHX • RWY 13',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-vhhx',
      posterSrc: 'https://static.wixstatic.com/media/49097a_5654792b0b7d4701acef68df5cf5f62b~mv2.webp',
      width: 1536,
      height: 1024,
      aspect: 'video',
      scenarioTag: 'VHHX • RWY 13',
      alt: {
        he: 'תמונת תא טייס להמחשת תדריך מסלול VHHX מסלול 13',
        en: 'Illustrative cockpit image for the VHHX Runway 13 route briefing',
        ru: 'Иллюстративное изображение кабины для брифинга по маршруту VHHX ВПП 13',
        fr: 'Image de cockpit illustrative pour le briefing de route VHHX piste 13',
        ar: 'صورة توضيحية لقمرة القيادة لإحاطة مسار VHHX المدرج 13',
        es: 'Imagen ilustrativa de cabina para la sesión informativa de la ruta VHHX pista 13',
        de: 'Illustratives Cockpitbild für die Streckeneinweisung VHHX Piste 13',
      },
    },
  },
  {
    id: 'scenario-vqpr',
    routeId: 'route-extreme-airports',
    airportIndex: 0,
    icao: 'VQPR',
    runwayTag: 'VQPR • RWY 15',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-vqpr',
      posterSrc: 'https://static.wixstatic.com/media/49097a_89df782bcec442a4921ae970d077c0f1~mv2.webp',
      width: 1536,
      height: 1024,
      aspect: 'video',
      scenarioTag: 'VQPR • RWY 15',
      alt: {
        he: 'תמונת תא טייס להמחשת תדריך מסלול VQPR מסלול 15',
        en: 'Illustrative cockpit image for the VQPR Runway 15 route briefing',
        ru: 'Иллюстративное изображение кабины для брифинга по маршруту VQPR ВПП 15',
        fr: 'Image de cockpit illustrative pour le briefing de route VQPR piste 15',
        ar: 'صورة توضيحية لقمرة القيادة لإحاطة مسار VQPR المدرج 15',
        es: 'Imagen ilustrativa de cabina para la sesión informativa de la ruta VQPR pista 15',
        de: 'Illustratives Cockpitbild für die Streckeneinweisung VQPR Piste 15',
      },
    },
  },
  {
    id: 'scenario-lowi',
    routeId: 'route-extreme-airports',
    airportIndex: 2,
    icao: 'LOWI',
    runwayTag: 'LOWI • RWY 08',
    illustrativeNote: ILLUSTRATIVE_ROUTE_VISUAL_NOTE,
    media: {
      id: 'route-visual-lowi',
      posterSrc: 'https://static.wixstatic.com/media/49097a_d2262ee688ff47a09611ce7051f62393~mv2.webp',
      width: 1536,
      height: 1024,
      aspect: 'video',
      scenarioTag: 'LOWI • RWY 08',
      alt: {
        he: 'תמונת תא טייס להמחשת תדריך מסלול LOWI מסלול 08',
        en: 'Illustrative cockpit image for the LOWI Runway 08 route briefing',
        ru: 'Иллюстративное изображение кабины для брифинга маршрута LOWI ВПП 08',
        fr: 'Image illustrative du cockpit pour le briefing de route LOWI piste 08',
        ar: 'صورة توضيحية لقمرة القيادة لإحاطة مسار LOWI المدرج 08',
        es: 'Imagen ilustrativa de cabina para la sesión informativa de la ruta LOWI pista 08',
        de: 'Illustratives Cockpitbild für das Routenbriefing LOWI Piste 08',
      },
    },
  },
];
