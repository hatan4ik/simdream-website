import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlightSlot } from '@/types';
import { closeDepartedSlots, generateKantorovichSlots, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import { hasDeparted, israelMinutesNow, israelToday } from '@/lib/scheduler/israel-clock';
import { ENGINE_DURATIONS, WEEKDAY_DATES, makeBooking } from './_support/scheduler';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Israel's UTC offset between transitions (tzdata: DST from 02:00 on the Friday before the
 * last Sunday of March to 02:00 on the last Sunday of October). Fixed arithmetic gives an
 * oracle that shares no code path with the Intl-based implementation.
 */
const ISRAEL_PERIODS = [
  { start: Date.UTC(2026, 2, 27, 0), end: Date.UTC(2026, 9, 24, 23), offsetHours: 3 },
  { start: Date.UTC(2026, 9, 24, 23), end: Date.UTC(2027, 2, 26, 0), offsetHours: 2 },
  { start: Date.UTC(2027, 2, 26, 0), end: Date.UTC(2027, 9, 30, 23), offsetHours: 3 },
  { start: Date.UTC(2027, 9, 30, 23), end: Date.UTC(2028, 2, 24, 0), offsetHours: 2 },
] as const;

interface WallClock {
  date: string;
  time: string;
  minutes: number;
}

function israelWallClock(instant: Date): WallClock {
  const ms = instant.getTime();
  const period = ISRAEL_PERIODS.find(({ start, end }) => ms >= start && ms < end);
  if (!period) throw new Error(`No Israel offset known for ${instant.toISOString()}`);
  const shifted = new Date(ms + period.offsetHours * HOUR_MS).toISOString();
  const time = shifted.slice(11, 16);
  return { date: shifted.slice(0, 10), time, minutes: timeToMinutes(time) };
}

const instantArb = fc
  .integer({ min: ISRAEL_PERIODS[0].start, max: ISRAEL_PERIODS[ISRAEL_PERIODS.length - 1].end - 1 })
  .map((ms) => new Date(ms));

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Calendar date on the process's own clock, which follows the stubbed TZ. */
const localDate = (instant: Date) =>
  `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;

describe('israelToday and israelMinutesNow', () => {
  const INSTANTS: readonly [label: string, iso: string, date: string, minutes: number][] = [
    ['a winter midday', '2026-11-01T10:30:00Z', '2026-11-01', 12 * 60 + 30],
    ['just after Israel midnight, still the previous day in UTC', '2026-11-01T22:30:00Z', '2026-11-02', 30],
    ['Israel midnight on New Year', '2026-12-31T22:00:00Z', '2027-01-01', 0],
    ['the last minute of a summer day', '2027-07-15T20:59:00Z', '2027-07-15', 23 * 60 + 59],
    ['the first 01:30 of the fall-back (IDT)', '2026-10-24T22:30:00Z', '2026-10-25', 90],
    ['the repeated 01:30 of the fall-back (IST)', '2026-10-24T23:30:00Z', '2026-10-25', 90],
    ['the first minute after the spring-forward gap', '2027-03-26T00:00:00Z', '2027-03-26', 3 * 60],
  ];

  // Each zone pairs with an instant where its local calendar date differs from Israel's.
  describe.each([
    { zone: 'UTC', divergent: '2026-11-01T22:30:00Z', zoneDate: '2026-11-01', israelDate: '2026-11-02' },
    { zone: 'America/Los_Angeles', divergent: '2026-11-01T22:30:00Z', zoneDate: '2026-11-01', israelDate: '2026-11-02' },
    { zone: 'Pacific/Kiritimati', divergent: '2026-11-01T10:30:00Z', zoneDate: '2026-11-02', israelDate: '2026-11-01' },
  ])('with the server clock in $zone', ({ zone, divergent, zoneDate, israelDate }) => {
    beforeEach(() => {
      vi.stubEnv('TZ', zone);
    });

    it('reports the Israel date where the server date differs', () => {
      const instant = new Date(divergent);
      expect(localDate(instant)).toBe(zoneDate);
      expect(israelToday(instant)).toBe(israelDate);
    });

    it.each(INSTANTS)('reads %s on the Israel wall clock', (_label, iso, date, minutes) => {
      const instant = new Date(iso);
      expect(israelToday(instant)).toBe(date);
      expect(israelMinutesNow(instant)).toBe(minutes);
    });

    it('matches the fixed-offset Israel clock for arbitrary instants', () => {
      fc.assert(
        fc.property(instantArb, (instant) => {
          const expected = israelWallClock(instant);
          expect(israelToday(instant)).toBe(expected.date);
          expect(israelMinutesNow(instant)).toBe(expected.minutes);
        }),
        { numRuns: 300 }
      );
    });
  });

  it('reads the real clock when no instant is given', () => {
    vi.useFakeTimers({ now: new Date('2026-11-05T16:45:00Z'), toFake: ['Date'] });
    expect(israelToday()).toBe('2026-11-05');
    expect(israelMinutesNow()).toBe(18 * 60 + 45);
  });
});

describe('hasDeparted', () => {
  // 2026-11-06T12:00Z is Friday 14:00 in Israel (IST, UTC+2).
  const AT_14_00 = '2026-11-06T12:00:00Z';

  it.each([
    ['departs at the exact current minute', AT_14_00, '2026-11-06', '14:00', true],
    ['departed earlier the same day', AT_14_00, '2026-11-06', '09:00', true],
    ['departs one minute from now', AT_14_00, '2026-11-06', '14:01', false],
    ['departs in one minute when the clock reads 13:59', '2026-11-06T11:59:00Z', '2026-11-06', '14:00', false],
    ['departs next minute while the seconds run out', '2026-11-06T12:00:59.999Z', '2026-11-06', '14:01', false],
    ['was on an earlier date, even late at night', AT_14_00, '2026-11-05', '23:59', true],
    ['was in an earlier year', AT_14_00, '2025-12-31', '23:00', true],
    ['is on a later date, even at midnight', AT_14_00, '2026-11-07', '00:00', false],
    ['is in a later year', AT_14_00, '2027-01-01', '00:00', false],
    ['was yesterday once Israel passes midnight but UTC has not', '2026-11-06T22:30:00Z', '2026-11-06', '23:59', true],
    ['departed after Israel midnight while UTC is still on the previous day', '2026-11-06T22:30:00Z', '2026-11-07', '00:15', true],
    ['departs later on the new Israel day while UTC is still on the previous day', '2026-11-06T22:30:00Z', '2026-11-07', '01:00', false],
    ['departs at 01:30 on the first 01:30 of the fall-back', '2026-10-24T22:30:00Z', '2026-10-25', '01:30', true],
    ['departs at 01:31 on the first 01:30 of the fall-back', '2026-10-24T22:30:00Z', '2026-10-25', '01:31', false],
    ['departs at 01:30 on the repeated 01:30 of the fall-back', '2026-10-24T23:30:00Z', '2026-10-25', '01:30', true],
    ['departs at 01:31 on the repeated 01:30 of the fall-back', '2026-10-24T23:30:00Z', '2026-10-25', '01:31', false],
    ['was the evening before the fall-back', '2026-10-24T23:30:00Z', '2026-10-24', '23:59', true],
  ])('treats a departure that %s correctly', (_label, iso, date, startTime, expected) => {
    expect(hasDeparted(date, startTime, new Date(iso))).toBe(expected);
  });

  it('equals "Israel wall-clock departure <= Israel wall-clock now" for arbitrary instants', () => {
    const caseArb = instantArb.chain((now) => {
      const clock = israelWallClock(now);
      return fc.record({
        now: fc.constant(now),
        date: fc.oneof(
          { arbitrary: fc.constant(clock.date), weight: 3 },
          { arbitrary: fc.integer({ min: -3, max: 3 }).map((days) => shiftDate(clock.date, days)), weight: 1 }
        ),
        startTime: fc.oneof(
          { arbitrary: fc.integer({ min: -2, max: 2 }).map((delta) => hhmm(Math.min(1439, Math.max(0, clock.minutes + delta)))), weight: 2 },
          { arbitrary: fc.integer({ min: 0, max: 1439 }).map(hhmm), weight: 1 }
        ),
      });
    });
    fc.assert(
      fc.property(caseArb, ({ now, date, startTime }) => {
        const clock = israelWallClock(now);
        expect(hasDeparted(date, startTime, now)).toBe(`${date}T${startTime}` <= `${clock.date}T${clock.time}`);
      }),
      { numRuns: 1000 }
    );
  });

  it('decides by Israel time when the server runs in Pacific/Kiritimati', () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati');
    // 12:30 on 2 November in Kiritimati, but only 00:30 in Israel.
    const now = new Date('2026-11-01T22:30:00Z');
    expect(localDate(now)).toBe('2026-11-02');
    expect(hasDeparted('2026-11-02', '10:00', now)).toBe(false);
    expect(hasDeparted('2026-11-02', '00:30', now)).toBe(true);
  });

  it('decides by Israel time when the server runs in America/Los_Angeles', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    // 12:30 on 1 November in Los Angeles, but already 22:30 in Israel.
    const now = new Date('2026-11-01T20:30:00Z');
    expect(localDate(now)).toBe('2026-11-01');
    expect(hasDeparted('2026-11-01', '21:45', now)).toBe(true);
    expect(hasDeparted('2026-11-01', '22:31', now)).toBe(false);
  });
});

describe('closeDepartedSlots', () => {
  const CUTOFF = 14 * 60;
  const DEPARTED_FIELDS = {
    available: false,
    disabledReason: 'departed',
    disabledNote: 'This departure has already left.',
    smartRecommendation: null,
  } as const;

  /** Israel 14:00 on the given winter date (IST, UTC+2). */
  const at1400 = (date: string) => new Date(`${date}T12:00:00Z`);
  const startsBy = (slot: FlightSlot, minutes: number) => timeToMinutes(slot.startTime) <= minutes;

  describe.each([
    { day: 'Sunday', date: WEEKDAY_DATES.sunday },
    { day: 'Friday', date: WEEKDAY_DATES.friday },
  ])('on $day at 14:00 Israel time', ({ date }) => {
    it.each(ENGINE_DURATIONS)('closes every %i-minute slot starting at or before 14:00 and leaves later ones untouched', (duration) => {
      const before = generateKantorovichSlots(date, duration, []);
      const after = closeDepartedSlots(before, at1400(date));

      const openedBefore = before.filter((slot) => slot.available && startsBy(slot, CUTOFF));
      expect(openedBefore.length).toBeGreaterThan(0);

      expect(after.map((slot) => slot.id)).toEqual(before.map((slot) => slot.id));
      expect(after.filter((slot) => startsBy(slot, CUTOFF) && slot.available)).toEqual([]);
      expect(after.filter((slot) => openedBefore.some((open) => open.id === slot.id))).toEqual(
        openedBefore.map((slot) => ({ ...slot, ...DEPARTED_FIELDS }))
      );
      expect(after.filter((slot) => !startsBy(slot, CUTOFF))).toEqual(before.filter((slot) => !startsBy(slot, CUTOFF)));
    });
  });

  it('closes the Friday 14:00 departure at exactly 14:00 but not at 13:59', () => {
    const date = WEEKDAY_DATES.friday;
    const slots = generateKantorovichSlots(date, 60, []);
    expect(slots.find((slot) => slot.startTime === '14:00')?.available).toBe(true);

    const atCutoff = closeDepartedSlots(slots, at1400(date)).find((slot) => slot.startTime === '14:00');
    const minuteBefore = closeDepartedSlots(slots, new Date(`${date}T11:59:00Z`)).find((slot) => slot.startTime === '14:00');

    expect(atCutoff).toMatchObject(DEPARTED_FIELDS);
    expect(minuteBefore).toEqual(slots.find((slot) => slot.startTime === '14:00'));
  });

  it('keeps the original reason of a past slot that was already closed', () => {
    const date = WEEKDAY_DATES.sunday;
    const bookings = [makeBooking({ bookingDate: date, startTime: '11:15', endTime: '12:15', durationMinutes: 60 })];
    const before = generateKantorovichSlots(date, 60, bookings);
    expect(before.find((slot) => slot.startTime === '11:15')).toMatchObject({ available: false, disabledReason: 'booked' });

    const after = closeDepartedSlots(before, at1400(date));
    expect(after.find((slot) => slot.startTime === '11:15')).toEqual(before.find((slot) => slot.startTime === '11:15'));
  });

  it('leaves every slot of a later date unchanged', () => {
    const before = generateKantorovichSlots(WEEKDAY_DATES.monday, 60, []);
    expect(closeDepartedSlots(before, at1400(WEEKDAY_DATES.sunday))).toEqual(before);
  });

  it('closes every open slot of an earlier date as departed', () => {
    const before = generateKantorovichSlots(WEEKDAY_DATES.sunday, 60, []);
    const after = closeDepartedSlots(before, new Date(`${WEEKDAY_DATES.monday}T06:00:00Z`));
    expect(after.filter((slot) => slot.available)).toEqual([]);
    expect(after.filter((slot) => slot.disabledReason === 'departed').map((slot) => slot.id)).toEqual(
      before.filter((slot) => slot.available).map((slot) => slot.id)
    );
  });

  it('does not mutate the slots it is given', () => {
    const before = generateKantorovichSlots(WEEKDAY_DATES.sunday, 60, []);
    const snapshot = structuredClone(before);
    closeDepartedSlots(before, at1400(WEEKDAY_DATES.sunday));
    expect(before).toEqual(snapshot);
  });

  it('uses Israel time when the server runs in Pacific/Kiritimati', () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati');
    // 12:30 on Monday in Kiritimati is 00:30 on Monday in Israel: nothing has left yet.
    const before = generateKantorovichSlots(WEEKDAY_DATES.monday, 60, []);
    expect(closeDepartedSlots(before, new Date('2026-11-01T22:30:00Z'))).toEqual(before);
  });

  it('keeps exactly the open slots that start after the Israel minute, for arbitrary moments in the week', () => {
    const weekStart = Date.parse(`${WEEKDAY_DATES.sunday}T00:00:00+02:00`);
    const momentArb = fc.record({
      offsetMinutes: fc.integer({ min: 0, max: 7 * 24 * 60 - 1 }),
      date: fc.constantFrom(...Object.values(WEEKDAY_DATES)),
      duration: fc.constantFrom(...ENGINE_DURATIONS),
    });
    fc.assert(
      fc.property(momentArb, ({ offsetMinutes, date, duration }) => {
        const now = new Date(weekStart + offsetMinutes * 60_000);
        const clock = israelWallClock(now);
        const before = generateKantorovichSlots(date, duration, []);
        const stillOpen = before.filter(
          (slot) => slot.available && (date > clock.date || (date === clock.date && timeToMinutes(slot.startTime) > clock.minutes))
        );
        expect(closeDepartedSlots(before, now).filter((slot) => slot.available)).toEqual(stillOpen);
      }),
      { numRuns: 300 }
    );
  });
});
