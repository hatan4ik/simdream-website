'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlightSlot, PublicCapacityReport, SimulatorPackage } from '@/types';
import { addDaysToYmd } from '@/lib/utils';
import { clampToBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { useClientValue } from '@/lib/ui/use-client-value';
import {
  extractSlotList,
  filterMissionCompatibleSlots,
  resolveSlotsState,
  selectDepartureAfterLoad,
  type SlotsApiPayload,
} from '@/lib/booking/client';

interface UseBookingScheduleArgs {
  selectedPackage: SimulatorPackage;
  /** Base flight plus selected add-ons: only departures that can hold all of it are offered. */
  requiredMissionMinutes: number;
}

/**
 * Date and departure: the selected day (never past the one-year horizon), the Kantorovich-optimized
 * slots and daily efficiency for it, and the selected departure. Reloads whenever the date, package
 * or mission length changes; a newer request aborts a slower, stale one.
 */
export function useBookingSchedule({ selectedPackage, requiredMissionMinutes }: UseBookingScheduleArgs) {
  const browserIsraelToday = useClientValue(() => israelToday());
  // Do not place a fabricated date in the initial HTML. Static prerendering
  // cannot know today's Israel date, so the calendar renders only once the
  // browser supplies it. Until then the visitor sees the localized loading
  // state rather than a misleading future schedule.
  const calendarTodayYmd = browserIsraelToday ?? '';

  // Selected Date & Slot (using local calendar YYYY-MM-DD to prevent UTC timezone day-shift).
  //
  // Do not copy the SSR placeholder into state and replace it later. That created a brief
  // window where a visitor saw live slots for Israel but a 2099 calendar month and could
  // navigate away before the replacement effect ran. The default is instead derived from
  // the client clock; state exists only after an explicit customer selection.
  const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);
  const selectedDate =
    selectedDateOverride ??
    (browserIsraelToday ? addDaysToYmd(browserIsraelToday, 1) : '');
  // Whatever the control, a visitor can never land past the one-year booking horizon.
  const setSelectedDate = useCallback(
    (date: string) => {
      setSelectedDateOverride(clampToBookingHorizon(date, calendarTodayYmd));
    },
    [calendarTodayYmd]
  );
  const [availableSlots, setAvailableSlots] = useState<FlightSlot[]>([]);
  const [efficiencyReport, setEfficiencyReport] = useState<PublicCapacityReport | null>(null);
  const [durationAvailability, setDurationAvailability] = useState<
    Record<number, { availableCount: number; minPriceIls: number }>
  >({});
  const [wixBookingsAuthoritative, setWixBookingsAuthoritative] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<FlightSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsLoadFailed, setSlotsLoadFailed] = useState<boolean>(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState<number>(0);
  // True once the first availability request has started, so the page can report
  // `data-slots-state` (idle → loading → ready | failed) to journeys and tests.
  const [slotsRequested, setSlotsRequested] = useState<boolean>(false);

  // Fetch Kantorovich-optimized slots & daily efficiency whenever selected date or package changes
  useEffect(() => {
    // The first server/client hydration pass deliberately uses the stable snapshot
    // above. Do not request availability for that placeholder date; fetch only
    // once the browser has supplied Israel's current operating day.
    if (!browserIsraelToday) return;

    // A newer date or package selection aborts this request, so a slow, stale
    // response can never overwrite the slots of the current selection.
    const controller = new AbortController();
    async function fetchSlots() {
      setSlotsRequested(true);
      setLoadingSlots(true);
      setSlotsLoadFailed(false);
      try {
        const res = await fetch(
          `/api/slots?date=${selectedDate}&duration=${selectedPackage.durationMinutes}&includeEfficiency=true`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Slots request failed with ${res.status}`);
        const data: SlotsApiPayload | FlightSlot[] = await res.json();
        const slotList = extractSlotList(data);
        const payload: SlotsApiPayload | undefined = Array.isArray(data) ? undefined : data;

        if (payload?.durationAvailability) {
          setDurationAvailability(payload.durationAvailability);
        }
        setWixBookingsAuthoritative(payload?.wixBookingsAuthoritative === true);

        setAvailableSlots(slotList);
        if (payload?.efficiency) {
          setEfficiencyReport(payload.efficiency);
        }

        // Prefer a smart pairing or an open departure which can accommodate
        // the entire selected mission.
        setSelectedSlot((prev) =>
          selectDepartureAfterLoad(slotList, { selectedDate, previous: prev, requiredMissionMinutes })
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        // Show a load error with a retry, never an empty "sold out" day.
        console.error('Failed to load slots', err);
        setAvailableSlots([]);
        setWixBookingsAuthoritative(false);
        setSlotsLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => controller.abort();
  }, [browserIsraelToday, requiredMissionMinutes, selectedDate, selectedPackage, slotsReloadKey]);

  // Both storefronts consume the same manifest-compatible departures. This
  // keeps a selected route or add-on visible rather than offering a departure
  // that would immediately invalidate it.
  const missionCompatibleSlots = useMemo(
    () => filterMissionCompatibleSlots(availableSlots, requiredMissionMinutes),
    [availableSlots, requiredMissionMinutes]
  );

  return {
    /** Israel's business date once the browser supplied it; null while the page hydrates. */
    browserIsraelToday,
    calendarTodayYmd,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    missionCompatibleSlots,
    efficiencyReport,
    durationAvailability,
    /** A live Wix Bookings calendar is the single reservation writer. */
    wixBookingsAuthoritative,
    loadingSlots,
    slotsLoadFailed,
    reloadSlots: () => setSlotsReloadKey((key) => key + 1),
    /** `data-slots-state` of the page root. */
    slotsState: resolveSlotsState({ loadingSlots, slotsLoadFailed, slotsRequested }),
  };
}

export type BookingSchedule = ReturnType<typeof useBookingSchedule>;
