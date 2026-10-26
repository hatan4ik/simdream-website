import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { BookingStatus, FlightSlot } from '@/types';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  TURNAROUND_MINUTES,
  canTileIntervalZeroWaste,
  evaluateDailyEfficiency,
  generateKantorovichSlots,
  getDayOperatingConfig,
  getKantorovichPricing,
  getReservedMinutesForFlight,
  minutesToTime,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';
import { calculateMissionManifest } from '@/lib/scheduler/mission-calculator';
import {
  ENGINE_DURATIONS,
  WEEKDAY_DATES,
  bookEngineOfferedSlots,
  bookingStepsArb,
  dateArb,
  dateWithWeekdayArb,
  liveIntervals,
  makeBooking,
  nextHardStop,
  overlaps,
  reservedInterval,
} from './_support/scheduler';

const PRIME_TIME_START = 18 * 60;
const RUNS = { numRuns: 200 };

const availableStarts = (slots: FlightSlot[]) => slots.filter((slot) => slot.available).map((slot) => slot.startTime);
const slotAt = (slots: FlightSlot[], startTime: string) => slots.find((slot) => slot.startTime === startTime);

describe('time helpers', () => {
  it('round-trips every minute of the day through HH:mm', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 24 * 60 }), (minutes) => {
        expect(timeToMinutes(minutesToTime(minutes))).toBe(minutes);
      })
    );
  });

  it('round-trips every valid HH:mm string', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }), (hour, minute) => {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        expect(minutesToTime(timeToMinutes(time))).toBe(time);
      })
    );
  });

  it.each([
    [0, '00:00'],
    [65, '01:05'],
    [15 * 60 + 15, '15:15'],
    [24 * 60, '24:00'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(minutesToTime(minutes)).toBe(expected);
  });
});

describe('getReservedMinutesForFlight', () => {
  it.each([
    [20, 45],
    [30, 45],
    [45, 60],
    [60, 75],
    [90, 105],
    [120, 150],
    [240, 255],
  ])('reserves exactly the documented capacity for a %i-minute flight (%i minutes)', (flight, reserved) => {
    expect(getReservedMinutesForFlight(flight)).toBe(reserved);
  });

  it('adds exactly the 15-minute turnaround to every other flight length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 31, max: 600 }).filter((minutes) => minutes !== 120 && minutes !== 240),
        (minutes) => {
          expect(getReservedMinutesForFlight(minutes)).toBe(minutes + TURNAROUND_MINUTES);
        }
      )
    );
  });

  it('never reserves less than the flight plus the turnaround', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 600 }), (minutes) => {
        expect(getReservedMinutesForFlight(minutes)).toBeGreaterThanOrEqual(minutes + TURNAROUND_MINUTES);
      })
    );
  });
});

describe('getDayOperatingConfig', () => {
  it.each([
    ['sunday', 0, '10:00', '23:00', 780],
    ['monday', 1, '10:00', '23:00', 780],
    ['tuesday', 2, '10:00', '23:00', 780],
    ['wednesday', 3, '10:00', '23:00', 780],
    ['thursday', 4, '10:00', '23:00', 780],
    ['friday', 5, '09:00', '16:00', 420],
    ['saturday', 6, '19:00', '24:00', 300],
  ] as const)('opens %s (day %i) from %s to %s, %i minutes', (day, dayOfWeek, open, close, fund) => {
    const config = getDayOperatingConfig(WEEKDAY_DATES[day]);
    expect(config).toMatchObject({
      dayOfWeek,
      openMinutes: timeToMinutes(open),
      closeMinutes: timeToMinutes(close),
      totalFundMinutes: fund,
      isFriday: dayOfWeek === 5,
      isSaturday: dayOfWeek === 6,
    });
  });

  it('resolves the calendar weekday of any date and a fund equal to the window length', () => {
    fc.assert(
      fc.property(dateWithWeekdayArb, ({ date, weekday }) => {
        const config = getDayOperatingConfig(date);
        expect(config.dayOfWeek).toBe(weekday);
        expect(config.closeMinutes - config.openMinutes).toBe(config.totalFundMinutes);
      })
    );
  });
});

describe('canTileIntervalZeroWaste', () => {
  // Daytime blocks {45, 60, 75, 105, 150} reach every multiple of 15 from 45;
  // prime-time blocks {45, 75, 105, 150} reach all of them except 60.
  const daytimeTileable = (gap: number) => gap === 0 || (gap >= 45 && gap % 15 === 0);
  const primeTileable = (gap: number) => daytimeTileable(gap) && gap !== 60;

  it('tiles a daytime gap exactly when it is zero or a multiple of 15 of at least 45 minutes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_500 }), (gap) => {
        expect(canTileIntervalZeroWaste(gap, false)).toBe(daytimeTileable(gap));
      }),
      { numRuns: 500 }
    );
  });

  it('tiles a prime-time gap the same way except for the forbidden 60-minute promo block', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_500 }), (gap) => {
        expect(canTileIntervalZeroWaste(gap, true)).toBe(primeTileable(gap));
      }),
      { numRuns: 500 }
    );
  });

  it('accepts a 60-minute gap in daytime and rejects it in prime time', () => {
    expect(canTileIntervalZeroWaste(60, false)).toBe(true);
    expect(canTileIntervalZeroWaste(60, true)).toBe(false);
  });

  it('keeps tileable gaps tileable when two of them are joined', () => {
    const tileableGap = fc.integer({ min: 0, max: 40 }).map((units) => units * 15);
    fc.assert(
      fc.property(tileableGap, tileableGap, fc.boolean(), (left, right, isPrimeTime) => {
        fc.pre(canTileIntervalZeroWaste(left, isPrimeTime) && canTileIntervalZeroWaste(right, isPrimeTime));
        expect(canTileIntervalZeroWaste(left + right, isPrimeTime)).toBe(true);
      })
    );
  });
});

describe('getKantorovichPricing', () => {
  it.each([
    [20, 250],
    [30, 450],
    [45, 490],
    [60, 690],
    [90, 850],
    [120, 1590],
  ])('charges the documented daytime tariff for a %i-minute flight (₪%i)', (duration, price) => {
    expect(getKantorovichPricing(duration, timeToMinutes('10:00'), false)).toMatchObject({
      basePriceIls: price,
      dynamicPriceIls: price,
      isPrimeTime: false,
    });
  });

  const startMinutes = fc.integer({ min: 0, max: 24 * 60 - 1 });

  it('marks prime time from 18:00 and for the whole of Saturday', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ENGINE_DURATIONS), startMinutes, fc.boolean(), (duration, start, isSaturday) => {
        expect(getKantorovichPricing(duration, start, isSaturday).isPrimeTime).toBe(
          isSaturday || start >= PRIME_TIME_START
        );
      })
    );
  });

  it('raises the 90-minute flight from ₪850 to ₪950 in prime time only', () => {
    fc.assert(
      fc.property(startMinutes, fc.boolean(), (start, isSaturday) => {
        const pricing = getKantorovichPricing(90, start, isSaturday);
        expect(pricing.basePriceIls).toBe(850);
        expect(pricing.dynamicPriceIls).toBe(isSaturday || start >= PRIME_TIME_START ? 950 : 850);
      })
    );
  });

  it('keeps every other tariff flat across the day', () => {
    fc.assert(
      fc.property(fc.constantFrom(20, 30, 45, 60, 120), startMinutes, fc.boolean(), (duration, start, isSaturday) => {
        const pricing = getKantorovichPricing(duration, start, isSaturday);
        expect(pricing.dynamicPriceIls).toBe(pricing.basePriceIls);
        expect(pricing).toEqual({
          ...getKantorovichPricing(duration, timeToMinutes('10:00'), false),
          isPrimeTime: isSaturday || start >= PRIME_TIME_START,
        });
      })
    );
  });

  it('reports the yield as the price per reserved minute, rounded to agorot', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ENGINE_DURATIONS), startMinutes, fc.boolean(), (duration, start, isSaturday) => {
        const pricing = getKantorovichPricing(duration, start, isSaturday);
        expect(pricing.yieldPerMinIls).toBe(
          Number((pricing.dynamicPriceIls / getReservedMinutesForFlight(duration)).toFixed(2))
        );
      })
    );
  });
});

describe('generateKantorovichSlots: invariants over engine-built days', () => {
  const scenario = fc.record({ date: dateArb, steps: bookingStepsArb, duration: fc.constantFrom(...ENGINE_DURATIONS) });

  it('offers only departures inside the operating window', () => {
    let checked = 0;
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const config = getDayOperatingConfig(date);
        const open = generateKantorovichSlots(date, duration, bookEngineOfferedSlots(date, steps)).filter(
          (slot) => slot.available
        );
        checked += open.length;
        const outside = open.filter((slot) => {
          const interval = reservedInterval(slot.startTime, duration);
          return interval.start < config.openMinutes || interval.end > config.closeMinutes;
        });
        expect(outside).toEqual([]);
      }),
      RUNS
    );
    expect(checked).toBeGreaterThan(200);
  });

  it('never offers a departure whose reserved interval overlaps a live booking', () => {
    let checked = 0;
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const bookings = bookEngineOfferedSlots(date, steps);
        const live = liveIntervals(bookings, date);
        const open = generateKantorovichSlots(date, duration, bookings).filter((slot) => slot.available);
        checked += open.length * live.length;
        const colliding = open.filter((slot) =>
          live.some((interval) => overlaps(interval, reservedInterval(slot.startTime, duration)))
        );
        expect(colliding).toEqual([]);
      }),
      RUNS
    );
    expect(checked).toBeGreaterThan(200);
  });

  it('keeps every booking built from offered slots free of overlaps', () => {
    let pairs = 0;
    fc.assert(
      fc.property(dateArb, bookingStepsArb, (date, steps) => {
        const live = liveIntervals(bookEngineOfferedSlots(date, steps), date);
        pairs += (live.length * (live.length - 1)) / 2;
        const clashes = live.flatMap((a, i) => live.slice(i + 1).filter((b) => overlaps(a, b)));
        expect(clashes).toEqual([]);
      }),
      RUNS
    );
    expect(pairs).toBeGreaterThan(200);
  });

  it('describes every slot with flight and reserved end times that match the buffer map', () => {
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const slots = generateKantorovichSlots(date, duration, bookEngineOfferedSlots(date, steps));
        expect(slots.length).toBeGreaterThan(0);
        for (const slot of slots) {
          const start = timeToMinutes(slot.startTime);
          expect(slot).toMatchObject({
            id: `slot-${date}-${slot.startTime}`,
            date,
            durationMinutes: duration,
            totalReservedMinutes: getReservedMinutesForFlight(duration),
            endTime: minutesToTime(start + duration),
            reservedEndTime: minutesToTime(start + getReservedMinutesForFlight(duration)),
          });
        }
      }),
      RUNS
    );
  });

  it('reports maxAvailableMinutes as the longest mission whose every shorter length still fits the window', () => {
    let checked = 0;
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const bookings = bookEngineOfferedSlots(date, steps);
        const open = generateKantorovichSlots(date, duration, bookings).filter((slot) => slot.available);
        checked += open.length;
        for (const slot of open) {
          const start = timeToMinutes(slot.startTime);
          const window = nextHardStop(bookings, date, start) - start;
          const max = slot.maxAvailableMinutes ?? 0;
          expect(max).toBeGreaterThanOrEqual(duration);
          // Every mission length the UI and checkout accept reserves within the window (UNIT-3)...
          for (let minutes = duration + 1; minutes <= max; minutes++) {
            expect(getReservedMinutesForFlight(minutes), `${minutes}m in a ${window}m window`).toBeLessThanOrEqual(window);
          }
          // ...and the limit is tight: one minute more would overrun it.
          expect(getReservedMinutesForFlight(max + 1)).toBeGreaterThan(window);
        }
      }),
      RUNS
    );
    expect(checked).toBeGreaterThan(200);
  });

  it('ignores cancelled bookings and bookings on other dates', () => {
    fc.assert(
      fc.property(scenario, dateArb, ({ date, steps, duration }, otherDate) => {
        fc.pre(otherDate !== date);
        const bookings = bookEngineOfferedSlots(date, steps);
        const live = bookings.filter((booking) => booking.status !== 'cancelled');
        const elsewhere = bookEngineOfferedSlots(otherDate, steps);
        expect(generateKantorovichSlots(date, duration, [...bookings, ...elsewhere])).toEqual(
          generateKantorovichSlots(date, duration, live)
        );
      }),
      RUNS
    );
  });

  it('adds orphan capacity only through the UNIT-2 path (a daytime block that runs past 18:00)', () => {
    // Pins the anti-gap rule everywhere else, so a new way of stranding minutes cannot hide behind UNIT-2.
    let checked = 0;
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const bookings = bookEngineOfferedSlots(date, steps);
        const before = evaluateDailyEfficiency(date, bookings).orphanGapMinutes;
        const open = generateKantorovichSlots(date, duration, bookings).filter((slot) => slot.available);
        checked += open.length;
        const stranding = open
          .filter((slot) => !(!slot.isPrimeTime && reservedInterval(slot.startTime, duration).end > PRIME_TIME_START))
          .filter(
            (slot) =>
              evaluateDailyEfficiency(date, [
                ...bookings,
                makeBooking({ bookingDate: date, startTime: slot.startTime, durationMinutes: duration }),
              ]).orphanGapMinutes > before
          )
          .map((slot) => `${duration}m at ${slot.startTime}`);
        expect(stranding).toEqual([]);
      }),
      RUNS
    );
    expect(checked).toBeGreaterThan(200);
  });

  it('leaves the existing bookings untouched', () => {
    fc.assert(
      fc.property(scenario, ({ date, steps, duration }) => {
        const bookings = bookEngineOfferedSlots(date, steps);
        const snapshot = structuredClone(bookings);
        generateKantorovichSlots(date, duration, bookings);
        expect(bookings).toEqual(snapshot);
      }),
      RUNS
    );
  });
});

describe('daytime promo (45 minutes)', () => {
  it('is never offered at or after 18:00 or on Saturday', () => {
    let prime = 0;
    fc.assert(
      fc.property(dateArb, bookingStepsArb, (date, steps) => {
        const { isSaturday } = getDayOperatingConfig(date);
        const primeSlots = generateKantorovichSlots(date, 45, bookEngineOfferedSlots(date, steps)).filter(
          (slot) => isSaturday || timeToMinutes(slot.startTime) >= PRIME_TIME_START
        );
        prime += primeSlots.length;
        for (const slot of primeSlots) {
          expect(slot).toMatchObject({ available: false, disabledReason: 'daytime_only_promo', isPrimeTime: true });
        }
      }),
      RUNS
    );
    expect(prime).toBeGreaterThan(100);
  });

  it('keeps the evening promo departures listed as unavailable instead of hiding them', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.sunday, 45, []);
    for (const time of ['18:00', '19:15', '20:30', '21:45']) {
      expect(slotAt(slots, time)).toMatchObject({ available: false, disabledReason: 'daytime_only_promo' });
    }
  });

  it('offers the promo on a 60-minute afternoon step on an open weekday', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.tuesday, 45, []);
    expect(availableStarts(slots)).toEqual(['10:00', '11:15', '12:30', '15:00', '16:00', '17:00']);
    expect(slotAt(slots, '16:00')?.smartRecommendation).toBe('daytime_promo_fit');
    // 13:45 + 60 reserved minutes would strand 15 minutes before the 15:00 block boundary.
    expect(slotAt(slots, '13:45')).toMatchObject({ available: false, disabledReason: 'orphan_gap' });
  });

  it('lists every Saturday promo departure as unavailable', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.saturday, 45, []);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.filter((slot) => slot.available || slot.disabledReason !== 'daytime_only_promo')).toEqual([]);
  });
});

describe('Friday window', () => {
  it('opens 09:00–16:00 on a 75-minute step with a 15:15 closer for entry flights', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.friday, 20, []);
    expect(availableStarts(slots)).toEqual(['09:00', '10:15', '11:30', '12:45', '14:00', '15:15']);
    expect(slotAt(slots, '15:15')).toMatchObject({
      available: true,
      reservedEndTime: '16:00',
      blockPeriod: 'friday_closer',
      smartRecommendation: 'friday_30m_closer',
    });
  });

  it('also offers the 15:15 closer to the legacy 30-minute flight', () => {
    expect(slotAt(generateKantorovichSlots(WEEKDAY_DATES.friday, 30, []), '15:15')?.available).toBe(true);
  });

  it.each([45, 60, 90, 120])('reserves the 15:15 closer away from %i-minute flights', (duration) => {
    expect(slotAt(generateKantorovichSlots(WEEKDAY_DATES.friday, duration, []), '15:15')).toMatchObject({
      available: false,
      disabledReason: 'friday_closer_30m_only',
    });
  });

  it.each([
    [60, ['09:00', '10:15', '11:30', '12:45', '14:00']],
    [90, ['09:00', '10:15', '11:30', '12:45']],
    [120, ['09:00', '10:15', '11:30', '12:45']],
  ])('offers %i-minute flights only where they close cleanly by 16:00', (duration, expected) => {
    expect(availableStarts(generateKantorovichSlots(WEEKDAY_DATES.friday, duration, []))).toEqual(expected);
  });

  it('keeps every Friday departure daytime, inside 09:00–16:00, with 15:15 only for entry flights', () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        bookingStepsArb,
        fc.constantFrom(...ENGINE_DURATIONS),
        (week, steps, duration) => {
          const date = new Date(Date.UTC(2026, 10, 6) + week * 7 * 86_400_000).toISOString().slice(0, 10);
          const open = generateKantorovichSlots(date, duration, bookEngineOfferedSlots(date, steps)).filter(
            (slot) => slot.available
          );
          checked += open.length;
          for (const slot of open) {
            const interval = reservedInterval(slot.startTime, duration);
            expect(slot.isPrimeTime).toBe(false);
            expect(interval.start).toBeGreaterThanOrEqual(timeToMinutes('09:00'));
            expect(interval.end).toBeLessThanOrEqual(timeToMinutes('16:00'));
            expect(slot.startTime === '15:15' && duration > 30).toBe(false);
          }
        }
      ),
      RUNS
    );
    expect(checked).toBeGreaterThan(100);
  });
});

describe('Saturday window', () => {
  it('opens only 19:00–24:00 and treats every departure as prime time', () => {
    let checked = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        bookingStepsArb,
        fc.constantFrom(...ENGINE_DURATIONS),
        (week, steps, duration) => {
          const date = new Date(Date.UTC(2026, 10, 7) + week * 7 * 86_400_000).toISOString().slice(0, 10);
          const slots = generateKantorovichSlots(date, duration, bookEngineOfferedSlots(date, steps));
          checked += slots.length;
          for (const slot of slots) {
            expect(slot).toMatchObject({ isPrimeTime: true, blockPeriod: 'saturday_prime' });
            expect(timeToMinutes(slot.startTime)).toBeGreaterThanOrEqual(timeToMinutes('19:00'));
          }
        }
      ),
      RUNS
    );
    expect(checked).toBeGreaterThan(100);
  });

  it('offers the 60-minute flight on the four Saturday departures', () => {
    expect(availableStarts(generateKantorovichSlots(WEEKDAY_DATES.saturday, 60, []))).toEqual([
      '19:00',
      '20:15',
      '21:30',
      '22:45',
    ]);
  });

  it('prices every Saturday 90-minute departure at the ₪950 prime-time tariff', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.saturday, 90, []);
    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots.map((slot) => slot.dynamicPriceIls))).toEqual(new Set([950]));
  });
});

describe('Sunday–Thursday window', () => {
  it('offers the 60-minute grid from 10:00 to 21:45 with prime time from 18:00', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.sunday, 60, []);
    expect(availableStarts(slots)).toEqual([
      '10:00',
      '11:15',
      '12:30',
      '13:45',
      '15:00',
      '18:00',
      '19:15',
      '20:30',
      '21:45',
    ]);
    expect(slots.filter((slot) => slot.isPrimeTime).map((slot) => slot.startTime)).toEqual([
      '18:00',
      '19:00',
      '19:15',
      '20:30',
      '21:45',
    ]);
  });

  it('locks starts that would strand an unsellable fragment and suggests an aligned time', () => {
    const slots = generateKantorovichSlots(WEEKDAY_DATES.sunday, 60, []);
    expect(slotAt(slots, '16:15')).toMatchObject({ available: false, disabledReason: 'orphan_gap' });
    expect(slotAt(slots, '19:00')).toMatchObject({
      available: false,
      disabledReason: 'orphan_gap',
      suggestedAlternativeTime: '18:00 / 19:15',
    });
  });

  it('marks a departure that collides with a booking as booked', () => {
    const date = WEEKDAY_DATES.monday;
    const slots = generateKantorovichSlots(date, 60, [
      makeBooking({ bookingDate: date, startTime: '11:15', durationMinutes: 60 }),
    ]);
    expect(slotAt(slots, '11:15')).toMatchObject({ available: false, disabledReason: 'booked' });
  });

  it('frees the slot again once its booking is cancelled', () => {
    const date = WEEKDAY_DATES.monday;
    const slots = generateKantorovichSlots(date, 60, [
      makeBooking({ bookingDate: date, startTime: '11:15', durationMinutes: 60, status: 'cancelled' }),
    ]);
    expect(slotAt(slots, '11:15')?.available).toBe(true);
  });
});

describe('scheduler known defects', () => {
  const sunday = WEEKDAY_DATES.sunday;

  it('offers the setup bookings used by the defect scenarios on an open Sunday', () => {
    expect(slotAt(generateKantorovichSlots(sunday, 20, []), '15:45')?.available).toBe(true);
    expect(slotAt(generateKantorovichSlots(sunday, 20, []), '17:15')?.available).toBe(true);
    const afterEntryFlight = [makeBooking({ bookingDate: sunday, startTime: '15:45', durationMinutes: 20 })];
    expect(slotAt(generateKantorovichSlots(sunday, 60, afterEntryFlight), '19:15')?.available).toBe(true);
    const setup = [...afterEntryFlight, makeBooking({ bookingDate: sunday, startTime: '19:15', durationMinutes: 60 })];
    expect(evaluateDailyEfficiency(sunday, setup).orphanGapMinutes).toBe(0);
  });

  it('never offers a departure that leaves an unsellable prime-time window (UNIT-2)', () => {
    // A 20m flight at 15:45 injects a 16:30 departure; a 90m flight there reserves until 18:15,
    // and the gap to a 19:15 flight is 60 minutes of prime time, which no prime-time block can fill.
    const bookings = [
      makeBooking({ bookingDate: sunday, startTime: '15:45', durationMinutes: 20 }),
      makeBooking({ bookingDate: sunday, startTime: '19:15', durationMinutes: 60 }),
    ];
    const strandingDepartures = ENGINE_DURATIONS.flatMap((duration) =>
      generateKantorovichSlots(sunday, duration, bookings)
        .filter((slot) => slot.available)
        .filter(
          (slot) =>
            evaluateDailyEfficiency(sunday, [
              ...bookings,
              makeBooking({ bookingDate: sunday, startTime: slot.startTime, durationMinutes: duration }),
            ]).orphanGapMinutes > 0
        )
        .map((slot) => `${duration}m at ${slot.startTime}`)
    );
    expect(strandingDepartures).toEqual([]);
  });

  it(
    'never lets an add-on mission that fits maxAvailableMinutes reserve past the next booking (UNIT-3)',
    () => {
      const bookings = [makeBooking({ bookingDate: sunday, startTime: '17:15', durationMinutes: 20 })];
      const timeExtending = FLIGHT_ADDONS.filter((addon) => addon.durationMinutes > 0);
      // One representative add-on selection per achievable extra-minutes total.
      const selectionsByMinutes = new Map<number, string[]>([[0, []]]);
      for (const addon of timeExtending) {
        for (const [minutes, ids] of [...selectionsByMinutes]) {
          const total = minutes + addon.durationMinutes;
          if (!selectionsByMinutes.has(total)) selectionsByMinutes.set(total, [...ids, addon.id]);
        }
      }
      const recreational = SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'recreational');

      const overruns = recreational.flatMap((pkg) =>
        generateKantorovichSlots(sunday, pkg.durationMinutes, bookings)
          .filter((slot) => slot.available)
          .flatMap((slot) =>
            [...selectionsByMinutes.values()].flatMap((selectedAddonIds) => {
              const manifest = calculateMissionManifest({ pkg, slot, selectedAddonIds, availableAddons: FLIGHT_ADDONS });
              if (manifest.totalDurationMinutes > manifest.maxAvailableMinutes) return [];
              const reserved = reservedInterval(slot.startTime, manifest.totalDurationMinutes);
              const limit = nextHardStop(bookings, sunday, reserved.start);
              return reserved.end > limit
                ? [`${pkg.id} at ${slot.startTime} + ${selectedAddonIds.join('+')} reserves until ${minutesToTime(reserved.end)}`]
                : [];
            })
          )
      );
      expect(overruns).toEqual([]);
    }
  );
});

describe('evaluateDailyEfficiency', () => {
  const engineDay = fc.record({ date: dateArb, steps: bookingStepsArb });

  it('accounts for every minute of the operating window exactly once', () => {
    fc.assert(
      fc.property(engineDay, ({ date, steps }) => {
        const report = evaluateDailyEfficiency(date, bookEngineOfferedSlots(date, steps));
        expect(report.bookedMinutes + report.freeValidMinutes + report.orphanGapMinutes).toBe(report.totalFundMinutes);
        expect(report.pureFlightMinutes + report.turnaroundMinutes).toBe(report.bookedMinutes);
        expect(report.totalFundMinutes).toBe(getDayOperatingConfig(date).totalFundMinutes);
      }),
      RUNS
    );
  });

  it('lays the timeline out contiguously from opening to closing', () => {
    fc.assert(
      fc.property(engineDay, ({ date, steps }) => {
        const config = getDayOperatingConfig(date);
        const blocks = evaluateDailyEfficiency(date, bookEngineOfferedSlots(date, steps)).timelineBlocks;
        expect(blocks.length).toBeGreaterThan(0);
        expect(blocks[0].start).toBe(minutesToTime(config.openMinutes));
        expect(blocks[blocks.length - 1].end).toBe(minutesToTime(config.closeMinutes));
        blocks.slice(1).forEach((block, index) => expect(block.start).toBe(blocks[index].end));
        blocks.forEach((block) => expect(block.minutes).toBe(timeToMinutes(block.end) - timeToMinutes(block.start)));
      }),
      RUNS
    );
  });

  const arbitraryDay = fc.record({
    date: dateArb,
    bookings: fc.array(
      fc.record({
        offset: fc.integer({ min: 0, max: 280 }),
        duration: fc.constantFrom(20, 45, 60, 90, 120),
        totalIls: fc.integer({ min: 0, max: 5_000 }),
        status: fc.constantFrom<BookingStatus>('confirmed', 'pending', 'completed', 'cancelled'),
      }),
      { maxLength: 8 }
    ),
  });

  it('keeps efficiency between 0 and 100 percent for any set of bookings', () => {
    fc.assert(
      fc.property(arbitraryDay, ({ date, bookings }) => {
        const { openMinutes } = getDayOperatingConfig(date);
        const report = evaluateDailyEfficiency(
          date,
          bookings.map((b) =>
            makeBooking({ bookingDate: date, startTime: minutesToTime(openMinutes + b.offset), durationMinutes: b.duration, status: b.status })
          )
        );
        expect(report.efficiencyPercent).toBeGreaterThanOrEqual(0);
        expect(report.efficiencyPercent).toBeLessThanOrEqual(100);
        expect(report.orphanGapMinutes).toBeLessThanOrEqual(report.totalFundMinutes);
      }),
      RUNS
    );
  });

  it('raises a capped gap alert exactly when orphan minutes exist', () => {
    fc.assert(
      fc.property(arbitraryDay, ({ date, bookings }) => {
        const { openMinutes } = getDayOperatingConfig(date);
        const report = evaluateDailyEfficiency(
          date,
          bookings.map((b) =>
            makeBooking({ bookingDate: date, startTime: minutesToTime(openMinutes + b.offset), durationMinutes: b.duration, status: b.status })
          )
        );
        const alertMinutes = report.gapAlerts.reduce((sum, alert) => sum + alert.gapMinutes, 0);
        const alertRevenue = report.gapAlerts.reduce((sum, alert) => sum + alert.lostRevenueIls, 0);
        expect(report.isZeroWasteCompliant).toBe(report.orphanGapMinutes === 0);
        expect(report.gapAlerts.length === 0).toBe(report.orphanGapMinutes === 0);
        expect(alertMinutes).toBe(report.orphanGapMinutes);
        expect(report.potentialLostRevenueIls).toBe(alertRevenue);
        expect(report.gapAlerts.filter((alert) => alert.lostRevenueIls > 450 || alert.lostRevenueIls < 0)).toEqual([]);
      }),
      RUNS
    );
  });

  it('counts revenue only from live bookings on the reported date', () => {
    fc.assert(
      fc.property(arbitraryDay, dateArb, ({ date, bookings }, otherDate) => {
        fc.pre(otherDate !== date);
        const { openMinutes } = getDayOperatingConfig(date);
        const sameDay = bookings.map((b) =>
          makeBooking({
            bookingDate: date,
            startTime: minutesToTime(openMinutes + b.offset),
            durationMinutes: b.duration,
            totalIls: b.totalIls,
            status: b.status,
          })
        );
        const elsewhere = sameDay.map((booking) => ({ ...booking, id: `${booking.id}-x`, bookingDate: otherDate }));
        const report = evaluateDailyEfficiency(date, [...sameDay, ...elsewhere]);
        const expected = sameDay
          .filter((booking) => booking.status !== 'cancelled')
          .reduce((sum, booking) => sum + booking.totalIls, 0);
        expect(report.actualRevenueIls).toBe(expected);
        expect(report.projectedMaxRevenueIls).toBeGreaterThanOrEqual(report.actualRevenueIls);
      }),
      RUNS
    );
  });

  it.each(Object.entries(WEEKDAY_DATES))('reports an empty %s as fully efficient and zero-waste', (_day, date) => {
    const report = evaluateDailyEfficiency(date, []);
    expect(report).toMatchObject({
      efficiencyPercent: 100,
      orphanGapMinutes: 0,
      bookedMinutes: 0,
      freeValidMinutes: report.totalFundMinutes,
      isZeroWasteCompliant: true,
      gapAlerts: [],
    });
  });

  it('flags a 30-minute dead window before a misaligned booking and prices the lost revenue', () => {
    const date = WEEKDAY_DATES.wednesday;
    const booking = makeBooking({ bookingDate: date, startTime: '10:30', durationMinutes: 60 });
    const report = evaluateDailyEfficiency(date, [booking]);
    expect(report).toMatchObject({ orphanGapMinutes: 30, efficiencyPercent: 96, isZeroWasteCompliant: false });
    expect(report.gapAlerts).toEqual([
      expect.objectContaining({
        gapStart: '10:00',
        gapEnd: '10:30',
        gapMinutes: 30,
        lostRevenueIls: 300,
        violatingBookingId: booking.id,
        recommendedShiftTime: '10:00',
      }),
    ]);
  });
});
