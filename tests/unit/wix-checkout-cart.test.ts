import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WixBookingCheckoutClientError } from '@/lib/wix/booking-checkout-client';
import * as checkoutClient from '@/lib/wix/booking-checkout-client';
import * as memberClient from '@/lib/wix/member-client';
import { prepareWixCheckoutDraft } from '@/lib/booking/client/wix-checkout-cart';

const DRAFT_INPUT = {
  inputKey: 'draft-key-1',
  packageId: 'captains-command-60',
  bookingDate: '2026-11-17',
  startTime: '10:00',
  pilotName: 'Nat Nat',
  pilotEmail: 'hatan4ik@gmail.com',
  pilotPhone: '0547773074',
  notes: '',
  paymentStartFailed: 'Payment could not be started.',
};

const SLOT_PAYLOAD = {
  slotAvailability: {
    serviceId: 'svc-1',
    scheduleId: 'sched-1',
    localStartDate: '2026-11-17T10:00:00',
    localEndDate: '2026-11-17T11:00:00',
    bookable: true,
  },
  timeZone: 'Asia/Jerusalem',
  location: { id: 'loc-1', locationType: 'BUSINESS' as const },
  paymentOptions: { online: true, inPerson: false },
};

describe('prepareWixCheckoutDraft', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(SLOT_PAYLOAD), { status: 200 }))
    );
    vi.spyOn(memberClient, 'getWixMemberClient').mockReturnValue({} as ReturnType<typeof memberClient.getWixMemberClient>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([401, 403])('clears a stale Wix session and retries once when checkout returns %i', async (status) => {
    const clearSpy = vi.spyOn(memberClient, 'clearWixMemberSession').mockImplementation(() => {});
    const notifySpy = vi.spyOn(memberClient, 'notifyWixMemberSessionChanged').mockImplementation(() => {});
    const prepareSpy = vi
      .spyOn(checkoutClient, 'prepareWixBookingCheckout')
      .mockRejectedValueOnce(new WixBookingCheckoutClientError(`We could not open Wix checkout (${status}). Please try again.`, status))
      .mockResolvedValueOnce({ cartId: 'cart-recovered', price: { discountIls: 0, totalIls: 586 } });

    await expect(prepareWixCheckoutDraft(DRAFT_INPUT)).resolves.toEqual({
      inputKey: 'draft-key-1',
      cartId: 'cart-recovered',
      totalIls: 586,
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(prepareSpy).toHaveBeenCalledTimes(2);
  });

  it('rethrows non-auth checkout errors without clearing the Wix session', async () => {
    const clearSpy = vi.spyOn(memberClient, 'clearWixMemberSession').mockImplementation(() => {});
    const notifySpy = vi.spyOn(memberClient, 'notifyWixMemberSessionChanged').mockImplementation(() => {});
    vi.spyOn(checkoutClient, 'prepareWixBookingCheckout').mockRejectedValueOnce(
      new WixBookingCheckoutClientError('We could not open Wix checkout (400): bad email', 400)
    );

    await expect(prepareWixCheckoutDraft(DRAFT_INPUT)).rejects.toThrow('We could not open Wix checkout (400): bad email');
    expect(clearSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
