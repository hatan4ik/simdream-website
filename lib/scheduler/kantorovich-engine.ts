import {
  Booking,
  DailyEfficiencyReport,
  DailyScheduleBlock,
  FlightSlot,
  GapCollisionAlert,
  PublicCapacityReport,
  SlotBlockPeriod,
} from '@/types';
import { hasDeparted } from './israel-clock';

export const TURNAROUND_MINUTES = 15;

/**
 * Valid full-slot durations (Flight + 15m turnaround):
 * - 30m flight -> 45m reserved (x3)
 * - 45m promo  -> 60m reserved (x2, daytime only)
 * - 60m flight -> 75m reserved (x1, base standard)
 * - 90m flight -> 105m reserved (x4)
 * - 120m pro   -> 150m reserved (2x75m block)
 */
export const VALID_RESERVED_DURATIONS_DAY = [45, 60, 75, 105, 150];
export const VALID_RESERVED_DURATIONS_PRIME = [45, 75, 105, 150]; // In prime time, 60m promo is disabled

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getReservedMinutesForFlight(durationMinutes: number): number {
  if (durationMinutes <= 30) {
    // The active 30m discovery flight, plus any historical 20m booking, occupies one 45m block.
    return 45;
  }
  if (durationMinutes === 120) {
    // 120m Pro assessment occupies a full 150m constructor block (120m flight + 30m briefing/debriefing/turnaround)
    return 150;
  }
  if (durationMinutes === 240) {
    return 255;
  }
  return durationMinutes + TURNAROUND_MINUTES;
}

export interface DayOperatingConfig {
  dayOfWeek: number; // 0 = Sun ... 5 = Fri, 6 = Sat
  openMinutes: number;
  closeMinutes: number;
  totalFundMinutes: number;
  operatingWindow: string;
  isSaturday: boolean;
  isFriday: boolean;
}

export function getDayOperatingConfig(dateString: string): DayOperatingConfig {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  const dayOfWeek = dateObj.getDay();

  // Friday: 09:00 - 16:30 (450 minutes)
  if (dayOfWeek === 5) {
    return {
      dayOfWeek,
      openMinutes: 9 * 60, // 540
      closeMinutes: 16 * 60 + 30, // 990
      totalFundMinutes: 450,
      operatingWindow: '09:00 – 16:30',
      isSaturday: false,
      isFriday: true,
    };
  }

  // Saturday: 19:00 - 24:00 (300 minutes - 100% Prime-Time)
  if (dayOfWeek === 6) {
    return {
      dayOfWeek,
      openMinutes: 19 * 60, // 1140
      closeMinutes: 24 * 60, // 1440
      totalFundMinutes: 300,
      operatingWindow: '19:00 – 24:00',
      isSaturday: true,
      isFriday: false,
    };
  }

  // Sunday - Thursday: 10:00 - 23:00 (780 minutes)
  return {
    dayOfWeek,
    openMinutes: 10 * 60, // 600
    closeMinutes: 23 * 60, // 1380
    totalFundMinutes: 780,
    operatingWindow: '10:00 – 23:00',
    isSaturday: false,
    isFriday: false,
  };
}

/**
 * Longest mission (pure flight minutes, at least `baseMinutes`) such that every mission
 * length up to it reserves no more than `windowMinutes`. The buffer map is not monotonic
 * (a 120-minute mission reserves 150 minutes, a 121-minute one 136), so the limit stops
 * at the first length that would overrun the window.
 */
export function longestMissionWithin(windowMinutes: number, baseMinutes: number): number {
  let longest = baseMinutes;
  for (let minutes = baseMinutes + 1; getReservedMinutesForFlight(minutes) <= windowMinutes; minutes++) {
    longest = minutes;
  }
  return longest;
}

/**
 * Checks whether an interval of `gapMinutes` can be tiled with zero waste
 * using valid Kantorovich full-slot blocks.
 */
/** The ₪490 45-minute discounted flight is a Sun–Tue daytime-only offer. */
export function is45MinutePromoDay(dateString: string): boolean {
  const { dayOfWeek } = getDayOperatingConfig(dateString);
  return dayOfWeek >= 0 && dayOfWeek <= 2;
}

/**
 * Checks whether a gap can be filled by packages that are actually sellable
 * on that day. The 60-minute reserved block exists only while the discounted
 * 45-minute promotion is available; otherwise treating it as tileable could
 * create a gap no customer can buy.
 */
export function canTileIntervalZeroWaste(
  gapMinutes: number,
  isPrimeTime: boolean,
  is45MinutePromoAvailable = true
): boolean {
  if (gapMinutes === 0) return true;
  if (gapMinutes < 45) return false;

  const allowed = isPrimeTime || !is45MinutePromoAvailable
    ? VALID_RESERVED_DURATIONS_PRIME
    : VALID_RESERVED_DURATIONS_DAY;

  const dp = new Array(gapMinutes + 1).fill(false);
  dp[0] = true;

  for (let i = 0; i <= gapMinutes; i++) {
    if (!dp[i]) continue;
    for (const block of allowed) {
      if (i + block <= gapMinutes) {
        dp[i + block] = true;
      }
    }
  }

  return dp[gapMinutes];
}

/**
 * Dynamic Shadow Pricing per Kantorovich Model:
 * - 30 min (45m reserved): 450 ILS (10.00 ILS/min)
 * - 45 min Promo (60m reserved): 490 ILS (8.17 ILS/min) - Strictly daytime (< 18:00)
 * - 60 min Standard (75m reserved): 690 ILS (9.20 ILS/min)
 * - 90 min Long (105m reserved): 850 ILS Daytime (< 18:00) | 950 ILS Prime-Time (>= 18:00 or Sat)
 * - 120 min Pro (150m reserved): 1590 ILS
 */
export function getKantorovichPricing(
  durationMinutes: number,
  startMinutes: number,
  isSaturday: boolean
): {
  basePriceIls: number;
  dynamicPriceIls: number;
  isPrimeTime: boolean;
  yieldPerMinIls: number;
} {
  const isPrimeTime = isSaturday || startMinutes >= 18 * 60;
  const reserved = getReservedMinutesForFlight(durationMinutes);

  if (durationMinutes === 30) {
    return {
      basePriceIls: 450,
      dynamicPriceIls: 450,
      isPrimeTime,
      yieldPerMinIls: +(450 / reserved).toFixed(2), // 10.00
    };
  }

  if (durationMinutes === 45) {
    return {
      basePriceIls: 490,
      dynamicPriceIls: 490,
      isPrimeTime,
      yieldPerMinIls: +(490 / reserved).toFixed(2), // 8.17
    };
  }

  if (durationMinutes === 60) {
    return {
      basePriceIls: 690,
      dynamicPriceIls: 690,
      isPrimeTime,
      yieldPerMinIls: +(690 / reserved).toFixed(2), // 9.20
    };
  }

  if (durationMinutes === 90) {
    const dynamicPrice = isPrimeTime ? 950 : 850;
    return {
      basePriceIls: 850,
      dynamicPriceIls: dynamicPrice,
      isPrimeTime,
      yieldPerMinIls: +(dynamicPrice / reserved).toFixed(2), // 8.10 day / 9.05 prime
    };
  }

  if (durationMinutes === 120) {
    return {
      basePriceIls: 1590,
      dynamicPriceIls: 1590,
      isPrimeTime,
      yieldPerMinIls: +(1590 / reserved).toFixed(2), // 10.60
    };
  }

  // Fallback
  const fallbackPrice = durationMinutes * 12;
  return {
    basePriceIls: fallbackPrice,
    dynamicPriceIls: fallbackPrice,
    isPrimeTime,
    yieldPerMinIls: +(fallbackPrice / reserved).toFixed(2),
  };
}

function getBlockMetadata(
  startMinutes: number,
  config: DayOperatingConfig
): { period: SlotBlockPeriod; label: string } {
  if (config.isSaturday) {
    return {
      period: 'saturday_prime',
      label: 'Saturday Prime-Time Operations (19:00–24:00)',
    };
  }
  if (config.isFriday) {
    if (startMinutes >= 15 * 60 + 45) {
      return {
        period: 'friday_closer',
        label: 'Friday Closing Operations (15:45–16:30)',
      };
    }
    return {
      period: 'morning',
      label: 'Friday Morning & Midday Operations (09:00–15:45)',
    };
  }

  if (startMinutes < 15 * 60) {
    return {
      period: 'morning',
      label: 'Morning Operations (10:00–15:00)',
    };
  }
  if (startMinutes < 18 * 60) {
    return {
      period: 'afternoon',
      label: 'Afternoon Operations (15:00–18:00)',
    };
  }
  return {
    period: 'evening',
    label: 'Evening Prime-Time Operations (18:00–23:00)',
  };
}

/**
 * Adds candidate starts at this package's actual reserved cadence in both directions
 * from an availability boundary. A 30-minute flight therefore uses 45-minute steps,
 * a 60-minute flight uses 75-minute steps, and so on. Bookings contribute their
 * start/end boundaries, so the grid reconnects exactly at the preceding turnaround
 * rather than remaining tied to a separate, fixed 75-minute display grid.
 */
function addForwardReservedCadenceStarts(
  candidates: Set<number>,
  anchorMinutes: number,
  reservedDuration: number,
  config: Pick<DayOperatingConfig, 'openMinutes' | 'closeMinutes'>
): void {
  for (let start = anchorMinutes; start + reservedDuration <= config.closeMinutes; start += reservedDuration) {
    if (start >= config.openMinutes) candidates.add(start);
  }
}

function addBackwardReservedCadenceStarts(
  candidates: Set<number>,
  anchorMinutes: number,
  reservedDuration: number,
  config: Pick<DayOperatingConfig, 'openMinutes' | 'closeMinutes'>
): void {
  for (let start = anchorMinutes - reservedDuration; start >= config.openMinutes; start -= reservedDuration) {
    if (start + reservedDuration <= config.closeMinutes) candidates.add(start);
  }
}

/**
 * Generates the smart Kantorovich time-slot grid for a given date and requested flight duration.
 * Incorporates:
 * - T_reserved = T_play + 15 min
 * - Package-specific departure cadence: 30m → 45m, 45m → 60m,
 *   60m → 75m, 90m → 105m, 120m → 150m
 * - Cadence reconnection at each booked interval and at the operating-day close
 * - Friday 09:00-16:30 and Saturday 19:00-24:00 operating windows
 * - 150-minute block Smart Pairing (e.g. 30m at 18:00 -> highlights 18:45 for 90m)
 * - Anti-Gap Zero-Waste protection (disables slots that create 15m/30m/un-tileable orphan windows)
 * - Discounted Promotion rule (45m is sold Sunday–Tuesday before 18:00 only;
 *   switches 90m from 850 ILS to 950 ILS after 18:00 & Sat)
 */
export function generateKantorovichSlots(
  dateString: string,
  durationMinutes: number,
  existingBookings: Booking[]
): FlightSlot[] {
  const config = getDayOperatingConfig(dateString);
  const reservedDuration = getReservedMinutesForFlight(durationMinutes);
  const isPromoDay = is45MinutePromoDay(dateString);

  // Convert active bookings for this date into reserved intervals [startMin, reservedEndMin]
  const bookedIntervals = existingBookings
    .filter((b) => b.bookingDate === dateString && b.status !== 'cancelled')
    .map((b) => {
      const startMin = timeToMinutes(b.startTime);
      const flightEndMin = timeToMinutes(b.endTime);
      const flightDur = b.durationMinutes || Math.max(30, flightEndMin - startMin);
      const resEndMin = startMin + getReservedMinutesForFlight(flightDur);
      return {
        booking: b,
        startMin,
        endMin: resEndMin,
        flightDur,
        reservedDur: resEndMin - startMin,
      };
    })
    .sort((a, b) => a.startMin - b.startMin);

  const candidateStarts = new Set<number>();

  // The day opening is the primary cadence anchor. On an empty weekday a 30-minute
  // service begins 10:00, 10:45, 11:30 … because each departure reserves 45 minutes.
  addForwardReservedCadenceStarts(candidateStarts, config.openMinutes, reservedDuration, config);

  // Add a closing-aligned candidate so a valid final mission is not discarded solely
  // because the operating window is not an exact multiple of this package's reservation.
  candidateStarts.add(config.closeMinutes - reservedDuration);

  // Re-anchor on both sides of every actual reservation. This exposes the first
  // bookable departure after turnaround and the latest fitting departure before a
  // confirmed mission, while the checks below still reject collisions and dead gaps.
  for (const booking of bookedIntervals) {
    addBackwardReservedCadenceStarts(candidateStarts, booking.startMin, reservedDuration, config);
    addForwardReservedCadenceStarts(candidateStarts, booking.endMin, reservedDuration, config);
  }

  // Standard 150-minute constructor block boundaries for smart-pairing detection
  const constructor150Blocks = config.isSaturday
    ? [
        { start: 19 * 60, end: 21 * 60 + 30 },
        { start: 21 * 60 + 30, end: 24 * 60 },
      ]
    : config.isFriday
    ? [
        { start: 9 * 60, end: 11 * 60 + 30 },
        { start: 11 * 60 + 30, end: 14 * 60 },
        { start: 14 * 60, end: 16 * 60 + 30 },
      ]
    : [
        { start: 10 * 60, end: 12 * 60 + 30 },
        { start: 12 * 60 + 30, end: 15 * 60 },
        { start: 18 * 60, end: 20 * 60 + 30 },
        { start: 20 * 60 + 30, end: 23 * 60 },
      ];

  const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);
  const slots: FlightSlot[] = [];

  for (const startMin of sortedStarts) {
    const flightEndMin = startMin + durationMinutes;
    const reservedEndMin = startMin + reservedDuration;
    const startTimeStr = minutesToTime(startMin);
    const endTimeStr = minutesToTime(flightEndMin);
    const reservedEndTimeStr = minutesToTime(reservedEndMin);

    const { period, label } = getBlockMetadata(startMin, config);
    const pricing = getKantorovichPricing(durationMinutes, startMin, config.isSaturday);

    // 1. Check if slot exceeds facility closing time.
    if (reservedEndMin > config.closeMinutes) {
      continue;
    }

    // 2. The discounted 45-minute promotion only runs Sunday–Tuesday, before 18:00.
    // Keep closed candidate departures in the result for diagnostics and the zero-slots UX.
    if (durationMinutes === 45 && !isPromoDay) {
      slots.push({
        id: `slot-${dateString}-${startTimeStr}`,
        date: dateString,
        startTime: startTimeStr,
        endTime: endTimeStr,
        reservedEndTime: reservedEndTimeStr,
        durationMinutes,
        totalReservedMinutes: reservedDuration,
        available: false,
        blockPeriod: period,
        blockLabel: label,
        isPrimeTime: pricing.isPrimeTime,
        dynamicPriceIls: pricing.dynamicPriceIls,
        basePriceIls: pricing.basePriceIls,
        yieldPerMinIls: pricing.yieldPerMinIls,
        disabledReason: 'promo_days_only',
        disabledNote: 'Discounted 45-minute promotion (₪490) is available Sunday–Tuesday only.',
      });
      continue;
    }

    if (durationMinutes === 45 && pricing.isPrimeTime) {
      slots.push({
        id: `slot-${dateString}-${startTimeStr}`,
        date: dateString,
        startTime: startTimeStr,
        endTime: endTimeStr,
        reservedEndTime: reservedEndTimeStr,
        durationMinutes,
        totalReservedMinutes: reservedDuration,
        available: false,
        blockPeriod: period,
        blockLabel: label,
        isPrimeTime: true,
        dynamicPriceIls: pricing.dynamicPriceIls,
        basePriceIls: pricing.basePriceIls,
        yieldPerMinIls: pricing.yieldPerMinIls,
        disabledReason: 'daytime_only_promo',
        disabledNote: 'Discounted 45-minute promotion (₪490) is available before 18:00 only.',
      });
      continue;
    }

    // 3. Check collision with existing bookings
    const overlappingBooking = bookedIntervals.find(
      (b) => startMin < b.endMin && reservedEndMin > b.startMin
    );

    if (overlappingBooking) {
      slots.push({
        id: `slot-${dateString}-${startTimeStr}`,
        date: dateString,
        startTime: startTimeStr,
        endTime: endTimeStr,
        reservedEndTime: reservedEndTimeStr,
        durationMinutes,
        totalReservedMinutes: reservedDuration,
        available: false,
        blockPeriod: period,
        blockLabel: label,
        isPrimeTime: pricing.isPrimeTime,
        dynamicPriceIls: pricing.dynamicPriceIls,
        basePriceIls: pricing.basePriceIls,
        yieldPerMinIls: pricing.yieldPerMinIls,
        disabledReason: 'booked',
        disabledNote: `Reserved (${minutesToTime(overlappingBooking.startMin)}–${minutesToTime(overlappingBooking.endMin)} incl. 15m prep)`,
      });
      continue;
    }

    // 4. Anti-Gap Zero-Waste Validation (Rule #1 of Kantorovich):
    // Only real reservations and the operating window define capacity boundaries.
    // Display-era 75-minute block boundaries must never hide a duration-valid slot.
    let prevBoundary = config.openMinutes;
    for (const b of bookedIntervals) {
      if (b.endMin <= startMin && b.endMin > prevBoundary) prevBoundary = b.endMin;
    }

    let nextBoundary = config.closeMinutes;
    for (const b of bookedIntervals) {
      if (b.startMin >= reservedEndMin && b.startMin < nextBoundary) nextBoundary = b.startMin;
    }

    const gapBefore = startMin - prevBoundary;
    const gapAfter = nextBoundary - reservedEndMin;

    // Judge each gap by where it starts, as evaluateDailyEfficiency does: a daytime departure
    // can still leave a prime-time gap after it, which only prime-time blocks may fill.
    const validBefore = canTileIntervalZeroWaste(
      gapBefore,
      config.isSaturday || prevBoundary >= 18 * 60,
      isPromoDay
    );
    const validAfter = canTileIntervalZeroWaste(
      gapAfter,
      config.isSaturday || reservedEndMin >= 18 * 60,
      isPromoDay
    );

    if (!validBefore || !validAfter) {
      const badGap = !validBefore ? gapBefore : gapAfter;
      const suggestedStart = !validBefore
        ? prevBoundary
        : Math.max(prevBoundary, nextBoundary - reservedDuration);
      const suggested = minutesToTime(suggestedStart);
      const suggestedNext = minutesToTime(suggestedStart + reservedDuration);
      slots.push({
        id: `slot-${dateString}-${startTimeStr}`,
        date: dateString,
        startTime: startTimeStr,
        endTime: endTimeStr,
        reservedEndTime: reservedEndTimeStr,
        durationMinutes,
        totalReservedMinutes: reservedDuration,
        available: false,
        blockPeriod: period,
        blockLabel: label,
        isPrimeTime: pricing.isPrimeTime,
        dynamicPriceIls: pricing.dynamicPriceIls,
        basePriceIls: pricing.basePriceIls,
        yieldPerMinIls: pricing.yieldPerMinIls,
        disabledReason: 'orphan_gap',
        suggestedAlternativeTime: `${suggested} / ${suggestedNext}`,
        disabledNote: `Zero-Waste Lock: Leaves ${badGap}m dead window. Choose ${suggested} or ${suggestedNext}.`,
      });
      continue;
    }

    // 6. Smart Pairing & Recommendation Detection (Rule #2: 150-Minute Constructor)
    let smartRecommendation: FlightSlot['smartRecommendation'] = null;
    let recommendationNote: string | undefined;

    if (config.isFriday && startMin === 15 * 60 + 45 && durationMinutes <= 30) {
      smartRecommendation = 'friday_30m_closer';
      recommendationNote = 'Closes Friday at 16:30 with 0m waste (45m slot block)';
    } else {
      // Check if this slot completes a 150-minute constructor block alongside an existing booking
      for (const blk of constructor150Blocks) {
        if (startMin >= blk.start && reservedEndMin <= blk.end) {
          const bookingsInBlk = bookedIntervals.filter(
            (b) => b.startMin >= blk.start && b.endMin <= blk.end
          );
          const usedInBlk = bookingsInBlk.reduce((acc, b) => acc + b.reservedDur, 0);
          if (usedInBlk > 0 && usedInBlk + reservedDuration === 150) {
            smartRecommendation = 'optimal_150_pair';
            recommendationNote = `Smart 150m Pairing: Perfectly completes ${minutesToTime(blk.start)}–${minutesToTime(blk.end)} block with 0m waste!`;
            break;
          }
        }
      }

      if (!smartRecommendation && durationMinutes === 45 && isPromoDay && period === 'afternoon') {
        smartRecommendation = 'daytime_promo_fit';
        recommendationNote = 'Optimal 60m grid alignment in 15:00–18:00 afternoon window';
      } else if (!smartRecommendation && (gapBefore === 0 || gapAfter === 0)) {
        smartRecommendation = 'zero_waste_fit';
        recommendationNote = 'Zero-Waste aligned slot (includes +15m technical turnaround)';
      }
    }

    // Compute exact continuous pure flight minutes available from startMin until the next booking or facility close
    let nextHardStop = config.closeMinutes;
    for (const b of bookedIntervals) {
      if (b.startMin >= startMin && b.startMin < nextHardStop) {
        nextHardStop = b.startMin;
      }
    }
    const maxAvailableMinutes = longestMissionWithin(nextHardStop - startMin, durationMinutes);

    slots.push({
      id: `slot-${dateString}-${startTimeStr}`,
      date: dateString,
      startTime: startTimeStr,
      endTime: endTimeStr,
      reservedEndTime: reservedEndTimeStr,
      durationMinutes,
      totalReservedMinutes: reservedDuration,
      available: true,
      blockPeriod: period,
      blockLabel: label,
      isPrimeTime: pricing.isPrimeTime,
      dynamicPriceIls: pricing.dynamicPriceIls,
      basePriceIls: pricing.basePriceIls,
      yieldPerMinIls: pricing.yieldPerMinIls,
      smartRecommendation,
      recommendationNote,
      disabledReason: null,
      maxAvailableMinutes,
    });
  }

  return slots;
}

/**
 * Computes the Daily Efficiency Report & Gap Collision Alerts for the Admin Dashboard
 * per Part 2 Section 3 of `devux_devui.md`.
 */
export function evaluateDailyEfficiency(
  dateString: string,
  allBookings: Booking[]
): DailyEfficiencyReport {
  const config = getDayOperatingConfig(dateString);
  const isPromoDay = is45MinutePromoDay(dateString);
  const dayBookings = allBookings
    .filter((b) => b.bookingDate === dateString && b.status !== 'cancelled')
    .map((b) => {
      const startMin = timeToMinutes(b.startTime);
      const dur = b.durationMinutes || Math.max(30, timeToMinutes(b.endTime) - startMin);
      const resDur = getReservedMinutesForFlight(dur);
      return {
        booking: b,
        startMin,
        flightEndMin: startMin + dur,
        endMin: startMin + resDur,
        flightDur: dur,
        reservedDur: resDur,
      };
    })
    .sort((a, b) => a.startMin - b.startMin);

  let bookedMinutes = 0;
  let pureFlightMinutes = 0;
  let turnaroundMinutes = 0;
  let freeValidMinutes = 0;
  let orphanGapMinutes = 0;
  let actualRevenueIls = 0;

  const timelineBlocks: DailyScheduleBlock[] = [];
  const gapAlerts: GapCollisionAlert[] = [];

  let cursor = config.openMinutes;

  for (let i = 0; i < dayBookings.length; i++) {
    const item = dayBookings[i];
    actualRevenueIls += item.booking.totalIls || 0;

    // Check gap before this booking
    if (item.startMin > cursor) {
      const gap = item.startMin - cursor;
      const isPrime = config.isSaturday || cursor >= 18 * 60;
      const canTile = canTileIntervalZeroWaste(gap, isPrime, isPromoDay);

      if (!canTile) {
        orphanGapMinutes += gap;
        const lostRev = Math.min(450, Math.round(gap * 10));
        const recommendedStart = minutesToTime(cursor);
        const altShift = minutesToTime(cursor + 75 <= config.closeMinutes ? cursor + 75 : cursor);
        const msg = `Attention! Kantorovich Zero-Waste Rule violated: ${gap} min dead window (${minutesToTime(cursor)}–${minutesToTime(item.startMin)}, lost revenue up to ₪${lostRev}). Recommended to shift ${item.booking.bookingReference} start to ${recommendedStart}${altShift !== recommendedStart ? ` or ${altShift}` : ''}.`;

        gapAlerts.push({
          id: `gap-${dateString}-${cursor}`,
          gapStart: minutesToTime(cursor),
          gapEnd: minutesToTime(item.startMin),
          gapMinutes: gap,
          lostRevenueIls: lostRev,
          violatingBookingId: item.booking.id,
          violatingBookingRef: item.booking.bookingReference,
          recommendedShiftTime: recommendedStart,
          message: msg,
        });

        timelineBlocks.push({
          start: minutesToTime(cursor),
          end: minutesToTime(item.startMin),
          type: 'orphan_gap',
          minutes: gap,
          label: `DEAD WINDOW (${gap}m Orphan Gap)`,
          recommendedShiftTime: recommendedStart,
        });
      } else {
        freeValidMinutes += gap;
        timelineBlocks.push({
          start: minutesToTime(cursor),
          end: minutesToTime(item.startMin),
          type: 'free_valid',
          minutes: gap,
          label: `Available (${gap}m Valid Block)`,
        });
      }
    }

    // Add flight block
    pureFlightMinutes += item.flightDur;
    const turnMin = item.reservedDur - item.flightDur;
    turnaroundMinutes += turnMin;
    bookedMinutes += item.reservedDur;

    timelineBlocks.push({
      start: minutesToTime(item.startMin),
      end: minutesToTime(item.flightEndMin),
      type: 'booked',
      minutes: item.flightDur,
      booking: item.booking,
      label: `${item.booking.pilotName} (${item.flightDur}m Flight)`,
    });

    timelineBlocks.push({
      start: minutesToTime(item.flightEndMin),
      end: minutesToTime(item.endMin),
      type: 'turnaround',
      minutes: turnMin,
      booking: item.booking,
      label: `+${turnMin}m Tech Turnaround`,
    });

    cursor = Math.max(cursor, item.endMin);
  }

  // Trailing interval until closeMinutes
  if (cursor < config.closeMinutes) {
    const gap = config.closeMinutes - cursor;
    const isPrime = config.isSaturday || cursor >= 18 * 60;
    const canTile = canTileIntervalZeroWaste(gap, isPrime, isPromoDay);

    if (!canTile) {
      orphanGapMinutes += gap;
      const lostRev = Math.min(450, Math.round(gap * 10));
      const lastBooking = dayBookings[dayBookings.length - 1];
      const recommendedShift = lastBooking
        ? minutesToTime(Math.max(config.openMinutes, config.closeMinutes - lastBooking.reservedDur))
        : minutesToTime(cursor);

      gapAlerts.push({
        id: `gap-${dateString}-${cursor}`,
        gapStart: minutesToTime(cursor),
        gapEnd: minutesToTime(config.closeMinutes),
        gapMinutes: gap,
        lostRevenueIls: lostRev,
        violatingBookingId: lastBooking?.booking.id,
        violatingBookingRef: lastBooking?.booking.bookingReference,
        recommendedShiftTime: recommendedShift,
        message: `Attention! Kantorovich Zero-Waste Rule violated: ${gap} min trailing tail (${minutesToTime(cursor)}–${minutesToTime(config.closeMinutes)}, lost revenue up to ₪${lostRev}). Align preceding booking to ${recommendedShift}.`,
      });

      timelineBlocks.push({
        start: minutesToTime(cursor),
        end: minutesToTime(config.closeMinutes),
        type: 'orphan_gap',
        minutes: gap,
        label: `DEAD TAIL (${gap}m Orphan Window)`,
        recommendedShiftTime: recommendedShift,
      });
    } else {
      freeValidMinutes += gap;
      timelineBlocks.push({
        start: minutesToTime(cursor),
        end: minutesToTime(config.closeMinutes),
        type: 'free_valid',
        minutes: gap,
        label: `Available (${gap}m Valid Block)`,
      });
    }
  }

  // Projected max revenue if all remaining valid minutes are sold at ~9.38 ILS/min (7320 ILS / 780 min benchmark)
  const potentialAdditionalRevenue = Math.round(freeValidMinutes * 9.38);
  const projectedMaxRevenueIls = actualRevenueIls + potentialAdditionalRevenue;
  const potentialLostRevenueIls = gapAlerts.reduce((acc, a) => acc + a.lostRevenueIls, 0);

  const usableFund = config.totalFundMinutes - orphanGapMinutes;
  const efficiencyPercent = Math.round((usableFund / config.totalFundMinutes) * 100);

  return {
    date: dateString,
    dayOfWeek: config.dayOfWeek,
    operatingWindow: config.operatingWindow,
    totalFundMinutes: config.totalFundMinutes,
    bookedMinutes,
    pureFlightMinutes,
    turnaroundMinutes,
    freeValidMinutes,
    orphanGapMinutes,
    efficiencyPercent,
    actualRevenueIls,
    projectedMaxRevenueIls,
    potentialLostRevenueIls,
    isZeroWasteCompliant: orphanGapMinutes === 0,
    gapAlerts,
    timelineBlocks,
  };
}

/**
 * Projects the admin efficiency report onto what the public booking page may see:
 * capacity figures and block geometry only. Booking objects, pilot names in labels,
 * gap alerts (which cite booking references) and revenue figures are dropped.
 */
export function toPublicCapacityReport(report: DailyEfficiencyReport): PublicCapacityReport {
  return {
    date: report.date,
    dayOfWeek: report.dayOfWeek,
    operatingWindow: report.operatingWindow,
    totalFundMinutes: report.totalFundMinutes,
    bookedMinutes: report.bookedMinutes,
    pureFlightMinutes: report.pureFlightMinutes,
    turnaroundMinutes: report.turnaroundMinutes,
    freeValidMinutes: report.freeValidMinutes,
    orphanGapMinutes: report.orphanGapMinutes,
    efficiencyPercent: report.efficiencyPercent,
    isZeroWasteCompliant: report.isZeroWasteCompliant,
    timelineBlocks: report.timelineBlocks.map(({ start, end, type, minutes }) => ({ start, end, type, minutes })),
  };
}

/**
 * Closes departures that have already left by Israel time. Slot generation is a pure
 * function of the day's bookings; the caller supplies the clock.
 */
export function closeDepartedSlots(slots: FlightSlot[], now: Date): FlightSlot[] {
  return slots.map((slot) =>
    slot.available && hasDeparted(slot.date, slot.startTime, now)
      ? {
          ...slot,
          available: false,
          disabledReason: 'departed',
          disabledNote: 'This departure has already left.',
          smartRecommendation: null,
        }
      : slot
  );
}
