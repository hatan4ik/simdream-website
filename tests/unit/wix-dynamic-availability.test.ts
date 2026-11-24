import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWixBackedKantorovichSlots } from '@/lib/wix/availability-adapter';
import { wixBlockedBookings } from '@/lib/wix/wix-blocked-bookings';
import { generateKantorovichSlots, minutesToTime, timeToMinutes } from '@/lib/scheduler/kantorovich-engine';
import type { WixTimeSlot } from '@/lib/wix/bookings';

const provider = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/wix/birthday-pricing-config', () => ({ isWixBirthdayPricingProviderEnabled: () => provider.enabled }));

const DATE = '2026-11-24'; // a Tuesday; the Wix raster is "every 5 minutes"

// The slot engine drops starts that are already in the past on today's date. With a fixed DATE and the real
// clock this file passed only before the first slot of that day (CI after 09:00 Israel time failed on
// 2026-11-24) and would fail on every run after it. Pin the clock to a morning well before DATE. This is a
// beforeEach because tests/support/vitest.setup.ts restores real timers after every test.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-01T06:00:00Z'));
});
const OPEN = 9 * 60;
const LAST_START = 22 * 60 + 30;

/**
 * What Wix returns for a 60-minute service (75 reserved): every 5-minute start whose flight plus the
 * 15-minute turnaround clears every booking. `blocks` are the booked reservations [start, reservedEnd).
 */
function wixStartsFor(blocks: Array<[string, string]>, durationMinutes = 60): WixTimeSlot[] {
  const reserved = durationMinutes + 15;
  const out: WixTimeSlot[] = [];
  for (let start = OPEN; start <= LAST_START; start += 5) {
    const clear = blocks.every(([from, to]) => start + reserved <= timeToMinutes(from) || start >= timeToMinutes(to));
    if (clear) {
      out.push({
        localStartDate: `${DATE}T${minutesToTime(start)}:00`,
        localEndDate: `${DATE}T${minutesToTime(start + durationMinutes)}:00`,
        bookable: true,
      });
    }
  }
  return out;
}

const open = (slots: Array<{ startTime: string; available: boolean }>) =>
  slots.filter((slot) => slot.available).map((slot) => slot.startTime);

describe('Wix-backed availability re-anchors on the real bookings', () => {
  it('offers the first start 15 minutes after an add-on booking, instead of waiting for the next fixed-grid point', async () => {
    // 24 Nov on staging: one 80-minute mission (60 + Cold & Dark 20) at 12:45 reserves until 14:20.
    const slots = await getWixBackedKantorovichSlots(DATE, 60, wixStartsFor([['12:45', '14:20']]));
    const offered = open(slots);

    expect(offered).toContain('14:20'); // 14:05 end + 15 minutes
    expect(offered).toContain('11:30'); // the last start that still clears the 12:45 booking
    expect(offered).not.toContain('12:45');
    expect(offered).not.toContain('14:00');
  });

  it('never offers a start inside the booked window, or one Wix does not offer', async () => {
    const wix = wixStartsFor([['12:45', '14:20']]);
    const wixStarts = new Set(wix.map((slot) => slot.localStartDate.slice(11, 16)));
    const offered = open(await getWixBackedKantorovichSlots(DATE, 60, wix));

    for (const start of offered) expect(wixStarts.has(start), start).toBe(true);
    for (const start of offered) {
      const minute = timeToMinutes(start);
      expect(minute + 75 <= timeToMinutes('12:45') || minute >= timeToMinutes('14:20'), start).toBe(true);
    }
  });

  it('keeps the normal cadence in the open stretches of the day', async () => {
    const offered = open(await getWixBackedKantorovichSlots(DATE, 60, wixStartsFor([['12:45', '14:20']])));
    expect(offered).toEqual(expect.arrayContaining(['09:00', '10:15', '15:15', '16:30', '17:45', '19:00', '20:15', '21:30']));
  });

  it('re-anchors after a booking whose length is a multiple of 15, too', async () => {
    // 60 + X-Wind 15 = 75 minutes: reserved 12:45 until 14:15.
    const offered = open(await getWixBackedKantorovichSlots(DATE, 60, wixStartsFor([['12:45', '14:15']])));
    expect(offered).toContain('14:15');
  });

  it('lets a booking in the middle of the afternoon be followed and preceded closely', async () => {
    // Reserved 16:30 until 17:50: the day must offer 17:50 and the latest start that still fits before 16:30.
    const offered = open(await getWixBackedKantorovichSlots(DATE, 60, wixStartsFor([['16:30', '17:50']])));
    expect(offered).toContain('17:50');
    expect(offered).toContain('15:15'); // 15:15 + 75 = 16:30 exactly
  });

  it('leaves an empty day exactly as the fixed grid', async () => {
    const wix = wixStartsFor([]);
    const dynamic = open(await getWixBackedKantorovichSlots(DATE, 60, wix));
    const grid = open(generateKantorovichSlots(DATE, 60, []));
    const gridInsideWix = grid.filter((start) => wix.some((slot) => slot.localStartDate.endsWith(`T${start}:00`)));
    expect(dynamic).toEqual(gridInsideWix);
  });
});

describe('while the Bookings Pricing provider is active', () => {
  it('offers only fixed-grid starts, because the provider refuses every other start', async () => {
    provider.enabled = true;
    try {
      const offered = open(await getWixBackedKantorovichSlots(DATE, 60, wixStartsFor([['12:45', '14:20']])));
      expect(offered).not.toContain('14:20');
      expect(offered).toEqual(['09:00', '10:15', '11:30', '15:15', '16:30', '17:45', '19:00', '20:15', '21:30']);
    } finally {
      provider.enabled = false;
    }
  });
});

describe('wixBlockedBookings: the holes in Wix availability are the bookings', () => {
  const starts = (slots: WixTimeSlot[]) => slots.map((slot) => slot.localStartDate.slice(11, 16));

  it('finds nothing booked when Wix offers an unbroken run', () => {
    expect(wixBlockedBookings(DATE, 60, starts(wixStartsFor([])))).toEqual([]);
  });

  it('turns the hole after 11:30 into one reservation that ends at 14:20', () => {
    const [booking, ...rest] = wixBlockedBookings(DATE, 60, starts(wixStartsFor([['12:45', '14:20']])));
    expect(rest).toEqual([]);
    expect(booking.startTime).toBe('12:45'); // 11:30's reservation (75 min) ends where the booking starts
    expect(booking.durationMinutes).toBe(80); // 95 reserved: 80 flight + 15 turnaround, so 14:20 is its reserved end
    expect(booking.status).toBe('confirmed');
  });

  it('finds several bookings in one day', () => {
    const blocks = wixBlockedBookings(DATE, 60, starts(wixStartsFor([['10:15', '11:30'], ['16:30', '18:00']])));
    expect(blocks.map((block) => block.startTime)).toEqual(['10:15', '16:30']);
  });

  it('treats a day Wix has no start for as fully booked', () => {
    expect(wixBlockedBookings(DATE, 60, [])).toHaveLength(1);
  });

  it('holds the simulator from the opening when the first free start is late', () => {
    const late = starts(wixStartsFor([['09:00', '10:30']]));
    expect(wixBlockedBookings(DATE, 60, late)[0].startTime).toBe('09:00');
  });
});

describe('the engine rule for the time left next to a departure', () => {
  const booking = { bookingDate: DATE, startTime: '12:45', endTime: '14:05', durationMinutes: 80, status: 'confirmed' } as const;

  it('stays strict by default: an 80-minute mission leaves a day that can never be tiled, so nothing later opens', () => {
    const slots = generateKantorovichSlots(DATE, 60, [booking]);
    expect(slots.find((slot) => slot.startTime === '14:20')?.disabledReason).toBe('orphan_gap');
  });

  it('opens the first start after the booking once the gap only has to be sellable', () => {
    const slots = generateKantorovichSlots(DATE, 60, [booking], { minSellableGaps: true });
    expect(slots.find((slot) => slot.startTime === '14:20')?.available).toBe(true);
  });

  it('still refuses a start that strands a gap too short to sell anything', () => {
    // 14:35 would leave 15 minutes between the booking's reserved end (14:20) and the departure.
    const slots = generateKantorovichSlots(DATE, 60, [booking], { minSellableGaps: true });
    const stranded = slots.find((slot) => slot.startTime === '14:35');
    expect(stranded === undefined || stranded.available === false).toBe(true);
  });

  it('recovers a flush Saturday closing-tail 90m departure (22:00 in 22:00–24:00) in re-anchored mode without allowing a 22:15 duplicate or mid-day 15m orphans', () => {
    const saturday = '2027-01-16';
    // Wix Saturday opens at 19:00; 19:00–20:30 (90m, reserved -> 20:45) + 20:45–21:45 (60m, reserved -> 22:00)
    // leaves a 120-minute closing tail (22:00–24:00).
    const saturdayBookings = [
      { bookingDate: saturday, startTime: '09:00', endTime: '18:45', durationMinutes: 585, status: 'confirmed' as const },
      { bookingDate: saturday, startTime: '19:00', endTime: '20:30', durationMinutes: 90, status: 'confirmed' as const },
      { bookingDate: saturday, startTime: '20:45', endTime: '21:45', durationMinutes: 60, status: 'confirmed' as const },
    ];

    const reanchored90 = generateKantorovichSlots(saturday, 90, saturdayBookings, { minSellableGaps: true });
    expect(reanchored90.find((slot) => slot.startTime === '22:00')?.available).toBe(true);
    expect(reanchored90.find((slot) => slot.startTime === '22:15')?.available).toBe(false);

    // Strict zero-waste mode stays unchanged (refuses 22:00 as orphan_gap).
    const strict90 = generateKantorovichSlots(saturday, 90, saturdayBookings);
    expect(strict90.find((slot) => slot.startTime === '22:00')?.disabledReason).toBe('orphan_gap');

    // A mid-day 120-minute pocket (14:00–16:00 between two bookings, NOT closing time) still refuses 14:00 90m (15m orphan).
    const middayPocket = [
      { bookingDate: DATE, startTime: '12:45', endTime: '13:45', durationMinutes: 60, status: 'confirmed' as const },
      { bookingDate: DATE, startTime: '16:00', endTime: '17:00', durationMinutes: 60, status: 'confirmed' as const },
    ];
    const midday90 = generateKantorovichSlots(DATE, 90, middayPocket, { minSellableGaps: true });
    expect(midday90.find((slot) => slot.startTime === '14:00')?.available).toBe(false);
  });
});
