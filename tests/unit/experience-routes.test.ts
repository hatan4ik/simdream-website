import { describe, expect, it } from 'vitest';
import { FLIGHT_ADDONS } from '@/lib/db/seed-data';
import type { Language } from '@/lib/i18n/translations';
import {
  ADVENTURES,
  EXPERIENCE_ROUTES_COPY,
  MINIMUM_ROUTE_REQUEST_MINUTES,
  ROUTE_REGIONS,
  WORLD_ROUTES,
  countRouteAirports,
  findOnRequestWorldRoute,
} from '@/lib/data/experience-routes';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar', 'es'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;
/** AGENTS.md section 5: scripts that must never leak into another language's copy. */
const FORBIDDEN: Record<Language, RegExp[]> = {
  he: [ARABIC],
  ar: [HEBREW],
  en: [HEBREW, ARABIC],
  ru: [HEBREW, ARABIC],
  fr: [HEBREW, ARABIC],
  es: [HEBREW, ARABIC],
};
/** ICAO location indicators are four upper-case letters (ICAO Doc 7910). */
const ICAO = /^[A-Z]{4}$/;
const IATA = /^[A-Z]{3}$/;

function stringLeaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') return [[path, String((value as (n: number) => string)(60))]];
  if (Array.isArray(value)) return value.flatMap((child, index) => stringLeaves(child, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

function copyFor(language: Language): Array<[string, string]> {
  return [
    ...stringLeaves(EXPERIENCE_ROUTES_COPY[language] ?? EXPERIENCE_ROUTES_COPY.en, 'section'),
    ...WORLD_ROUTES.flatMap((route) => stringLeaves(route.copy[language] ?? route.copy.en, route.id)),
    ...ADVENTURES.flatMap((adventure) => stringLeaves(adventure.copy[language] ?? adventure.copy.en, adventure.id)),
  ];
}

const TRIO_ADDON_IDS = FLIGHT_ADDONS.filter((addon) => /\bTrio\b/.test(addon.name)).map((addon) => addon.id);

describe('experience routes catalog: World Trios', () => {
  it('lists every World Trio sold as a booking add-on exactly once, with the catalog as price authority', () => {
    const listed = WORLD_ROUTES.filter((route) => route.addonId).map((route) => route.addonId);
    expect([...listed].sort()).toEqual([...TRIO_ADDON_IDS].sort());
    expect(TRIO_ADDON_IDS.length).toBeGreaterThanOrEqual(8);
    for (const route of WORLD_ROUTES) {
      if (!route.addonId) continue;
      const addon = FLIGHT_ADDONS.find((entry) => entry.id === route.addonId);
      expect(addon, route.id).toBeDefined();
      // The section displays the add-on price and minutes; the route never carries its own.
      expect(route).not.toHaveProperty('priceIls');
      expect(route).not.toHaveProperty('durationMinutes');
    }
  });

  it('proposes additional on-request routes beyond the bookable add-ons', () => {
    const onRequest = WORLD_ROUTES.filter((route) => !route.addonId);
    expect(onRequest.length).toBeGreaterThanOrEqual(6);
    expect(onRequest.some((route) => route.region === 'israel')).toBe(true);
  });

  it('flies exactly three real airports per trio, each airport curated once across the catalog', () => {
    const seen = new Map<string, string>();
    for (const route of WORLD_ROUTES) {
      expect(route.airports, route.id).toHaveLength(3);
      for (const airport of route.airports) {
        expect(airport.icao, `${route.id} ICAO`).toMatch(ICAO);
        expect(airport.iata, `${route.id} IATA`).toMatch(IATA);
        expect(seen.get(airport.icao), `${airport.icao} appears in ${seen.get(airport.icao)} and ${route.id}`).toBeUndefined();
        seen.set(airport.icao, route.id);
      }
    }
    expect(countRouteAirports()).toBe(WORLD_ROUTES.length * 3);
  });

  it('matches the airports named in the bookable add-on titles', () => {
    for (const route of WORLD_ROUTES) {
      if (!route.addonId) continue;
      const addon = FLIGHT_ADDONS.find((entry) => entry.id === route.addonId)!;
      for (const airport of route.airports) {
        expect(addon.name, `${route.id} ${airport.icao}`).toContain(`(${airport.icao})`);
      }
    }
  });

  it('uses unique ids, known regions and a 1–5 captain rating', () => {
    const ids = [...WORLD_ROUTES, ...ADVENTURES].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const route of WORLD_ROUTES) {
      expect(ROUTE_REGIONS).toContain(route.region);
      expect(route.difficulty).toBeGreaterThanOrEqual(1);
      expect(route.difficulty).toBeLessThanOrEqual(5);
    }
    // Every region filter shows at least one route.
    for (const region of ROUTE_REGIONS) {
      expect(WORLD_ROUTES.some((route) => route.region === region), region).toBe(true);
    }
  });

  it('keeps adventures tied to a session length the catalog sells', () => {
    expect(ADVENTURES.length).toBeGreaterThanOrEqual(5);
    for (const adventure of ADVENTURES) {
      expect([45, 60, 90]).toContain(adventure.minimumSessionMinutes);
    }
  });
});

describe('experience routes catalog: five-language discipline (AGENTS.md section 5)', () => {
  it.each(CODES)('provides complete copy in %s with three airport descriptions per trio', (code) => {
    for (const route of WORLD_ROUTES) {
      const copy = route.copy[code] ?? route.copy.en;
      expect(copy, `${route.id} ${code}`).toBeDefined();
      expect(copy.airports).toHaveLength(3);
      expect(copy.bestFor.length).toBeGreaterThanOrEqual(2);
      expect(copy.pilotNote.length).toBeGreaterThan(40);
    }
    for (const adventure of ADVENTURES) {
      expect(adventure.copy[code] ?? adventure.copy.en, `${adventure.id} ${code}`).toBeDefined();
    }
    const leaves = copyFor(code);
    expect(leaves.length).toBeGreaterThan(200);
    expect(leaves.filter(([, text]) => text.trim() === '').map(([path]) => path)).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'en'))('gives %s the same copy key tree as English', (code) => {
    const shape = (language: Language) => copyFor(language).map(([path]) => path);
    expect(shape(code)).toEqual(shape('en'));
  });

  it.each(CODES)('keeps foreign scripts out of %s copy', (code) => {
    const leaks = copyFor(code).filter(([, text]) => FORBIDDEN[code].some((pattern) => pattern.test(text)));
    expect(leaks).toEqual([]);
  });

  it.each(['he', 'ar'] as const)('writes %s copy in its own script, not in English', (code) => {
    const own = code === 'he' ? HEBREW : ARABIC;
    const prose = copyFor(code).filter(([path]) => /pilotNote|tagline|subtitle|description/.test(path));
    expect(prose.length).toBeGreaterThan(20);
    expect(prose.filter(([, text]) => !own.test(text))).toEqual([]);
  });

  it('formats the dynamic labels with the minutes they are given', () => {
    for (const code of CODES) {
      const copy = EXPERIENCE_ROUTES_COPY[code] ?? EXPERIENCE_ROUTES_COPY.en;
      expect(copy.extraMinutes(40)).toContain('40');
      expect(copy.fromSession(90)).toContain('90');
    }
  });

  it.each(CODES)('supplies a complete route-request booking handoff in %s', (code) => {
    const copy = EXPERIENCE_ROUTES_COPY[code] ?? EXPERIENCE_ROUTES_COPY.en;
    expect(copy.routeRequestEyebrow.trim()).not.toHaveLength(0);
    expect(copy.routeRequestDescription.trim()).not.toHaveLength(0);
    expect(copy.routeRequestSaved.trim()).not.toHaveLength(0);
    expect(copy.routeRequestConfirmation.trim()).not.toHaveLength(0);
  });

  it('resolves only non-priced World Trios as captain-confirmed requests', () => {
    const requestable = WORLD_ROUTES.filter((route) => !route.addonId);
    expect(MINIMUM_ROUTE_REQUEST_MINUTES).toBe(60);
    expect(requestable).not.toHaveLength(0);
    for (const route of requestable) {
      expect(findOnRequestWorldRoute(route.id)).toBe(route);
    }
    for (const route of WORLD_ROUTES.filter((route) => route.addonId)) {
      expect(findOnRequestWorldRoute(route.id)).toBeUndefined();
    }
  });
});
