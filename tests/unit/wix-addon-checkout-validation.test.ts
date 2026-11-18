import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatBlockingCheckoutViolations, hasBlockingCheckoutViolations } from '@/lib/wix/booking-cart-create';
import { resolveWixBookingCheckout, WixBookingUnavailableError } from '@/lib/wix/booking-checkout';

const mocks = vi.hoisted(() => ({
  isWixConfigured: vi.fn(() => true),
  listWixServices: vi.fn(),
  listWixAvailability: vi.fn(),
  listWixBookableSlotsForDuration: vi.fn(),
}));

vi.mock('@/lib/wix/config', () => ({
  isWixConfigured: mocks.isWixConfigured,
  WIX_TIME_ZONE: 'Asia/Jerusalem',
}));

vi.mock('@/lib/wix/bookings', () => ({
  listWixServices: mocks.listWixServices,
  listWixAvailability: mocks.listWixAvailability,
  wixResourceTypeIdsForService: () => ['res-1'],
}));

vi.mock('@/lib/wix/availability-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wix/availability-adapter')>();
  return {
    ...actual,
    listWixBookableSlotsForDuration: mocks.listWixBookableSlotsForDuration,
  };
});

describe('Cart V2 violation formatting', () => {
  it('ignores DELIVERY/MISSING_DELIVERY_METHOD and formats real blocking violations', () => {
    const onlyDelivery = [{ scope: 'DELIVERY', code: 'MISSING_DELIVERY_METHOD', description: 'No shipping needed' }];
    expect(hasBlockingCheckoutViolations(onlyDelivery)).toBe(false);
    expect(formatBlockingCheckoutViolations(onlyDelivery)).toBeNull();

    const mixed = [
      ...onlyDelivery,
      { scope: 'LINE_ITEM', code: 'OUT_OF_STOCK', description: 'Add-on is currently unavailable' },
    ];
    expect(hasBlockingCheckoutViolations(mixed)).toBe(true);
    expect(formatBlockingCheckoutViolations(mixed)).toBe('LINE_ITEM/OUT_OF_STOCK: Add-on is currently unavailable');
  });
});

const SERVICE_ID = '4d52163a-1985-48cb-bf8c-92535e56e76a';
const COLD_DARK_WIX_ID = '3f25e6d1-1c6b-4f6a-825e-10daf5603a02';
const MISSION_GROUP_ID = 'eda87110-b97d-4381-95af-0f703a463a3f';

const BASE_SLOTS = [
  { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:00:00', bookable: true },
  { localStartDate: '2099-05-10T10:15:00', localEndDate: '2099-05-10T11:15:00', bookable: true },
  { localStartDate: '2099-05-10T11:30:00', localEndDate: '2099-05-10T12:30:00', bookable: true },
];

/** Wix answers the base query with 60-minute slots and the add-on query with the longer ones. */
function mockWixAvailability(extendedSlots: Array<Record<string, unknown>>) {
  mocks.listWixAvailability.mockImplementation(async (window: { addOnIds?: string[] }) => ({
    timeZone: 'Asia/Jerusalem',
    timeSlots: window.addOnIds?.length ? extendedSlots : BASE_SLOTS,
  }));
}

describe('resolveWixBookingCheckout with add-on duration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWixServices.mockResolvedValue([
      {
        id: SERVICE_ID,
        locations: [{ id: 'loc-1', type: 'BUSINESS' }],
        payment: { options: { online: true, inPerson: false } },
      },
    ]);
  });

  it('asks Wix for the slot with the add-ons and returns the extended slot to book', async () => {
    mockWixAvailability([
      { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:30:00', bookable: true },
    ]);

    const result = await resolveWixBookingCheckout({
      packageId: 'pkg-captain-60',
      bookingDate: '2099-05-10',
      startTime: '09:00',
      addonIds: ['addon-cold-dark'], // 60 + 30 = 90 minutes
    });

    expect(mocks.listWixAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: SERVICE_ID, addOnIds: [COLD_DARK_WIX_ID] })
    );
    expect(result.slotAvailability.localEndDate).toBe('2099-05-10T10:30:00');
    expect(result.bookedAddOns).toEqual([{ id: COLD_DARK_WIX_ID, groupId: MISSION_GROUP_ID }]);
    expect(result.availabilityAddOnIds).toEqual([COLD_DARK_WIX_ID]);
    expect(result.nativeAddonIds).toEqual(['addon-cold-dark']);
    expect(mocks.listWixBookableSlotsForDuration).not.toHaveBeenCalled();
  });

  it('rejects when Wix has no slot with the add-on duration at that departure', async () => {
    // 09:00 is free for 60m, but not for 90m: the 90m slot only starts at 10:00.
    mockWixAvailability([
      { localStartDate: '2099-05-10T10:00:00', localEndDate: '2099-05-10T11:30:00', bookable: true },
    ]);

    await expect(
      resolveWixBookingCheckout({
        packageId: 'pkg-captain-60',
        bookingDate: '2099-05-10',
        startTime: '09:00',
        addonIds: ['addon-cold-dark'],
      })
    ).rejects.toThrow(WixBookingUnavailableError);
  });

  it('fails closed when the minutes Wix adds differ from the SimDream registry', async () => {
    // The registry says Cold & Dark adds 30 minutes (90m total); this Wix slot is 40 minutes longer (100m).
    mockWixAvailability([
      { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:40:00', bookable: true },
    ]);

    const outcome = resolveWixBookingCheckout({
      packageId: 'pkg-captain-60',
      bookingDate: '2099-05-10',
      startTime: '09:00',
      addonIds: ['addon-cold-dark'],
    });
    await expect(outcome).rejects.toThrow(/add-on duration/i);
    await expect(outcome).rejects.not.toBeInstanceOf(WixBookingUnavailableError);
  });

  it('books the plain service slot, and no add-ons, when none were chosen', async () => {
    mockWixAvailability([]);

    const result = await resolveWixBookingCheckout({
      packageId: 'pkg-captain-60',
      bookingDate: '2099-05-10',
      startTime: '09:00',
    });

    expect(result.slotAvailability.localEndDate).toBe('2099-05-10T10:00:00');
    expect(result.bookedAddOns).toEqual([]);
    expect(result.availabilityAddOnIds).toEqual([]);
    expect(result.nativeAddonIds).toEqual([]);
    expect(mocks.listWixAvailability).toHaveBeenCalledTimes(1);
  });

  it('books a quantity add-on without lengthening the slot', async () => {
    mockWixAvailability([]);

    const result = await resolveWixBookingCheckout({
      packageId: 'pkg-captain-60',
      bookingDate: '2099-05-10',
      startTime: '09:00',
      addonIds: ['addon-extra-seat'],
    });

    expect(result.slotAvailability.localEndDate).toBe('2099-05-10T10:00:00');
    expect(result.bookedAddOns).toEqual([
      { id: 'fc135398-ed27-49e0-9505-3b7efa7f2502', groupId: '98af09e5-e535-4f3d-b67e-9480627e43c7', quantity: 1 },
    ]);
    expect(result.availabilityAddOnIds).toEqual([]);
  });

  it('keeps the preflight-only behaviour for a subscription redemption (nativeAddOns: false)', async () => {
    mocks.listWixAvailability.mockResolvedValue({ timeZone: 'Asia/Jerusalem', timeSlots: BASE_SLOTS });
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([
      { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:30:00', bookable: true },
    ]);

    const result = await resolveWixBookingCheckout(
      { packageId: 'pkg-captain-60', bookingDate: '2099-05-10', startTime: '09:00', addonIds: ['addon-cold-dark'] },
      { nativeAddOns: false }
    );

    expect(mocks.listWixBookableSlotsForDuration).toHaveBeenCalledWith('2099-05-10', 90);
    expect(result.slotAvailability.localEndDate).toBe('2099-05-10T10:00:00');
    expect(result.bookedAddOns).toEqual([]);
  });

  it('still rejects a subscription redemption the extended tier cannot hold', async () => {
    mocks.listWixAvailability.mockResolvedValue({ timeZone: 'Asia/Jerusalem', timeSlots: BASE_SLOTS });
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([
      { localStartDate: '2099-05-10T10:00:00', localEndDate: '2099-05-10T11:30:00', bookable: true },
    ]);

    await expect(
      resolveWixBookingCheckout(
        { packageId: 'pkg-captain-60', bookingDate: '2099-05-10', startTime: '09:00', addonIds: ['addon-cold-dark'] },
        { nativeAddOns: false }
      )
    ).rejects.toThrow(WixBookingUnavailableError);
  });
});

const ULTIMATE_90_SERVICE_ID = '97b47c8c-c7a5-4c3c-9596-8e5cf77e9e77';

describe('resolveWixBookingCheckout with promotional tier upgrade (sourcePackageId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWixServices.mockResolvedValue([
      {
        id: SERVICE_ID,
        locations: [{ id: 'loc-1', type: 'BUSINESS' }],
        payment: { options: { online: true, inPerson: false } },
      },
      {
        id: ULTIMATE_90_SERVICE_ID,
        locations: [{ id: 'loc-1', type: 'BUSINESS' }],
        payment: { options: { online: true, inPerson: false } },
      },
    ]);
  });

  function buildFiveMinSlots(date: string, durationMinutes: number, startFrom = 9 * 60, lastStart = 22 * 60) {
    const out: Array<Record<string, unknown>> = [];
    for (let m = startFrom; m <= lastStart; m += 5) {
      const sh = String(Math.floor(m / 60)).padStart(2, '0');
      const sm = String(m % 60).padStart(2, '0');
      const emTotal = m + durationMinutes;
      const eh = String(Math.floor(emTotal / 60)).padStart(2, '0');
      const em = String(emTotal % 60).padStart(2, '0');
      out.push({ localStartDate: `${date}T${sh}:${sm}:00`, localEndDate: `${date}T${eh}:${em}:00`, bookable: true });
    }
    return out;
  }

  it('accepts a 60m departure off the 90m grid (e.g. 11:30) when promoted to pkg-ultimate-90 via sourcePackageId', async () => {
    const date = '2099-05-10';
    const slots60 = buildFiveMinSlots(date, 60, 9 * 60, 22 * 60 + 45);
    const slots90 = buildFiveMinSlots(date, 90, 9 * 60, 22 * 60 + 15);
    mocks.listWixAvailability.mockImplementation(async (window: { serviceId: string }) => ({
      timeZone: 'Asia/Jerusalem',
      timeSlots: window.serviceId === SERVICE_ID ? slots60 : slots90,
    }));

    // Without sourcePackageId, 11:30 is off the 90m empty-day grid (09:00, 10:45, 12:30...) and rejected.
    await expect(
      resolveWixBookingCheckout({
        packageId: 'pkg-ultimate-90',
        bookingDate: date,
        startTime: '11:30',
      })
    ).rejects.toThrow(WixBookingUnavailableError);

    // With sourcePackageId='pkg-captain-60', 11:30 is a valid 60m grid start with >=90m open and Wix 90m bookable.
    const promoted = await resolveWixBookingCheckout({
      packageId: 'pkg-ultimate-90',
      sourcePackageId: 'pkg-captain-60',
      bookingDate: date,
      startTime: '11:30',
    });

    expect(promoted.slotAvailability.localStartDate).toBe(`${date}T11:30:00`);
    expect(promoted.slotAvailability.localEndDate).toBe(`${date}T13:00:00`);
  });

  it('rejects a promoted departure when Wix does not offer the upgraded 90m slot at that time', async () => {
    const date = '2099-05-10';
    const slots60 = buildFiveMinSlots(date, 60, 9 * 60, 22 * 60 + 45);
    const slots90 = buildFiveMinSlots(date, 90, 9 * 60, 22 * 60 + 15).filter(
      (slot) => slot.localStartDate !== `${date}T11:30:00`
    );
    mocks.listWixAvailability.mockImplementation(async (window: { serviceId: string }) => ({
      timeZone: 'Asia/Jerusalem',
      timeSlots: window.serviceId === SERVICE_ID ? slots60 : slots90,
    }));

    await expect(
      resolveWixBookingCheckout({
        packageId: 'pkg-ultimate-90',
        sourcePackageId: 'pkg-captain-60',
        bookingDate: date,
        startTime: '11:30',
      })
    ).rejects.toThrow(WixBookingUnavailableError);
  });

  it('rejects a promoted departure when the source slot window cannot hold the upgraded 90m duration', async () => {
    const date = '2099-05-10';
    // 11:30 is open for 60m (75m reserved), but a booking starts at 12:45 so 12:45 is blocked: maxAvailableMinutes = 60 < 90.
    const slots60 = buildFiveMinSlots(date, 60, 9 * 60, 22 * 60 + 45).filter((slot) => {
      const hhmm = String(slot.localStartDate).slice(11, 16);
      return hhmm < '11:35' || hhmm >= '14:00';
    });
    const slots90 = buildFiveMinSlots(date, 90, 9 * 60, 22 * 60 + 15);
    mocks.listWixAvailability.mockImplementation(async (window: { serviceId: string }) => ({
      timeZone: 'Asia/Jerusalem',
      timeSlots: window.serviceId === SERVICE_ID ? slots60 : slots90,
    }));

    await expect(
      resolveWixBookingCheckout({
        packageId: 'pkg-ultimate-90',
        sourcePackageId: 'pkg-captain-60',
        bookingDate: date,
        startTime: '11:30',
      })
    ).rejects.toThrow(WixBookingUnavailableError);
  });
});
