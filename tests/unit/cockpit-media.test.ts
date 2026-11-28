import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
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

describe('cockpit media provenance and performance-safe contract', () => {
  it('rejects gift-voucher artwork, .gif files, and unapproved third-party origins', () => {
    // Gift-card designs belong to the voucher flow; presenting one as a cockpit or
    // airport visual would repeat the release 1.37.0 regression fixed in #376.
    expect(isApprovedMediaUrl('/gift-cards/moonlight.webp')).toBe(false);
    expect(() => assertApprovedMediaAsset({ posterSrc: '/gift-cards/moonlight.webp' })).toThrow(
      /Unapproved/
    );
    expect(isApprovedMediaUrl('/media/cockpit.gif')).toBe(false);
    expect(isApprovedMediaUrl('/media/cockpit.GIF?v=2')).toBe(false);
    expect(isApprovedMediaUrl('https://static.wixstatic.com/media/clip.gif')).toBe(false);
    expect(isApprovedMediaUrl('https://images.unsplash.com/photo-123.jpg')).toBe(false);
    expect(isApprovedMediaUrl('http://static.wixstatic.com/media/photo.webp')).toBe(false);
    expect(isApprovedMediaUrl('//evil.example/clip.mp4')).toBe(false);
    expect(isApprovedMediaUrl('')).toBe(false);

    expect(() =>
      assertApprovedMediaAsset({ posterSrc: '/gift-cards/moonlight.webp', videoSrc: '/media/demo.gif' })
    ).toThrow(/Unapproved, voucher-artwork, or GIF/);
  });

  it('accepts verified local public paths and HTTPS Wix Media hosts', () => {
    expect(isApprovedMediaUrl('/media/approach-vhhx.mp4')).toBe(true);
    expect(isApprovedMediaUrl('https://static.wixstatic.com/media/49097a_test~mv2.webp')).toBe(true);
    expect(isApprovedMediaUrl('https://video.wixstatic.com/video/49097a_test/1080p/mp4/file.mp4')).toBe(true);
  });

  it('backs every registered media item with an existing public asset, explicit dimensions, and 7-language alt text', () => {
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
