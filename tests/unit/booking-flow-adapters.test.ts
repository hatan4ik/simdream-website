import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  configured: false,
  getSession: vi.fn(),
}));
const wix = vi.hoisted(() => ({
  client: {} as Record<string, unknown>,
  applyWixCoupon: vi.fn(),
  removeWixCoupon: vi.fn(),
  applyWixGiftCard: vi.fn(),
  removeWixGiftCard: vi.fn(),
  prepareWixBookingCheckout: vi.fn(),
  getWixBookingCheckoutUrl: vi.fn(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return supabase.configured;
  },
  get supabase() {
    return supabase.configured ? { auth: { getSession: supabase.getSession } } : null;
  },
}));
vi.mock('@/lib/wix/member-client', () => ({
  getWixMemberClient: () => wix.client,
  wixMemberOAuthStorageKey: () => 'oauth-key',
}));
vi.mock('@/lib/wix/booking-checkout-client', () => ({
  applyWixCoupon: wix.applyWixCoupon,
  removeWixCoupon: wix.removeWixCoupon,
  applyWixGiftCard: wix.applyWixGiftCard,
  removeWixGiftCard: wix.removeWixGiftCard,
  prepareWixBookingCheckout: wix.prepareWixBookingCheckout,
  getWixBookingCheckoutUrl: wix.getWixBookingCheckoutUrl,
}));

import {
  applyCouponToDraft,
  applyGiftCardToDraft,
  getWixCheckoutUrl,
  prepareWixCheckoutDraft,
  removeAppliedCodeFromDraft,
  startLocalCheckout,
  startWixSubscriptionCheckout,
  type WixCheckoutDraftState,
} from '@/lib/booking/client';

const assign = vi.fn();
const setItem = vi.fn();
const fetchMock = vi.fn();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  supabase.configured = false;
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', {
    location: { assign, origin: 'https://simdream.test', href: 'https://simdream.test/book?subscription=wix' },
    sessionStorage: { setItem },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  wix.client = {};
});

const MESSAGES = { paymentStartFailed: 'start failed', paymentInitializeFailed: 'init failed' };

describe('startLocalCheckout', () => {
  it('posts the booking and sends the browser to Stripe', async () => {
    fetchMock.mockImplementation(async () => json({ kind: 'stripe', url: 'https://checkout.stripe.test/s' }));
    await startLocalCheckout({ kind: 'booking', packageId: 'p' }, MESSAGES);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/checkout');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ kind: 'booking', packageId: 'p' });
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.test/s');
  });

  it('goes straight to the success page when a voucher funds the whole booking', async () => {
    fetchMock.mockImplementation(async () => json({ kind: 'voucher', successUrl: '/book/success?ref=SD-1' }));
    await startLocalCheckout({}, MESSAGES);
    expect(assign).toHaveBeenCalledWith('/book/success?ref=SD-1');
  });

  it('forwards the member session token when Supabase is configured and a session exists', async () => {
    supabase.configured = true;
    supabase.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    fetchMock.mockImplementation(async () => json({ kind: 'stripe', url: 'https://checkout.stripe.test/s' }));
    await startLocalCheckout({}, MESSAGES);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok',
    });

    supabase.getSession.mockResolvedValue({ data: { session: null } });
    await startLocalCheckout({}, MESSAGES);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('throws the server message, then the localized fallbacks, and never navigates', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'Slot taken' }, 409));
    await expect(startLocalCheckout({}, MESSAGES)).rejects.toThrow('Slot taken');
    fetchMock.mockResolvedValueOnce(json({}, 500));
    await expect(startLocalCheckout({}, MESSAGES)).rejects.toThrow('start failed');
    fetchMock.mockResolvedValueOnce(json({ kind: 'stripe' }));
    await expect(startLocalCheckout({}, MESSAGES)).rejects.toThrow('init failed');
    fetchMock.mockResolvedValueOnce(json({ kind: 'voucher', successUrl: 42 }));
    await expect(startLocalCheckout({}, MESSAGES)).rejects.toThrow('init failed');
    expect(assign).not.toHaveBeenCalled();
  });
});

const SUBSCRIPTION_INPUT = {
  packageId: 'pkg-captain-60',
  bookingDate: '2026-11-09',
  startTime: '10:00',
  copy: { noEligiblePlan: 'no plan', unavailable: 'gone', checkoutFailed: 'failed' },
};
const COVERING_PLAN = '4aef54a4-c9bb-4355-9e39-087733a83fd2'; // staging plan that covers pkg-captain-60

function memberClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      loggedIn: () => true,
      generateOAuthData: vi.fn(() => ({ state: 's' })),
      getAuthUrl: vi.fn(async () => ({ authUrl: 'https://wix.test/auth' })),
    },
    orders: { memberListOrders: vi.fn(async () => ({ orders: [{ status: 'ACTIVE', planId: COVERING_PLAN }] })) },
    redirects: {
      createRedirectSession: vi.fn(async () => ({ redirectSession: { fullUrl: 'https://wix.test/checkout' } })),
    },
    ...overrides,
  };
}

const OPEN_SLOT = {
  timeZone: 'Asia/Jerusalem',
  slotAvailability: { serviceId: 'svc', localStartDate: '2026-11-09T10:00:00', localEndDate: '2026-11-09T11:00:00' },
};

describe('startWixSubscriptionCheckout', () => {
  it('sends a signed-out visitor to Wix member sign-in and remembers the OAuth state', async () => {
    const client = memberClient();
    client.auth.loggedIn = () => false;
    wix.client = client;
    await startWixSubscriptionCheckout(SUBSCRIPTION_INPUT);

    expect(client.auth.generateOAuthData).toHaveBeenCalledWith(
      'https://simdream.test/wix/members/callback',
      'https://simdream.test/book?subscription=wix'
    );
    expect(setItem).toHaveBeenCalledWith('oauth-key', JSON.stringify({ state: 's' }));
    expect(assign).toHaveBeenCalledWith('https://wix.test/auth');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redeems an included session through the Wix-hosted Bookings checkout', async () => {
    const client = memberClient();
    wix.client = client;
    fetchMock.mockImplementation(async () => json(OPEN_SLOT));
    await startWixSubscriptionCheckout(SUBSCRIPTION_INPUT);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      packageId: 'pkg-captain-60',
      bookingDate: '2026-11-09',
      startTime: '10:00',
    });
    expect(client.redirects.createRedirectSession).toHaveBeenCalledWith({
      bookingsCheckout: { slotAvailability: OPEN_SLOT.slotAvailability, timezone: 'Asia/Jerusalem' },
      callbacks: { postFlowUrl: 'https://simdream.test/subscriptions#flight-deck' },
    });
    expect(assign).toHaveBeenCalledWith('https://wix.test/checkout');
  });

  it('refuses when no active plan covers the package or the order is not active', async () => {
    wix.client = memberClient({
      orders: { memberListOrders: vi.fn(async () => ({ orders: [{ status: 'CANCELED', planId: COVERING_PLAN }, { status: 'ACTIVE', planId: 'unknown' }] })) },
    });
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('no plan');
    wix.client = memberClient({ orders: { memberListOrders: vi.fn(async () => ({})) } });
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('no plan');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a taken slot (409), other failures and an incomplete slot to their messages', async () => {
    wix.client = memberClient();
    fetchMock.mockResolvedValueOnce(json({}, 409));
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('gone');
    fetchMock.mockResolvedValueOnce(json({}, 500));
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('failed');
    fetchMock.mockResolvedValueOnce(json({ slotAvailability: { serviceId: 'svc' } }));
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('failed');
    expect(assign).not.toHaveBeenCalled();
  });

  it('falls back to the Jerusalem zone and fails when Wix returns no checkout URL', async () => {
    const client = memberClient({
      redirects: { createRedirectSession: vi.fn(async () => ({ redirectSession: {} })) },
    });
    wix.client = client;
    fetchMock.mockImplementation(async () => json({ slotAvailability: OPEN_SLOT.slotAvailability }));
    await expect(startWixSubscriptionCheckout(SUBSCRIPTION_INPUT)).rejects.toThrow('failed');
    expect(client.redirects.createRedirectSession).toHaveBeenCalledWith(
      expect.objectContaining({ bookingsCheckout: expect.objectContaining({ timezone: 'Asia/Jerusalem' }) })
    );
    expect(assign).not.toHaveBeenCalled();
  });
});

const DRAFT: WixCheckoutDraftState = { inputKey: 'k', cartId: 'cart-1', totalIls: 500 };

describe('Wix checkout cart operations', () => {
  const PREPARE_INPUT = {
    inputKey: 'k',
    packageId: 'pkg-captain-60',
    bookingDate: '2026-11-09',
    startTime: '10:00',
    pilotName: 'Ada',
    pilotEmail: 'ada@example.com',
    pilotPhone: '+972501234567',
    notes: 'window seat',
    paymentStartFailed: 'start failed',
  };
  const CANDIDATE = {
    slotAvailability: { serviceId: 'svc' },
    timeZone: 'Asia/Jerusalem',
    location: { id: 'loc' },
    paymentOptions: { online: true },
  };

  it('prepares a cart from the live Wix slot and the pilot manifest', async () => {
    fetchMock.mockImplementation(async () => json(CANDIDATE));
    wix.prepareWixBookingCheckout.mockResolvedValue({ cartId: 'cart-1', price: { totalIls: 500 } });
    await expect(prepareWixCheckoutDraft(PREPARE_INPUT)).resolves.toEqual({ inputKey: 'k', cartId: 'cart-1', totalIls: 500 });
    expect(wix.prepareWixBookingCheckout).toHaveBeenCalledWith(wix.client, {
      ...CANDIDATE,
      pilotName: 'Ada',
      pilotEmail: 'ada@example.com',
      pilotPhone: '+972501234567',
      notes: 'window seat',
    });
  });

  it('fails with the endpoint message, or the fallback, when the Wix slot is incomplete', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'No slot' }, 409));
    await expect(prepareWixCheckoutDraft(PREPARE_INPUT)).rejects.toThrow('No slot');
    fetchMock.mockResolvedValueOnce(json({ slotAvailability: {}, timeZone: 'x' }));
    await expect(prepareWixCheckoutDraft(PREPARE_INPUT)).rejects.toThrow('start failed');
    expect(wix.prepareWixBookingCheckout).not.toHaveBeenCalled();
  });

  it('applies a coupon and records Wix\'s calculated discount and total', async () => {
    wix.applyWixCoupon.mockResolvedValue({ couponId: 'c1', price: { discountIls: 50, totalIls: 450 } });
    const result = await applyCouponToDraft(DRAFT, 'SAVE50');
    expect(wix.applyWixCoupon).toHaveBeenCalledWith(wix.client, 'cart-1', 'SAVE50', 500);
    expect(result).toEqual({
      kind: 'applied',
      discountIls: 50,
      totalIls: 450,
      draft: {
        ...DRAFT,
        codeKind: 'coupon',
        couponId: 'c1',
        couponCode: 'SAVE50',
        giftCardId: undefined,
        giftCardObfuscatedCode: undefined,
        totalIls: 450,
      },
    });
  });

  it('takes a zero-discount coupon back off the cart and restores the original total', async () => {
    wix.applyWixCoupon.mockResolvedValue({ couponId: 'c1', price: { discountIls: 0, totalIls: 500 } });
    wix.removeWixCoupon.mockResolvedValue({ totalIls: 520 });
    const result = await applyCouponToDraft(DRAFT, 'NOPE');
    expect(wix.removeWixCoupon).toHaveBeenCalledWith(wix.client, 'cart-1', 'c1');
    expect(result).toEqual({ kind: 'not-eligible', draft: { ...DRAFT, totalIls: 520 } });
  });

  it('applies a gift card without keeping its bearer code', async () => {
    wix.applyWixGiftCard.mockResolvedValue({
      giftCardId: 'g1',
      obfuscatedCode: '****1234',
      price: { totalIls: 100, giftCardAppliedIls: 400, discountIls: 0 },
    });
    const result = await applyGiftCardToDraft({ ...DRAFT, couponId: 'c1', couponCode: 'X' }, 'SECRET-CODE');
    expect(wix.applyWixGiftCard).toHaveBeenCalledWith(wix.client, 'cart-1', 'SECRET-CODE');
    expect(result.appliedCreditIls).toBe(400);
    expect(result.draft).toMatchObject({ codeKind: 'gift-card', giftCardId: 'g1', giftCardObfuscatedCode: '****1234', totalIls: 100 });
    expect(result.draft.couponId).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('SECRET-CODE');
  });

  it('treats a gift card with no reported credit as zero credit', async () => {
    wix.applyWixGiftCard.mockResolvedValue({ giftCardId: 'g1', obfuscatedCode: '****', price: { totalIls: 500, discountIls: 0 } });
    expect((await applyGiftCardToDraft(DRAFT, 'c')).appliedCreditIls).toBe(0);
  });

  it('removes an applied gift card or coupon and resets the draft to the recalculated total', async () => {
    wix.removeWixGiftCard.mockResolvedValue({ totalIls: 500 });
    const cleared = await removeAppliedCodeFromDraft({ ...DRAFT, codeKind: 'gift-card', giftCardId: 'g1', giftCardObfuscatedCode: '****' });
    expect(wix.removeWixGiftCard).toHaveBeenCalledWith(wix.client, 'cart-1', 'g1');
    expect(cleared).toEqual({
      ...DRAFT,
      totalIls: 500,
      codeKind: undefined,
      couponId: undefined,
      couponCode: undefined,
      giftCardId: undefined,
      giftCardObfuscatedCode: undefined,
    });

    wix.removeWixCoupon.mockResolvedValue({ totalIls: 500 });
    await removeAppliedCodeFromDraft({ ...DRAFT, codeKind: 'coupon', couponId: 'c1', couponCode: 'X' });
    expect(wix.removeWixCoupon).toHaveBeenCalledWith(wix.client, 'cart-1', 'c1');
  });

  it('returns the Wix-hosted payment URL of the draft cart', async () => {
    wix.getWixBookingCheckoutUrl.mockResolvedValue({ checkoutUrl: 'https://pay.wix.test/c' });
    await expect(getWixCheckoutUrl(DRAFT)).resolves.toBe('https://pay.wix.test/c');
    expect(wix.getWixBookingCheckoutUrl).toHaveBeenCalledWith(wix.client, 'cart-1');
  });
});
