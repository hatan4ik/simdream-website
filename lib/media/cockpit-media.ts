/**
 * Verified SimDream aviation media types and provenance guards.
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

export interface MediaControlLabels {
  readonly playLabel: string;
  readonly pauseLabel: string;
}

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

export interface ReelTeaserMedia extends ApprovedCockpitMedia {
  readonly channel: 'Instagram' | 'YouTube';
  readonly badge: LocalizedRecord<string>;
}

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

export {
  ABOUT_REEL_TEASERS,
  ABOUT_SHOWCASE_MEDIA,
  EXPERIENCE_ROUTE_SCENARIOS,
  FEAR_OF_FLYING_MEDIA,
  HOME_HERO_MEDIA,
  MEDIA_CONTROL_COPY,
} from './cockpit-media-catalog';
