'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlightSlot, PublicCapacityReport, SimulatorPackage } from '@/types';
import { addDaysToYmd } from '@/lib/utils';
import { clampToBookingHorizon } from '@/lib/scheduler/booking-horizon';
import { israelToday } from '@/lib/scheduler/israel-clock';
import { useClientValue } from '@/lib/ui/use-client-value';
import { useServerIsraelToday } from '../ServerIsraelToday';
import {
  extractSlotList,
  filterMissionCompatibleSlots,
  resolveScheduleDurationMinutes,
  resolveSlotsState,
  selectDepartureAfterLoad,
  type SlotAdjustment,
  type SlotsApiPayload,
} from '@/lib/booking/client';

interface UseBookingScheduleArgs {
  selectedPackage: SimulatorPackage;
  /** Base flight plus selected add-ons: only departures that can hold all of it are offered. */
  requiredMissionMinutes: number;
}

/**
 * Date and departure: the selected day (never past the one-year horizon), the Kantorovich-optimized
 * slots and daily efficiency for it, and the selected departure. When a recreational mission add-on
 * upgrades the tier (e.g. 60m -> 90m), switches to the upgraded duration's own schedule grid and
 * snaps to the nearest departure if needed, recording `slotAdjustment` so the UI explains the shift.
 */
export function useBookingSchedule({ selectedPackage, requiredMissionMinutes }: UseBookingScheduleArgs) {
  // The server's reading seeds the first HTML; after hydration the browser's own clock decides, so a
  // page served just before Israel's midnight moves to the new day by itself.
  const browserIsraelToday = useClientValue(() => israelToday(), useServerIsraelToday());
  const calendarTodayYmd = browserIsraelToday ?? '';

  const [selectedDateOverride, setSelectedDateOverride] = useState<string | null>(null);
  const selectedDate =
    selectedDateOverride ??
    (browserIsraelToday ? addDaysToYmd(browserIsraelToday, 1) : '');
  const [slotAdjustment, setSlotAdjustment] = useState<SlotAdjustment | null>(null);
  const preUpgradeStartRef = useRef<{ date: string; baseDuration: number; startTime: string } | null>(null);
  const lastGridRef = useRef<{ date: string; packageId: string; duration: number } | null>(null);
  const requiredMinutesRef = useRef<number>(requiredMissionMinutes);
  requiredMinutesRef.current = requiredMissionMinutes;

  const setSelectedDate = useCallback(
    (date: string) => {
      preUpgradeStartRef.current = null;
      setSlotAdjustment(null);
      setSelectedDateOverride(clampToBookingHorizon(date, calendarTodayYmd));
    },
    [calendarTodayYmd]
  );

  const scheduleDurationMinutes = resolveScheduleDurationMinutes(
    selectedPackage.durationMinutes,
    requiredMissionMinutes,
    selectedPackage.category
  );

  const [loadedGrid, setLoadedGrid] = useState<{ date: string; duration: number; slots: FlightSlot[] }>({
    date: '',
    duration: 0,
    slots: [],
  });
  const availableSlots = loadedGrid.slots;
  const [efficiencyReport, setEfficiencyReport] = useState<PublicCapacityReport | null>(null);
  const [durationAvailability, setDurationAvailability] = useState<
    Record<number, { availableCount: number; minPriceIls: number }>
  >({});
  const [wixBookingsAuthoritative, setWixBookingsAuthoritative] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlotState] = useState<FlightSlot | null>(null);
  const selectedSlotRef = useRef<FlightSlot | null>(null);
  selectedSlotRef.current = selectedSlot;

  const setSelectedSlot = useCallback((slot: FlightSlot | null) => {
    preUpgradeStartRef.current = null;
    setSlotAdjustment(null);
    selectedSlotRef.current = slot;
    setSelectedSlotState(slot);
  }, []);

  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsLoadFailed, setSlotsLoadFailed] = useState<boolean>(false);
  const [slotsReloadKey, setSlotsReloadKey] = useState<number>(0);
  const [slotsRequested, setSlotsRequested] = useState<boolean>(false);

  // Fetch Kantorovich-optimized slots & daily efficiency whenever date, package or active grid duration changes.
  useEffect(() => {
    if (!browserIsraelToday) return;

    const controller = new AbortController();
    async function fetchSlots() {
      setSlotsRequested(true);
      setLoadingSlots(true);
      setSlotsLoadFailed(false);
      try {
        const res = await fetch(
          `/api/slots?date=${selectedDate}&duration=${scheduleDurationMinutes}&includeEfficiency=true`,
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
        if (payload?.efficiency) {
          setEfficiencyReport(payload.efficiency);
        }

        const prevSlot = selectedSlotRef.current;
        const prevGrid = lastGridRef.current;
        const isSameDatePackageGridSwitch = Boolean(
          prevSlot &&
            prevSlot.date === selectedDate &&
            prevGrid &&
            prevGrid.date === selectedDate &&
            prevGrid.packageId === selectedPackage.id &&
            prevGrid.duration !== scheduleDurationMinutes
        );
        const isUpgradedGrid = scheduleDurationMinutes > selectedPackage.durationMinutes;

        let nextSlot: FlightSlot | null;
        if (isSameDatePackageGridSwitch && prevSlot) {
          if (isUpgradedGrid) {
            if (!preUpgradeStartRef.current && prevGrid?.duration === selectedPackage.durationMinutes) {
              preUpgradeStartRef.current = {
                date: selectedDate,
                baseDuration: selectedPackage.durationMinutes,
                startTime: prevSlot.startTime,
              };
            }
            const anchorStart =
              preUpgradeStartRef.current?.date === selectedDate
                ? preUpgradeStartRef.current.startTime
                : prevSlot.startTime;
            nextSlot = selectDepartureAfterLoad(slotList, {
              selectedDate,
              previous: prevSlot,
              requiredMissionMinutes: requiredMinutesRef.current,
              preferNearestOnSameDate: true,
              preferredStartTime: anchorStart,
            });
            setSlotAdjustment(
              nextSlot && nextSlot.startTime !== anchorStart
                ? {
                    fromStartTime: anchorStart,
                    toStartTime: nextSlot.startTime,
                    durationMinutes: scheduleDurationMinutes,
                  }
                : null
            );
          } else {
            const restoreStart =
              preUpgradeStartRef.current?.date === selectedDate &&
              preUpgradeStartRef.current.baseDuration === scheduleDurationMinutes
                ? preUpgradeStartRef.current.startTime
                : undefined;
            nextSlot = selectDepartureAfterLoad(slotList, {
              selectedDate,
              previous: prevSlot,
              requiredMissionMinutes: requiredMinutesRef.current,
              preferNearestOnSameDate: true,
              preferredStartTime: restoreStart,
            });
            preUpgradeStartRef.current = null;
            setSlotAdjustment(null);
          }
        } else {
          if (!isUpgradedGrid) preUpgradeStartRef.current = null;
          setSlotAdjustment(null);
          nextSlot = selectDepartureAfterLoad(slotList, {
            selectedDate,
            previous: prevSlot,
            requiredMissionMinutes: requiredMinutesRef.current,
          });
        }

        lastGridRef.current = { date: selectedDate, packageId: selectedPackage.id, duration: scheduleDurationMinutes };
        selectedSlotRef.current = nextSlot;
        setSelectedSlotState(nextSlot);
        setLoadedGrid({ date: selectedDate, duration: scheduleDurationMinutes, slots: slotList });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to load slots', err);
        setLoadedGrid({ date: selectedDate, duration: scheduleDurationMinutes, slots: [] });
        selectedSlotRef.current = null;
        setSelectedSlotState(null);
        setWixBookingsAuthoritative(false);
        setSlotsLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => controller.abort();
  }, [browserIsraelToday, selectedDate, selectedPackage.id, selectedPackage.durationMinutes, scheduleDurationMinutes, slotsReloadKey]);

  // Reconcile when mission minutes change within the already-loaded duration grid (e.g. non-recreational add-on).
  useEffect(() => {
    if (loadedGrid.date !== selectedDate || loadedGrid.duration !== scheduleDurationMinutes) return;
    setSelectedSlotState((prev) => {
      const next = selectDepartureAfterLoad(loadedGrid.slots, {
        selectedDate,
        previous: prev,
        requiredMissionMinutes,
      });
      selectedSlotRef.current = next;
      return next;
    });
  }, [loadedGrid, requiredMissionMinutes, scheduleDurationMinutes, selectedDate]);

  const isSwitchingGrid =
    loadingSlots || (loadedGrid.duration > 0 && loadedGrid.duration !== scheduleDurationMinutes);

  const missionCompatibleSlots = useMemo(
    () => filterMissionCompatibleSlots(availableSlots, requiredMissionMinutes),
    [availableSlots, requiredMissionMinutes]
  );

  return {
    /** Israel's business date: the server's reading in the first HTML, the browser's after hydration; null only when no server reading exists. */
    browserIsraelToday,
    calendarTodayYmd,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    /** Set when switching to an upgraded duration's grid moved the departure to a nearby start. */
    slotAdjustment,
    /** The active schedule grid duration currently queried from `/api/slots`. */
    scheduleDurationMinutes,
    /** True while a duration-grid switch fetch is in flight. */
    isSwitchingGrid,
    missionCompatibleSlots,
    efficiencyReport,
    durationAvailability,
    /** A live Wix Bookings calendar is the single reservation writer. */
    wixBookingsAuthoritative,
    /** Also true before the first request: the server-rendered frame must never report an unknown day as empty. */
    loadingSlots: loadingSlots || !slotsRequested,
    slotsLoadFailed,
    reloadSlots: () => setSlotsReloadKey((key) => key + 1),
    /** `data-slots-state` of the page root. */
    slotsState: resolveSlotsState({ loadingSlots, slotsLoadFailed, slotsRequested }),
  };
}

export type BookingSchedule = ReturnType<typeof useBookingSchedule>;
