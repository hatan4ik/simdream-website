import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ABOUT_REEL_TEASERS,
  EXPERIENCE_ROUTE_SCENARIOS,
  assertApprovedMediaAsset,
  isApprovedMediaUrl,
} from '@/lib/media/cockpit-media';
import { WORLD_ROUTES } from '@/lib/data/experience-routes';
import type { Language } from '@/lib/i18n/translations';

const ALL_LANGUAGES: readonly Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es', 'de'];

const BLOG_MEDIA_URLS: ReadonlySet<string> = new Set(
  (JSON.parse(readFileSync(join(process.cwd(), 'lib/data/blog-posts.json'), 'utf-8')) as Array<{ coverImage?: string }>)
    .map((p) => p.coverImage)
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
);

describe('cockpit media provenance and performance-safe contract', () => {
  it('rejects .gif files, voucher artwork, and unapproved third-party origins', () => {
    expect(isApprovedMediaUrl('/media/cockpit.gif')).toBe(false);
    expect(isApprovedMediaUrl('/media/cockpit.GIF?v=2')).toBe(false);
    expect(isApprovedMediaUrl('/gift-cards/moonlight.webp')).toBe(false);
    expect(isApprovedMediaUrl('/gift-cards/skyline.webp')).toBe(false);
    expect(isApprovedMediaUrl('https://static.wixstatic.com/media/clip.gif')).toBe(false);
    expect(isApprovedMediaUrl('https://images.unsplash.com/photo-123.jpg')).toBe(false);
    expect(isApprovedMediaUrl('http://static.wixstatic.com/media/photo.webp')).toBe(false);
    expect(isApprovedMediaUrl('//evil.example/clip.mp4')).toBe(false);
    expect(isApprovedMediaUrl('')).toBe(false);

    expect(() =>
      assertApprovedMediaAsset({
        posterSrc: 'https://static.wixstatic.com/media/49097a_e88e8006233746c89766cbfb2e0b3888~mv2.webp',
        videoSrc: '/media/demo.gif',
      })
    ).toThrow(/Unapproved or GIF/);

    expect(() =>
      assertApprovedMediaAsset({ posterSrc: '/gift-cards/moonlight.webp' })
    ).toThrow(/voucher-artwork/);
  });

  it('accepts verified local non-voucher paths and HTTPS Wix Media hosts', () => {
    expect(isApprovedMediaUrl('/media/cockpit-poster.webp')).toBe(true);
    expect(isApprovedMediaUrl('/media/approach-vhhx.mp4')).toBe(true);
    expect(isApprovedMediaUrl('https://static.wixstatic.com/media/49097a_test~mv2.webp')).toBe(true);
    expect(isApprovedMediaUrl('https://video.wixstatic.com/video/49097a_test/1080p/mp4/file.mp4')).toBe(true);
  });

  it('backs every registered media item with a verified asset, explicit dimensions, and 7-language alt text', () => {
    const allMedia = [
      ...ABOUT_REEL_TEASERS,
      ...EXPERIENCE_ROUTE_SCENARIOS.map((s) => s.media),
    ];

    for (const item of allMedia) {
      expect(() => assertApprovedMediaAsset(item)).not.toThrow();
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.scenarioTag.length).toBeGreaterThan(0);

      if (item.posterSrc.startsWith('/')) {
        const diskPath = join(process.cwd(), 'public', item.posterSrc.slice(1));
        expect(existsSync(diskPath), `Missing public asset ${item.posterSrc}`).toBe(true);
      } else {
        expect(
          BLOG_MEDIA_URLS.has(item.posterSrc),
          `External Wix Media URL ${item.posterSrc} must come from verified repository media`
        ).toBe(true);
      }

      for (const lang of ALL_LANGUAGES) {
        expect(item.alt[lang]?.trim().length ?? 0, `Missing ${lang} alt text for ${item.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('maps every experience route visual scenario to a real WORLD_ROUTES airport and factual ICAO/runway tag', () => {
    expect(EXPERIENCE_ROUTE_SCENARIOS.map((s) => s.runwayTag)).toEqual([
      'VHHX • RWY 13',
      'VQPR • RWY 15',
      'LOWI • RWY 08',
    ]);

    for (const scenario of EXPERIENCE_ROUTE_SCENARIOS) {
      const route = WORLD_ROUTES.find((r) => r.id === scenario.routeId);
      expect(route, `Unknown routeId ${scenario.routeId}`).toBeDefined();
      expect(route!.airports[scenario.airportIndex].icao).toBe(scenario.icao);
    }
  });

  it('provides 7-language badges for every About Reel teaser without embedding social iframes', () => {
    expect(ABOUT_REEL_TEASERS).toHaveLength(2);
    for (const teaser of ABOUT_REEL_TEASERS) {
      expect(['Instagram', 'YouTube']).toContain(teaser.channel);
      for (const lang of ALL_LANGUAGES) {
        expect(teaser.badge[lang]?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
