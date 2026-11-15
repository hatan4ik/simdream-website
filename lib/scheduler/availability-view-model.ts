import type { FlightSlot, SimulatorPackage } from '@/types';
import { addDaysToYmd } from '@/lib/utils';
import { isBeyondBookingHorizon } from './booking-horizon';
import { packageFromPriceIls } from './mission-calculator';

/**
 * The availability view-model shared by the two booking interfaces, the storefront
 * (`AmazonFlightStorefront`) and the guided wizard (`KantorovichCalendarScheduler`), so both follow
 * the same frontend calendar rules (AGENTS.md section 4, rules 1-4). Pure: markup, copy and layout
 * stay in the components.
 */

/** Open departures and the cheapest open price per flight duration on the selected day, as `GET /api/slots` reports them. */
export type DurationAvailability = Record<number, { availableCount: number; minPriceIls: number }>;

/**
 * How an interface lists packages. The wizard shows one option per flight duration and a duration
 * is the selection; the storefront shows one card per package and a package id is the selection.
 */
export type PackageCatalogLayout = 'per-duration' | 'per-package';

export type SlotPeriod = 'morning' | 'afternoon' | 'evening';

/** The departure groups in display order. */
export const SLOT_PERIODS: readonly SlotPeriod[] = ['morning', 'afternoon', 'evening'];

export interface PackageOption {
  pkg: SimulatorPackage;
  /** The visitor's selection (by duration or by package id, see `PackageCatalogLayout`); never overwritten by availability. */
  isSelected: boolean;
  /** The day reports no open departure for this duration. The option stays listed with its 0-slot badge (rule 1). */
  isSoldOut: boolean;
  /** Open departures that day. Without a day report only the selection has a count: its loaded slots. */
  openSlotCount: number;
  /** The "from" price: the package price at the cheapest open departure of its duration (`packageFromPriceIls`). */
  fromPriceIls: number;
}

const isOpen = (slot: FlightSlot) => slot.available;

/** Departures the visitor can book; booked, reserved and internally locked slots are never counted. */
export function countOpenSlots(slots: readonly FlightSlot[]): number {
  return slots.filter(isOpen).length;
}

/**
 * The departure tiles: open slots only (rule 3), grouped by start hour into morning (before 15:00),
 * afternoon (before 18:00) and evening, each in the order the engine returned them.
 */
export function groupOpenSlotsByPeriod(slots: readonly FlightSlot[]): Record<SlotPeriod, FlightSlot[]> {
  const groups: Record<SlotPeriod, FlightSlot[]> = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots.filter(isOpen)) {
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    if (hour < 15) {
      groups.morning.push(slot);
    } else if (hour < 18) {
      groups.afternoon.push(slot);
    } else {
      groups.evening.push(slot);
    }
  }
  return groups;
}

/** One package per duration, shortest first; the selected package represents its duration, else the first listed. */
function onePackagePerDuration(packages: readonly SimulatorPackage[], selectedPackageId: string): SimulatorPackage[] {
  const byDuration = new Map<number, SimulatorPackage>();
  for (const pkg of packages) {
    const existing = byDuration.get(pkg.durationMinutes);
    if (!existing || pkg.id === selectedPackageId) byDuration.set(pkg.durationMinutes, pkg);
  }
  return Array.from(byDuration.values()).sort((a, b) => a.durationMinutes - b.durationMinutes);
}

/**
 * The package options of the booking's scope for the selected day. Every option stays listed whatever
 * its availability (rule 1) and the selection stays the visitor's (rule 2); the corporate offsite is
 * never booked here.
 */
export function listPackageOptions(input: {
  packages: readonly SimulatorPackage[];
  selectedPackage: Pick<SimulatorPackage, 'id' | 'durationMinutes'>;
  durationAvailability: DurationAvailability | undefined;
  /** Open departures in the loaded slot list of the selection. */
  selectedOpenSlotCount: number;
  layout: PackageCatalogLayout;
}): PackageOption[] {
  const { selectedPackage, durationAvailability, selectedOpenSlotCount, layout } = input;
  const bookable = input.packages.filter((pkg) => pkg.category !== 'corporate');
  const listed = layout === 'per-duration' ? onePackagePerDuration(bookable, selectedPackage.id) : bookable;
  return listed.map((pkg) => {
    const isSelected =
      layout === 'per-duration' ? pkg.durationMinutes === selectedPackage.durationMinutes : pkg.id === selectedPackage.id;
    const day = durationAvailability?.[pkg.durationMinutes];
    return {
      pkg,
      isSelected,
      isSoldOut: day ? !(day.availableCount > 0) : false,
      openSlotCount: day ? day.availableCount : isSelected ? selectedOpenSlotCount : 0,
      fromPriceIls: packageFromPriceIls(pkg, day?.minPriceIls),
    };
  });
}

/**
 * Zero-slot quick switches (rule 3): the other options of the scope with open departures on the
 * selected day, in listed order. An option whose duration has no day report has no count and is not
 * offered, so a tap never lands on a missing package or another sold-out duration.
 */
export function zeroSlotAlternatives(options: readonly PackageOption[]): PackageOption[] {
  return options.filter((option) => !option.isSelected && option.openSlotCount > 0);
}

/** "Check Next Day →": the day after the selected date, unavailable past the one-year booking horizon. */
export function nextDayRecovery(selectedDate: string, calendarTodayYmd: string): { date: string; beyondHorizon: boolean } {
  const date = addDaysToYmd(selectedDate, 1);
  return { date, beyondHorizon: isBeyondBookingHorizon(date, calendarTodayYmd) };
}
