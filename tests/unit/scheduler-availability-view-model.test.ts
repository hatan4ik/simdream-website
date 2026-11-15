import { describe, expect, it } from 'vitest';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  countOpenSlots,
  groupOpenSlotsByPeriod,
  listPackageOptions,
  nextDayRecovery,
  SLOT_PERIODS,
  zeroSlotAlternatives,
  type DurationAvailability,
} from '@/lib/scheduler/availability-view-model';
import { packageFromPriceIls } from '@/lib/scheduler/mission-calculator';
import type { FlightSlot, SimulatorPackage } from '@/types';

/**
 * The availability view-model both booking interfaces render (AGENTS.md section 4, rules 1-4):
 * never hide a sold-out package, never overwrite the visitor's selection, offer a next day and
 * only durations that still have open departures, and list open slots only.
 */

const byId = (id: string): SimulatorPackage => {
  const pkg = SIMULATOR_PACKAGES.find((candidate) => candidate.id === id);
  if (!pkg) throw new Error(`missing seed package ${id}`);
  return pkg;
};

const DISCOVERY_30 = byId('pkg-discovery-30');
const PROMO_45 = byId('pkg-promo-45');
const CAPTAIN_60 = byId('pkg-captain-60');
const ULTIMATE_90 = byId('pkg-ultimate-90');
const PRO_60 = byId('pkg-pro-60');
const CORPORATE = byId('pkg-corporate-crm');
const RECREATIONAL = [DISCOVERY_30, PROMO_45, CAPTAIN_60, ULTIMATE_90];

function slot(startTime: string, available = true): FlightSlot {
  return {
    id: `slot-${startTime}`,
    date: '2026-11-21',
    startTime,
    endTime: startTime,
    reservedEndTime: startTime,
    durationMinutes: 60,
    totalReservedMinutes: 75,
    available,
    blockPeriod: 'morning',
    blockLabel: '',
    isPrimeTime: false,
    dynamicPriceIls: 690,
    basePriceIls: 690,
    yieldPerMinIls: 0,
  };
}

/** A Saturday as `GET /api/slots` reports it: the 45m promo has no departure that day. */
const SATURDAY: DurationAvailability = {
  30: { availableCount: 6, minPriceIls: 520 },
  45: { availableCount: 0, minPriceIls: 0 },
  60: { availableCount: 4, minPriceIls: 790 },
  90: { availableCount: 0, minPriceIls: 0 },
  120: { availableCount: 2, minPriceIls: 1590 },
};

describe('open slots only (AGENTS.md section 4 rule 3)', () => {
  const day = [slot('09:00'), slot('10:15', false), slot('14:59'), slot('15:00'), slot('17:45', false), slot('17:59'), slot('18:00'), slot('22:30')];

  it('counts only bookable departures', () => {
    expect(countOpenSlots(day)).toBe(6);
    expect(countOpenSlots([slot('09:00', false)])).toBe(0);
    expect(countOpenSlots([])).toBe(0);
  });

  it('groups open departures into morning (before 15:00), afternoon (before 18:00) and evening, in order', () => {
    const groups = groupOpenSlotsByPeriod(day);
    expect(groups.morning.map((s) => s.startTime)).toEqual(['09:00', '14:59']);
    expect(groups.afternoon.map((s) => s.startTime)).toEqual(['15:00', '17:59']);
    expect(groups.evening.map((s) => s.startTime)).toEqual(['18:00', '22:30']);
  });

  it('never lists a booked, reserved or locked departure', () => {
    const listed = SLOT_PERIODS.flatMap((period) => groupOpenSlotsByPeriod(day)[period]);
    expect(listed.every((s) => s.available)).toBe(true);
    expect(listed.map((s) => s.startTime)).not.toContain('10:15');
    expect(listed.map((s) => s.startTime)).not.toContain('17:45');
  });

  it('keeps an empty group empty and orders the groups morning, afternoon, evening', () => {
    expect(SLOT_PERIODS).toEqual(['morning', 'afternoon', 'evening']);
    expect(groupOpenSlotsByPeriod([slot('19:00'), slot('09:00', false)])).toEqual({
      morning: [],
      afternoon: [],
      evening: [slot('19:00')],
    });
  });
});

describe('listPackageOptions: one card per package (storefront)', () => {
  const options = (selected: SimulatorPackage, availability: DurationAvailability | undefined, selectedOpenSlotCount = 0) =>
    listPackageOptions({
      packages: [...RECREATIONAL, CORPORATE],
      selectedPackage: selected,
      durationAvailability: availability,
      selectedOpenSlotCount,
      layout: 'per-package',
    });

  it('keeps every bookable package in catalogue order and never lists the corporate offsite', () => {
    expect(options(CAPTAIN_60, SATURDAY).map((o) => o.pkg.id)).toEqual(RECREATIONAL.map((p) => p.id));
  });

  it('keeps a sold-out package listed and marks it with zero open slots (rule 1)', () => {
    const promo = options(CAPTAIN_60, SATURDAY).find((o) => o.pkg.id === PROMO_45.id);
    expect(promo).toMatchObject({ isSoldOut: true, openSlotCount: 0, isSelected: false });
  });

  it('keeps the visitor selection on a day it is sold out (rule 2)', () => {
    const list = options(PROMO_45, SATURDAY);
    expect(list.filter((o) => o.isSelected).map((o) => o.pkg.id)).toEqual([PROMO_45.id]);
    expect(list.find((o) => o.isSelected)).toMatchObject({ isSoldOut: true, openSlotCount: 0 });
  });

  it('reports the day count of each duration and its "from" price', () => {
    const captain = options(PROMO_45, SATURDAY).find((o) => o.pkg.id === CAPTAIN_60.id)!;
    expect(captain).toMatchObject({ isSoldOut: false, openSlotCount: 4 });
    expect(captain.fromPriceIls).toBe(packageFromPriceIls(CAPTAIN_60, 790));
    const ultimate = options(PROMO_45, SATURDAY).find((o) => o.pkg.id === ULTIMATE_90.id)!;
    expect(ultimate.fromPriceIls).toBe(packageFromPriceIls(ULTIMATE_90, 0));
  });

  it('without a day report, shows nothing as sold out and counts the loaded slots for the selection only', () => {
    const list = options(CAPTAIN_60, undefined, 7);
    expect(list.every((o) => !o.isSoldOut)).toBe(true);
    expect(list.map((o) => [o.pkg.id, o.openSlotCount])).toEqual([
      [DISCOVERY_30.id, 0],
      [PROMO_45.id, 0],
      [CAPTAIN_60.id, 7],
      [ULTIMATE_90.id, 0],
    ]);
    expect(list.map((o) => o.fromPriceIls)).toEqual(RECREATIONAL.map((p) => packageFromPriceIls(p, undefined)));
  });

  it('selects by package id, so another package of the same duration is not the selection', () => {
    const list = listPackageOptions({
      packages: [CAPTAIN_60, PRO_60],
      selectedPackage: PRO_60,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 4,
      layout: 'per-package',
    });
    expect(list.map((o) => [o.pkg.id, o.isSelected])).toEqual([
      [CAPTAIN_60.id, false],
      [PRO_60.id, true],
    ]);
  });
});

describe('listPackageOptions: one option per duration (guided wizard)', () => {
  it('lists each duration once, shortest first, without the corporate offsite', () => {
    const list = listPackageOptions({
      packages: [ULTIMATE_90, CORPORATE, CAPTAIN_60, DISCOVERY_30, PROMO_45],
      selectedPackage: CAPTAIN_60,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 4,
      layout: 'per-duration',
    });
    expect(list.map((o) => o.pkg.durationMinutes)).toEqual([30, 45, 60, 90]);
  });

  it('represents a shared duration by the selected package, otherwise by the first one listed', () => {
    const selectedLater = listPackageOptions({
      packages: [CAPTAIN_60, PRO_60],
      selectedPackage: PRO_60,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 4,
      layout: 'per-duration',
    });
    expect(selectedLater.map((o) => o.pkg.id)).toEqual([PRO_60.id]);
    const selectedElsewhere = listPackageOptions({
      packages: [CAPTAIN_60, PRO_60, PROMO_45],
      selectedPackage: PROMO_45,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 0,
      layout: 'per-duration',
    });
    expect(selectedElsewhere.map((o) => o.pkg.id)).toEqual([PROMO_45.id, CAPTAIN_60.id]);
  });

  it('selects by duration and keeps a sold-out selected duration visible (rules 1 and 2)', () => {
    const list = listPackageOptions({
      packages: RECREATIONAL,
      selectedPackage: PROMO_45,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 0,
      layout: 'per-duration',
    });
    expect(list.map((o) => [o.pkg.durationMinutes, o.isSelected, o.isSoldOut])).toEqual([
      [30, false, false],
      [45, true, true],
      [60, false, false],
      [90, false, true],
    ]);
  });
});

describe('zero-slot recovery (AGENTS.md section 4 rule 3)', () => {
  it('offers only other options that still have open departures that day, in listed order', () => {
    const list = listPackageOptions({
      packages: RECREATIONAL,
      selectedPackage: PROMO_45,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 0,
      layout: 'per-package',
    });
    expect(zeroSlotAlternatives(list).map((o) => o.pkg.id)).toEqual([DISCOVERY_30.id, CAPTAIN_60.id]);
  });

  it('never offers the selection itself, even when its duration reports open departures', () => {
    const list = listPackageOptions({
      packages: RECREATIONAL,
      selectedPackage: CAPTAIN_60,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 0,
      layout: 'per-duration',
    });
    expect(zeroSlotAlternatives(list).map((o) => o.pkg.durationMinutes)).toEqual([30]);
  });

  it('offers nothing while the day has not been reported', () => {
    const list = listPackageOptions({
      packages: RECREATIONAL,
      selectedPackage: PROMO_45,
      durationAvailability: undefined,
      selectedOpenSlotCount: 0,
      layout: 'per-package',
    });
    expect(zeroSlotAlternatives(list)).toEqual([]);
  });

  it('carries the "from" price each alternative button shows', () => {
    const list = listPackageOptions({
      packages: RECREATIONAL,
      selectedPackage: PROMO_45,
      durationAvailability: SATURDAY,
      selectedOpenSlotCount: 0,
      layout: 'per-package',
    });
    expect(zeroSlotAlternatives(list).map((o) => o.fromPriceIls)).toEqual([
      packageFromPriceIls(DISCOVERY_30, 520),
      packageFromPriceIls(CAPTAIN_60, 790),
    ]);
  });

  it('"Check Next Day" moves one calendar day, across month and year ends', () => {
    expect(nextDayRecovery('2026-11-21', '2026-11-15')).toEqual({ date: '2026-11-22', beyondHorizon: false });
    expect(nextDayRecovery('2026-11-30', '2026-11-15').date).toBe('2026-12-01');
    expect(nextDayRecovery('2026-12-31', '2026-11-15').date).toBe('2027-01-01');
  });

  it('"Check Next Day" is unavailable from the last bookable day (one-year horizon)', () => {
    expect(nextDayRecovery('2027-11-14', '2026-11-15')).toEqual({ date: '2027-11-15', beyondHorizon: false });
    expect(nextDayRecovery('2027-11-15', '2026-11-15')).toEqual({ date: '2027-11-16', beyondHorizon: true });
  });

  it('never blocks "Check Next Day" before the Israel date is known', () => {
    expect(nextDayRecovery('2027-11-15', '')).toEqual({ date: '2027-11-16', beyondHorizon: false });
  });
});
