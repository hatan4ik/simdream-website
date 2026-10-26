import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { Booking } from '@/types';
import { DEMO_VOUCHERS, FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { getDayOperatingConfig, getKantorovichPricing, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import { overlaps, reservedInterval } from './_support/scheduler';
import { readConstLiteral } from './_support/source';

const STOREFRONT = 'components/scheduler/AmazonFlightStorefront.tsx';
const ALLOWED_DURATIONS = [20, 45, 60, 90, 120, 240];

interface QuickCombo {
  id: string;
  title: string;
  subtitle: string;
  addonIds: string[];
}

function readQuickCombos(): QuickCombo[] {
  const raw = readConstLiteral(STOREFRONT, 'QUICK_COMBOS');
  if (!Array.isArray(raw)) throw new Error('QUICK_COMBOS is not an array literal');
  return raw.map((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('combo is not an object');
    const { id, title, subtitle, addonIds } = entry;
    if (typeof id !== 'string' || typeof title !== 'string' || typeof subtitle !== 'string' || !Array.isArray(addonIds)) {
      throw new Error(`combo ${String(id)} has an unexpected shape`);
    }
    return { id, title, subtitle, addonIds: addonIds.map(String) };
  });
}

/** How marketing copy may name each airport the catalog sells, keyed by ICAO code. */
const AIRPORT_NAMES: Record<string, string[]> = {
  VQPR: ['Paro'],
  VHHX: ['Kai Tak', 'Hong Kong'],
  LOWI: ['Innsbruck'],
  EGLL: ['Heathrow'],
  LFPG: ['CDG', 'Charles de Gaulle'],
  EHAM: ['Schiphol', 'Amsterdam'],
  LGKR: ['Corfu'],
  LGSK: ['Skiathos'],
  LFMN: ['Nice'],
  KLGA: ['LaGuardia', 'New York'],
  KDCA: ['Washington'],
  KSFO: ['San Francisco'],
  EGLC: ['London City'],
  RJTT: ['Haneda', 'Tokyo'],
  KLAS: ['Las Vegas'],
  NZQN: ['Queenstown'],
  LSGG: ['Geneva'],
  LOWS: ['Salzburg'],
  TNCM: ['St. Maarten', 'Maho'],
  SBRJ: ['Rio', 'Santos Dumont'],
  VRMM: ['Maldives', 'Malé'],
  OMDB: ['Dubai'],
  LXGB: ['Gibraltar'],
  LCLK: ['Larnaca'],
};

const icaoCodes = (text: string) => [...text.matchAll(/\(([A-Z]{4})\)/g)].map((match) => match[1]);
const mentions = (copy: string, icao: string) =>
  (AIRPORT_NAMES[icao] ?? []).some((name) => new RegExp(`\\b${name.replace('.', '\\.')}\\b`, 'i').test(copy));
const addonById = (id: string) => FLIGHT_ADDONS.find((addon) => addon.id === id);

describe('package catalog', () => {
  it('uses unique package ids and slugs', () => {
    expect(new Set(SIMULATOR_PACKAGES.map((pkg) => pkg.id)).size).toBe(SIMULATOR_PACKAGES.length);
    expect(new Set(SIMULATOR_PACKAGES.map((pkg) => pkg.slug)).size).toBe(SIMULATOR_PACKAGES.length);
  });

  it('uses only durations the scheduler supports', () => {
    expect(SIMULATOR_PACKAGES.filter((pkg) => !ALLOWED_DURATIONS.includes(pkg.durationMinutes)).map((pkg) => pkg.id)).toEqual([]);
  });

  it('lists exactly the three official PRO tiers at ₪890, ₪1,250 and ₪1,590', () => {
    const training = SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'training').map(
      ({ title, durationMinutes, priceIls }) => ({ title, durationMinutes, priceIls })
    );
    expect(training).toEqual([
      { title: 'Airline Interview Prep 60 PRO', durationMinutes: 60, priceIls: 890 },
      { title: 'Airline Interview Prep 90 PRO', durationMinutes: 90, priceIls: 1250 },
      { title: 'Airline Interview Prep 120 PRO', durationMinutes: 120, priceIls: 1590 },
    ]);
  });

  it('offers the full consumer ladder of 20, 45, 60 and 90 minutes', () => {
    expect(
      SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'recreational').map((pkg) => pkg.durationMinutes)
    ).toEqual([20, 45, 60, 90]);
  });

  it('marks only the 45-minute promo as daytime-only', () => {
    expect(SIMULATOR_PACKAGES.filter((pkg) => pkg.daytimeOnly).map((pkg) => pkg.id)).toEqual(['pkg-promo-45']);
  });

  it('prices each consumer package at the engine tariff for its duration, including the 90-minute prime-time rate', () => {
    const consumer = SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'recreational');
    const day = timeToMinutes('10:00');
    const prime = timeToMinutes('19:15');
    expect(
      consumer.map((pkg) => [pkg.id, pkg.priceIls, pkg.primeTimePriceIls ?? pkg.priceIls])
    ).toEqual(
      consumer.map((pkg) => [
        pkg.id,
        getKantorovichPricing(pkg.durationMinutes, day, false).dynamicPriceIls,
        pkg.daytimeOnly ? pkg.priceIls : getKantorovichPricing(pkg.durationMinutes, prime, false).dynamicPriceIls,
      ])
    );
  });

  it('keeps a single Fear of Flying course and a single corporate workshop', () => {
    expect(SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'fear_of_flying').map((pkg) => pkg.id)).toEqual([
      'pkg-fear-of-flying-90',
    ]);
    expect(SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'corporate').map((pkg) => [pkg.id, pkg.durationMinutes])).toEqual([
      ['pkg-corporate-crm', 240],
    ]);
  });
});

describe('add-on catalog', () => {
  it('uses unique add-on ids', () => {
    expect(new Set(FLIGHT_ADDONS.map((addon) => addon.id)).size).toBe(FLIGHT_ADDONS.length);
  });

  it('gives every add-on a positive price and a whole, non-negative number of minutes', () => {
    expect(
      FLIGHT_ADDONS.filter((addon) => !(addon.priceIls > 0) || !Number.isInteger(addon.durationMinutes) || addon.durationMinutes < 0)
    ).toEqual([]);
  });

  it('names three airports with ICAO codes in every trio', () => {
    const trios = FLIGHT_ADDONS.filter((addon) => /Trio/.test(addon.name));
    expect(trios.length).toBeGreaterThanOrEqual(8);
    expect(trios.filter((addon) => icaoCodes(addon.name).length !== 3).map((addon) => addon.id)).toEqual([]);
  });

  it('knows a marketing name for every catalog airport, and that name appears in its add-on', () => {
    const unnamed = FLIGHT_ADDONS.flatMap((addon) =>
      icaoCodes(addon.name)
        .filter((icao) => !mentions(`${addon.name} ${addon.description}`, icao))
        .map((icao) => `${addon.id}:${icao}`)
    );
    expect(unnamed).toEqual([]);
  });
});

describe('storefront quick combos', () => {
  const combos = readQuickCombos();

  it('parses the combos from the storefront source', () => {
    expect(combos.map((combo) => combo.id)).toEqual(['combo-eu-captain', 'combo-extreme-ops', 'combo-med-video']);
    expect(new Set(combos.map((combo) => combo.id)).size).toBe(combos.length);
  });

  // UNIT-5 (missing add-on id) and UNIT-6/UNIT-7 (wrong airports in the copy) are fixed.
  const KNOWN: { unknownAddon: Record<string, string>; airports: Record<string, string> } = {
    unknownAddon: {},
    airports: {},
  };

  for (const combo of combos) {
    const addonDefect = (KNOWN.unknownAddon as Record<string, string>)[combo.id];
    const addonTitle = `bundles only add-ons that exist in the catalog (${combo.id})`;
    (addonDefect ? it.fails : it)(addonDefect ? `[KNOWN-DEFECT ${addonDefect}] ${addonTitle}` : addonTitle, () => {
      expect(combo.addonIds.filter((id) => !addonById(id))).toEqual([]);
    });

    const airportDefect = (KNOWN.airports as Record<string, string>)[combo.id];
    const airportTitle = `names every airport its bundled add-ons fly to (${combo.id})`;
    (airportDefect ? it.fails : it)(airportDefect ? `[KNOWN-DEFECT ${airportDefect}] ${airportTitle}` : airportTitle, () => {
      const copy = `${combo.title} ${combo.subtitle}`;
      const bundled = combo.addonIds.flatMap((id) => icaoCodes(addonById(id)?.name ?? ''));
      expect(bundled.length).toBeGreaterThan(0);
      expect(bundled.filter((icao) => !mentions(copy, icao))).toEqual([]);
    });

    it(`advertises the same extra minutes as its add-ons (${combo.id})`, () => {
      const advertised = [...combo.subtitle.matchAll(/\(\+(\d+)m\)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
      const actual = combo.addonIds.reduce((sum, id) => sum + (addonById(id)?.durationMinutes ?? 0), 0);
      expect(advertised).toBeGreaterThan(0);
      expect(advertised).toBe(actual);
    });

    it(`names no catalog airport outside its bundle (${combo.id})`, () => {
      const copy = `${combo.title} ${combo.subtitle}`;
      const bundled = new Set(combo.addonIds.flatMap((id) => icaoCodes(addonById(id)?.name ?? '')));
      expect(Object.keys(AIRPORT_NAMES).filter((icao) => !bundled.has(icao) && mentions(copy, icao))).toEqual([]);
    });
  }
});

describe('seed data', () => {
  it('seeds demo vouchers with codes in the generated voucher format', () => {
    expect(DEMO_VOUCHERS.map((voucher) => voucher.code).filter((code) => !/^SD-VOUCH-[A-HJ-NP-Z2-9]{18}$/.test(code))).toEqual([]);
  });

  /** Seed bookings are generated relative to the clock in the process time zone. */
  async function seedBookings(now: string, timeZone: string): Promise<Booking[]> {
    vi.stubEnv('TZ', timeZone);
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(now) });
    vi.resetModules();
    return (await import('@/lib/db/seed-data')).DEMO_BOOKINGS;
  }

  function scheduleProblems(bookings: Booking[]): string[] {
    const problems: string[] = [];
    bookings.forEach((booking, index) => {
      const { openMinutes, closeMinutes } = getDayOperatingConfig(booking.bookingDate);
      const interval = reservedInterval(booking.startTime, booking.durationMinutes);
      if (interval.start < openMinutes || interval.end > closeMinutes) problems.push(`${booking.bookingDate} ${booking.startTime} outside hours`);
      for (const other of bookings.slice(index + 1)) {
        if (other.bookingDate === booking.bookingDate && overlaps(interval, reservedInterval(other.startTime, other.durationMinutes))) {
          problems.push(`${booking.bookingDate} ${booking.startTime} overlaps ${other.startTime}`);
        }
      }
    });
    return problems;
  }

  it('seeds a month of demo bookings inside opening hours with no double bookings', async () => {
    const bookings = await seedBookings('2026-11-01T08:00:00+02:00', 'Asia/Jerusalem');
    expect(bookings.length).toBeGreaterThan(90);
    expect(new Set(bookings.map((booking) => booking.id)).size).toBe(bookings.length);
    expect(scheduleProblems(bookings)).toEqual([]);
  });

  it('seeds a consistent schedule for any start date in a time zone without daylight saving', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 730 }), async (offset) => {
        const now = new Date(Date.UTC(2026, 0, 1, 6) + offset * 86_400_000).toISOString();
        expect(scheduleProblems(await seedBookings(now, 'UTC'))).toEqual([]);
      }),
      { numRuns: 25 }
    );
  });

  it('seeds no double bookings when the month ahead crosses a daylight-saving change (UNIT-9)', async () => {
    // Israel leaves summer time on Sunday 25 October 2026; seeding a week earlier walks across it.
    expect(scheduleProblems(await seedBookings('2026-10-18T08:00:00+03:00', 'Asia/Jerusalem'))).toEqual([]);
  });
});
