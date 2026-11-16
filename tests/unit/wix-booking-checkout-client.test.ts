import { describe, expect, it, vi } from 'vitest';
import {
  applyWixCoupon,
  applyWixGiftCard,
  createWixCartForBooking,
  normalizeWixBookingPhone,
  prepareWixBookingCheckout,
  removeWixCoupon,
  removeWixGiftCard,
  startWixBookingCheckout,
  wixLocalDateTimeToIso,
  type WixBrowserClient,
  type WixNativeCheckoutCandidate,
} from '@/lib/wix/booking-checkout-client';
import { WIX_ADDON_PRODUCT_IDS, WIX_STORES_APP_ID } from '@/lib/wix/catalog';

const CANDIDATE: WixNativeCheckoutCandidate = {
  slotAvailability: {
    serviceId: 'service-id',
    scheduleId: 'schedule-id',
    localStartDate: '2026-11-09T10:00:00',
    localEndDate: '2026-11-09T11:00:00',
    bookable: true,
  },
  timeZone: 'Asia/Jerusalem',
  location: { id: 'location-id', locationType: 'BUSINESS' },
  paymentOptions: { online: true, inPerson: false },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function calculation(discount: string, total: string): Response {
  return response({
    summary: {
      violations: [],
      priceSummary: { discount: { amount: discount }, total: { amount: total } },
    },
  });
}

function giftCardCalculation(total: string, redeemed: string, totalAfterGiftCards: string): Response {
  return response({
    summary: {
      violations: [],
      priceSummary: { discount: { amount: '0' }, total: { amount: total } },
      paymentSummary: {
        giftCards: [{ giftCardId: 'gift-card-id', redeemAmount: { amount: redeemed } }],
        totalAfterGiftCards: { amount: totalAfterGiftCards },
      },
    },
  });
}

describe('Wix native booking checkout client', () => {
  it('uses one visitor cart to calculate a native coupon before opening hosted checkout', async () => {
    const calls: Array<{ url: string; method?: string; body: unknown }> = [];
    const replies = [
      response({
        timeSlot: {
          bookable: true,
          scheduleId: 'schedule-id',
          availableResources: [
            { resources: [{ id: 'simulator-resource' }] },
            { resources: [{ id: 'staff-resource', name: 'Captain SimDream' }] },
          ],
        },
      }),
      response({ booking: { id: 'booking-id' } }),
      response({ cart: { id: 'cart-id' } }),
      response({ cart: { id: 'cart-id' } }),
      calculation('0', '690'),
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'WIX-TEST' }] } }),
      // Wix Bookings can apply a native coupon on the line item while reporting
      // a zero cart-level `priceSummary.discount`; the total remains decisive.
      calculation('0', '0'),
      response({ checkoutUrl: 'https://checkout.wix.com/pay/session' }),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '054-777-3074',
        notes: 'Flight plan request',
        couponCode: 'WIX-TEST',
        birthdayPricingClaim: { fieldId: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11', token: 'signed-claim' },
      })
    ).resolves.toEqual({ checkoutUrl: 'https://checkout.wix.com/pay/session' });

    expect(calls).toHaveLength(8);
    expect(calls[0]).toMatchObject({
      url: 'https://www.wixapis.com/_api/service-availability/v2/time-slots/get',
      body: {
        serviceId: 'service-id',
        localStartDate: '2026-11-09T10:00:00',
        location: { id: 'location-id', locationType: 'BUSINESS' },
      },
    });
    expect(calls[1]).toMatchObject({
      url: 'https://www.wixapis.com/bookings/v2/bookings',
      body: {
        booking: {
          selectedPaymentOption: 'ONLINE',
          contactDetails: {
            firstName: 'Avi',
            lastName: 'Pilot',
            email: 'pilot@example.test',
            phone: '+972547773074',
          },
          additionalFields: [
            {
              id: 'a4722fd-b7a0-4df0-b01d-b9b81f01bd11',
              value: 'signed-claim',
              valueType: 'SHORT_TEXT',
            },
          ],
          bookedEntity: {
            slot: {
              scheduleId: 'schedule-id',
              startDate: '2026-11-09T08:00:00.000Z',
              endDate: '2026-11-09T09:00:00.000Z',
              location: { id: 'location-id', locationType: 'OWNER_BUSINESS' },
            },
          },
        },
      },
    });
    expect((calls[1].body as Record<string, unknown>).formSubmission).toBeUndefined();
    expect(calls[2]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts',
      body: {
        catalogItems: [
          {
            catalogReference: {
              appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97',
              catalogItemId: 'booking-id',
            },
          },
        ],
      },
    });
    expect(calls[3]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-id',
      method: 'PATCH',
      body: {
        cart: {
          id: 'cart-id',
          customerInfo: {
            firstName: 'Avi',
            lastName: 'Pilot',
            email: 'pilot@example.test',
            phone: '+972547773074',
          },
          paymentInfo: {
            billingContact: {
              firstName: 'Avi',
              lastName: 'Pilot',
              phone: '+972547773074',
            },
          },
        },
      },
    });
    expect(calls[4]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[5]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-coupon',
      body: { coupon: { code: 'WIX-TEST' } },
    });
    expect(calls[6]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/calculate');
    expect(calls[7]?.url).toBe('https://www.wixapis.com/ecom/v2/carts/cart-id/get-checkout-url');
  });

  it('does not open payment when Wix refuses the customer-details handoff to the cart', async () => {
    const calls: string[] = [];
    const replies = [
      response({ timeSlot: { bookable: true, scheduleId: 'schedule-id' } }),
      response({ booking: { id: 'booking-id' } }),
      response({ cart: { id: 'cart-id' } }),
      response({ message: 'Missing Write Carts V2 PII permission' }, 403),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        calls.push(String(input));
        const next = replies.shift();
        if (!next) throw new Error('payment must not be opened after a failed customer-details handoff');
        return next;
      },
    };

    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
      })
    ).rejects.toThrow('securely prepare your checkout');

    expect(calls).toEqual([
      'https://www.wixapis.com/_api/service-availability/v2/time-slots/get',
      'https://www.wixapis.com/bookings/v2/bookings',
      'https://www.wixapis.com/ecom/v2/carts',
      'https://www.wixapis.com/ecom/v2/carts/cart-id',
    ]);
  });

  it('returns Wix-calculated amounts and removes a zero-discount coupon from the same cart', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'KANTOQA100-20261105' }] } }),
      calculation('0', '690'),
      response({ cart: {} }),
      calculation('0', '690'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixCoupon(client, 'cart-id', 'KANTOQA100-20261105')).resolves.toEqual({
      couponId: 'coupon-id',
      price: { discountIls: 0, totalIls: 690 },
    });
    await expect(removeWixCoupon(client, 'cart-id', 'coupon-id')).resolves.toEqual({ discountIls: 0, totalIls: 690 });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-coupon',
        body: { coupon: { code: 'KANTOQA100-20261105' } },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/remove-coupon', body: { couponId: 'coupon-id' } },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('derives a Bookings line-item coupon discount from the before-and-after Wix totals', async () => {
    const replies = [
      response({ cart: { coupons: [{ id: 'coupon-id', code: 'KANTOQA100-20261105' }] } }),
      calculation('0', '0'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async () => {
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixCoupon(client, 'cart-id', 'KANTOQA100-20261105', 690)).resolves.toEqual({
      couponId: 'coupon-id',
      price: { discountIls: 690, totalIls: 0 },
    });
  });

  it('applies a Wix Gift Card as stored value and exposes only Wix’s masked code', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({
        cart: {
          paymentInfo: {
            giftCards: [{ id: 'gift-card-id', obfuscatedCode: 'GC-••••-1234' }],
          },
        },
      }),
      giftCardCalculation('690', '500', '190'),
    ];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(applyWixGiftCard(client, 'cart-id', 'GC-1234-5678-9012')).resolves.toEqual({
      giftCardId: 'gift-card-id',
      obfuscatedCode: 'GC-••••-1234',
      price: { discountIls: 0, giftCardAppliedIls: 500, totalIls: 190 },
    });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/add-gift-card',
        body: { giftCard: { code: 'GC-1234-5678-9012' } },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('removes a Wix Gift Card by its cart-scoped id and restores Wix’s calculated balance', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const replies = [response({ cart: {} }), calculation('0', '690')];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(removeWixGiftCard(client, 'cart-id', 'gift-card-id')).resolves.toEqual({ discountIls: 0, totalIls: 690 });
    expect(calls).toEqual([
      {
        url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/remove-gift-card',
        body: { giftCardId: 'gift-card-id' },
      },
      { url: 'https://www.wixapis.com/ecom/v2/carts/cart-id/calculate', body: { refreshCart: true } },
    ]);
  });

  it('uses Israel daylight and standard time correctly and accepts local Israeli phone entry', () => {
    expect(wixLocalDateTimeToIso('2026-07-15T10:00:00', 'Asia/Jerusalem')).toBe('2026-07-15T07:00:00.000Z');
    expect(wixLocalDateTimeToIso('2026-11-09T10:00:00', 'Asia/Jerusalem')).toBe('2026-11-09T08:00:00.000Z');
    expect(normalizeWixBookingPhone('054 777 3074')).toBe('+972547773074');
  });

  it("stops before creating a booking when the visitor's revalidated slot is unavailable", async () => {
    const client: WixBrowserClient = {
      fetchWithAuth: async () => response({ timeSlot: { bookable: false } }),
    };
    await expect(
      startWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
      })
    ).rejects.toThrow('no longer available');
  });

  it('includes Wix Stores line items for selected addonIds in createWixCartForBooking and prepareWixBookingCheckout', async () => {
    const cartCalls: unknown[] = [];
    const cartOnlyClient: WixBrowserClient = {
      fetchWithAuth: async (_input, init) => {
        cartCalls.push(init?.body ? JSON.parse(String(init.body)) : null);
        return response({ cart: { id: 'cart-with-addons' } });
      },
    };

    await expect(
      createWixCartForBooking(cartOnlyClient, 'booking-123', ['addon-cold-dark', 'addon-unknown', 'addon-extra-seat'])
    ).resolves.toBe('cart-with-addons');

    expect(cartCalls).toEqual([
      {
        cart: { source: { channelType: 'WEB' } },
        catalogItems: [
          {
            quantity: 1,
            catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'booking-123' },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-cold-dark'] },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-extra-seat'] },
          },
        ],
      },
    ]);

    const prepareCalls: Array<{ url: string; body: unknown }> = [];
    const replies = [
      response({ timeSlot: { bookable: true, scheduleId: 'schedule-id' } }),
      response({ booking: { id: 'booking-456' } }),
      response({ cart: { id: 'cart-456' } }),
      response({ cart: { id: 'cart-456' } }),
      response({ checkout: { id: 'cart-456' } }),
      calculation('0', '940'),
    ];
    const prepareClient: WixBrowserClient = {
      fetchWithAuth: async (input, init) => {
        prepareCalls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
        const next = replies.shift();
        if (!next) throw new Error('unexpected Wix request');
        return next;
      },
    };

    await expect(
      prepareWixBookingCheckout(prepareClient, {
        ...CANDIDATE,
        pilotName: 'Avi Pilot',
        pilotEmail: 'pilot@example.test',
        pilotPhone: '+972547773074',
        addonIds: ['addon-cold-dark'],
      })
    ).resolves.toEqual({ cartId: 'cart-456', price: { discountIls: 0, totalIls: 940 } });

    expect(prepareCalls[2]).toMatchObject({
      url: 'https://www.wixapis.com/ecom/v2/carts',
      body: {
        catalogItems: [
          {
            quantity: 1,
            catalogReference: { appId: '13d21c63-b5ec-5912-8397-c3a5ddb27a97', catalogItemId: 'booking-456' },
          },
          {
            quantity: 1,
            catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: WIX_ADDON_PRODUCT_IDS['addon-cold-dark'] },
          },
        ],
      },
    });
    expect(prepareCalls[3]).toEqual({
      url: 'https://www.wixapis.com/ecom/v2/carts/cart-456',
      body: {
        cart: {
          id: 'cart-456',
          customerInfo: {
            email: 'pilot@example.test',
            firstName: 'Avi',
            lastName: 'Pilot',
            phone: '+972547773074',
          },
          deliveryInfo: {
            address: {
              country: 'IL',
              subdivision: '',
              postalCode: '',
            },
          },
          paymentInfo: {
            billingContact: {
              firstName: 'Avi',
              lastName: 'Pilot',
              phone: '+972547773074',
            },
            billingAddress: {
              country: 'IL',
              subdivision: '',
              postalCode: '',
            },
          },
        },
      },
    });
    expect(prepareCalls[4]).toEqual({
      url: 'https://www.wixapis.com/ecom/v1/checkouts/cart-456',
      body: {
        checkout: {
          billingInfo: {
            address: {
              country: 'IL',
              subdivision: '',
              postalCode: '',
            },
            contactDetails: {
              firstName: 'Avi',
              lastName: 'Pilot',
              phone: '+972547773074',
            },
          },
          shippingInfo: {
            shippingDestination: {
              address: {
                country: 'IL',
                subdivision: '',
                postalCode: '',
              },
              contactDetails: {
                firstName: 'Avi',
                lastName: 'Pilot',
                phone: '+972547773074',
              },
            },
          },
        },
      },
    });
  });

  it('surfaces Wix applicationError.code, message, and description when cart creation fails', async () => {
    const client: WixBrowserClient = {
      fetchWithAuth: async () =>
        response(
          {
            message: 'Catalog item was not found',
            details: {
              applicationError: {
                code: 'ITEM_NOT_FOUND_IN_CATALOG',
                description: 'Product cold-dark-v1 does not exist in Wix Stores',
              },
            },
          },
          400
        ),
    };

    await expect(createWixCartForBooking(client, 'booking-123', ['addon-cold-dark'])).rejects.toThrow(
      'Wix did not create a checkout cart (400): ITEM_NOT_FOUND_IN_CATALOG — Catalog item was not found — Product cold-dark-v1 does not exist in Wix Stores'
    );
  });

  it('falls back cleanly when the cart creation error response is empty or non-JSON', async () => {
    const emptyClient: WixBrowserClient = {
      fetchWithAuth: async () => new Response(null, { status: 502 }),
    };
    await expect(createWixCartForBooking(emptyClient, 'booking-123')).rejects.toThrow(
      'Wix did not create a checkout cart. Please try again.'
    );

    const htmlErrorClient: WixBrowserClient = {
      fetchWithAuth: async () =>
        new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
    };
    await expect(createWixCartForBooking(htmlErrorClient, 'booking-123')).rejects.toThrow(
      'Wix did not create a checkout cart. Please try again.'
    );
  });

  it('allows DELIVERY/MISSING_DELIVERY_METHOD violations from Wix Stores add-ons when total is calculated', async () => {
    const baseInput = {
      ...CANDIDATE,
      pilotName: 'Avi Cohen',
      pilotEmail: 'avi@example.com',
      pilotPhone: '0501234567',
    };
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) return response({ booking: { id: 'booking-1' } });
        if (url.endsWith('/carts')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/carts/cart-1')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/checkouts/cart-1')) return response({ checkout: { id: 'cart-1' } });
        if (url.endsWith('/carts/cart-1/calculate')) {
          return response({
            summary: {
              violations: [
                {
                  scope: 'DELIVERY',
                  code: 'MISSING_DELIVERY_METHOD',
                  description: 'The cart is missing a delivery method.',
                  severity: 'ERROR',
                },
              ],
              priceSummary: { discount: { amount: '0' }, total: { amount: '890.00' } },
            },
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    };

    const draft = await prepareWixBookingCheckout(client, {
      ...baseInput,
      addonIds: ['addon-cold-dark'],
    });
    expect(draft).toEqual({ cartId: 'cart-1', price: { discountIls: 0, totalIls: 890 } });
  });

  it('continues booking checkout when shipping contactDetails prefill fails', async () => {
    const baseInput = {
      ...CANDIDATE,
      pilotName: 'Avi Cohen',
      pilotEmail: 'avi@example.com',
      pilotPhone: '0501234567',
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) return response({ booking: { id: 'booking-1' } });
        if (url.endsWith('/carts')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/carts/cart-1')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/checkouts/cart-1')) return response({ message: 'unavailable' }, 500);
        if (url.endsWith('/carts/cart-1/calculate')) {
          return response({
            summary: {
              violations: [{ scope: 'DELIVERY', code: 'MISSING_DELIVERY_METHOD' }],
              priceSummary: { discount: { amount: '0' }, total: { amount: '890.00' } },
            },
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    };

    const draft = await prepareWixBookingCheckout(client, {
      ...baseInput,
      addonIds: ['addon-cold-dark'],
    });
    expect(draft).toEqual({ cartId: 'cart-1', price: { discountIls: 0, totalIls: 890 } });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[wix:checkout-prefill] Non-fatal shipping contactDetails prefill error'),
      500,
      expect.any(String)
    );
    warnSpy.mockRestore();
  });

  it('rejects non-delivery cart calculation violations', async () => {
    const baseInput = {
      ...CANDIDATE,
      pilotName: 'Avi Cohen',
      pilotEmail: 'avi@example.com',
      pilotPhone: '0501234567',
    };
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) return response({ booking: { id: 'booking-1' } });
        if (url.endsWith('/carts')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/carts/cart-1')) return response({ cart: { id: 'cart-1' } });
        if (url.endsWith('/checkouts/cart-1')) return response({ checkout: { id: 'cart-1' } });
        if (url.endsWith('/carts/cart-1/calculate')) {
          return response({
            summary: {
              violations: [{ scope: 'BOOKING', code: 'SLOT_NOT_AVAILABLE' }],
              priceSummary: { discount: { amount: '0' }, total: { amount: '890.00' } },
            },
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    };

    await expect(prepareWixBookingCheckout(client, baseInput)).rejects.toThrow(
      'Wix could not validate this checkout (BOOKING/SLOT_NOT_AVAILABLE). Please choose another option or time.'
    );
  });

  it('forwards valid pilotBirthDate into Wix _user_fields.form_field while omitting invalid dates', async () => {
    const patchBodies: Array<Record<string, unknown>> = [];
    const clientFor = (pilotBirthDate: string): WixBrowserClient => ({
      fetchWithAuth: async (input, init) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) return response({ booking: { id: 'booking-bday' } });
        if (url.endsWith('/carts')) return response({ cart: { id: 'cart-bday' } });
        if (url.endsWith('/carts/cart-bday')) {
          patchBodies.push(JSON.parse(String(init?.body)));
          return response({ cart: { id: 'cart-bday' } });
        }
        if (url.endsWith('/carts/cart-bday/calculate')) {
          return response({ summary: { violations: [], priceSummary: { discount: { amount: '0' }, total: { amount: '890.00' } } } });
        }
        if (url.endsWith('/carts/cart-bday/get-checkout-url')) {
          return response({ checkoutUrl: 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com/checkout' });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    });

    await prepareWixBookingCheckout(clientFor('1990-05-15'), {
      ...CANDIDATE,
      pilotName: 'Avi Cohen',
      pilotEmail: 'avi@example.com',
      pilotPhone: '054-765-4321',
      pilotBirthDate: '1990-05-15',
    });

    await prepareWixBookingCheckout(clientFor('2025-02-29'), {
      ...CANDIDATE,
      pilotName: 'Avi Cohen',
      pilotEmail: 'avi@example.com',
      pilotPhone: '054-765-4321',
      pilotBirthDate: '2025-02-29',
    });

    expect(patchBodies[0]).toMatchObject({
      cart: {
        deliveryInfo: { address: { country: 'IL', subdivision: '', postalCode: '' } },
        paymentInfo: { billingAddress: { country: 'IL', subdivision: '', postalCode: '' } },
        extendedFields: {
          namespaces: {
            _user_fields: {
              form_field: '1990-05-15',
            },
          },
        },
      },
    });
    expect((patchBodies[1] as { cart: Record<string, unknown> }).cart.extendedFields).toBeUndefined();
  });

  it('rejects an email without a TLD before creating a Wix booking', async () => {
    const calls: string[] = [];
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        throw new Error(`Unexpected Wix request after invalid email: ${url}`);
      },
    };

    await expect(
      prepareWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Cohen',
        pilotEmail: 'test@gmail',
        pilotPhone: '0501234567',
      })
    ).rejects.toThrow('Enter a valid email address');

    expect(calls).toEqual(['https://www.wixapis.com/_api/service-availability/v2/time-slots/get']);
  });

  it('surfaces Wix error status, code, and message from wixPost instead of hiding behind a generic failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) {
          return response(
            {
              message: 'Validation failed: must match format "email"',
              details: { applicationError: { code: 'FORMAT_ERROR', description: 'email must match email format' } },
            },
            400
          );
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    };

    await expect(
      prepareWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Cohen',
        pilotEmail: 'avi@example.com',
        pilotPhone: '0501234567',
      })
    ).rejects.toThrow(
      'We could not open Wix checkout (400): FORMAT_ERROR — Validation failed: must match format "email" — email must match email format'
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Wix checkout request failed',
      expect.objectContaining({
        url: 'https://www.wixapis.com/bookings/v2/bookings',
        status: 400,
      })
    );
    errorSpy.mockRestore();
  });

  it('falls back cleanly when a wixPost error response has no JSON body', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client: WixBrowserClient = {
      fetchWithAuth: async (input) => {
        const url = String(input);
        if (url.endsWith('/time-slots/get')) return response({ timeSlot: { ...CANDIDATE.slotAvailability } });
        if (url.endsWith('/bookings')) return new Response('<html>Bad Gateway</html>', { status: 502 });
        throw new Error(`Unexpected URL ${url}`);
      },
    };

    await expect(
      prepareWixBookingCheckout(client, {
        ...CANDIDATE,
        pilotName: 'Avi Cohen',
        pilotEmail: 'avi@example.com',
        pilotPhone: '0501234567',
      })
    ).rejects.toThrow('We could not open Wix checkout. Please try again.');
    errorSpy.mockRestore();
  });
});
