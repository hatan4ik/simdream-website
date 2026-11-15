'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FlightSlot, SimulatorPackage } from '@/types';
import type { Language } from '@/lib/i18n/translations';
import {
  calendarMonthCells,
  calendarWeekDays,
  calendarWeekdayNames,
  monthStartForYmd,
} from '@/lib/i18n/calendar-presentation';
import { maxBookableDate } from '@/lib/scheduler/booking-horizon';
import {
  countOpenSlots,
  groupOpenSlotsByPeriod,
  listPackageOptions,
  nextDayRecovery,
  zeroSlotAlternatives,
  type DurationAvailability,
  type PackageCatalogLayout,
} from '@/lib/scheduler/availability-view-model';

export type CalendarMode = 'week' | 'month';

interface SchedulerViewModelInput {
  selectedDate: string;
  /** Hydration-safe Israel business date supplied by the booking page. */
  calendarTodayYmd: string;
  language: Language;
  onSelectDate: (date: string) => void;
  slots: FlightSlot[];
  packages: SimulatorPackage[];
  selectedPackage: SimulatorPackage;
  durationAvailability: DurationAvailability | undefined;
  /** The wizard lists one option per duration, the storefront one card per package. */
  layout: PackageCatalogLayout;
}

/**
 * Calendar and availability state shared by both booking interfaces (AGENTS.md section 4.4): the
 * week/month switch, the browsed month, the localized calendar cells, the open-slot tiles, the package
 * options of the day and the zero-slot recovery. The components keep their own markup and copy.
 */
export function useSchedulerViewModel({
  selectedDate,
  calendarTodayYmd,
  language,
  onSelectDate,
  slots,
  packages,
  selectedPackage,
  durationAvailability,
  layout,
}: SchedulerViewModelInput) {
  // The seven-day view is the default; the full month remains one tap away for longer-range planning.
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');

  // Keep only a manually browsed month in state. The normal month derives from the selected day,
  // so a post-hydration date update cannot leave a stale placeholder month.
  const [viewMonthOverride, setViewMonthOverride] = useState<Date | null>(null);
  const viewMonthDate = viewMonthOverride ?? monthStartForYmd(selectedDate);

  useEffect(() => {
    setViewMonthOverride(null);
  }, [selectedDate]);

  const weekDays = useMemo(() => calendarWeekDays(selectedDate, language), [language, selectedDate]);
  const maxDate = maxBookableDate(calendarTodayYmd);
  const weekdayNames = useMemo(() => calendarWeekdayNames(language), [language]);
  const monthGridDays = useMemo(
    () => calendarMonthCells(viewMonthDate, language, calendarTodayYmd),
    [calendarTodayYmd, language, viewMonthDate]
  );

  const selectDate = (date: string) => {
    setViewMonthOverride(null);
    onSelectDate(date);
  };

  const openSlotCount = useMemo(() => countOpenSlots(slots), [slots]);
  const slotsByPeriod = useMemo(() => groupOpenSlotsByPeriod(slots), [slots]);
  const packageOptions = useMemo(
    () =>
      listPackageOptions({
        packages,
        selectedPackage,
        durationAvailability,
        selectedOpenSlotCount: openSlotCount,
        layout,
      }),
    [durationAvailability, layout, openSlotCount, packages, selectedPackage]
  );
  const alternatives = useMemo(() => zeroSlotAlternatives(packageOptions), [packageOptions]);

  return {
    calendarMode,
    setCalendarMode,
    /** The month the grid shows: a browsed month, else the selected day's month. */
    viewMonthDate,
    /** Browses the month grid without changing the selected day. */
    browseMonth: setViewMonthOverride,
    weekDays,
    /** Last bookable day (one-year horizon); empty until the Israel date is known. */
    maxDate,
    weekdayNames,
    monthGridDays,
    /** Selects a day and returns the month grid to that day's month. */
    selectDate,
    openSlotCount,
    slotsByPeriod,
    packageOptions,
    zeroSlotAlternatives: alternatives,
    nextDay: nextDayRecovery(selectedDate, calendarTodayYmd),
  };
}

export type SchedulerViewModel = ReturnType<typeof useSchedulerViewModel>;
