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

describe('resolveWixBookingCheckout with add-on duration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWixServices.mockResolvedValue([
      {
        id: '4d52163a-1985-48cb-bf8c-92535e56e76a',
        locations: [{ id: 'loc-1', type: 'BUSINESS' }],
        payment: { options: { online: true, inPerson: false } },
      },
    ]);
  });

  it('rejects when add-ons expand the mission beyond Wix extended-duration availability', async () => {
    // 09:00 is free for 60m (and 10:00 is free for 60m), but 90m slot at 09:00 is NOT bookable in Wix.
    mocks.listWixAvailability.mockResolvedValue({
      timeZone: 'Asia/Jerusalem',
      timeSlots: [
        { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:00:00', bookable: true },
        { localStartDate: '2099-05-10T10:15:00', localEndDate: '2099-05-10T11:15:00', bookable: true },
        { localStartDate: '2099-05-10T11:30:00', localEndDate: '2099-05-10T12:30:00', bookable: true },
      ],
    });
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([
      { localStartDate: '2099-05-10T10:00:00', localEndDate: '2099-05-10T11:30:00', bookable: true },
    ]);

    await expect(
      resolveWixBookingCheckout({
        packageId: 'pkg-captain-60',
        bookingDate: '2099-05-10',
        startTime: '09:00',
        addonIds: ['addon-cold-dark'], // +20m -> 80m -> checks 90m Wix tier
      })
    ).rejects.toThrow(WixBookingUnavailableError);
    expect(mocks.listWixBookableSlotsForDuration).toHaveBeenCalledWith('2099-05-10', 90);
  });

  it('allows checkout when both base and extended Wix availability include the departure', async () => {
    mocks.listWixAvailability.mockResolvedValue({
      timeZone: 'Asia/Jerusalem',
      timeSlots: [
        { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:00:00', bookable: true },
        { localStartDate: '2099-05-10T10:15:00', localEndDate: '2099-05-10T11:15:00', bookable: true },
        { localStartDate: '2099-05-10T11:30:00', localEndDate: '2099-05-10T12:30:00', bookable: true },
      ],
    });
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([
      { localStartDate: '2099-05-10T09:00:00', localEndDate: '2099-05-10T10:30:00', bookable: true },
    ]);

    const result = await resolveWixBookingCheckout({
      packageId: 'pkg-captain-60',
      bookingDate: '2099-05-10',
      startTime: '09:00',
      addonIds: ['addon-cold-dark'],
    });
    expect(result.slotAvailability.localStartDate).toBe('2099-05-10T09:00:00');
  });
});
