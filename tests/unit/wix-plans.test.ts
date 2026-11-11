import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SUBSCRIPTION_PASSES } from '@/lib/data/subscription-passes';
import {
  WIX_PLAN_IDS,
  wixPlanIdFor,
  subscriptionPassIdForWixPlan,
  unmappedSubscriptionPassIds,
} from '@/lib/wix/catalog';
import {
  listWixPlans,
  resolveWixPlanId,
  createPlanCheckoutUrl,
  wixPlanSchema,
} from '@/lib/wix/plans';
import * as clientModule from '@/lib/wix/client';

describe('Wix Pricing Plans catalog mapping', () => {
  it('covers all 6 flight tracks (4 consumer + 2 PRO) in the type-safe dictionary', () => {
    const keys = Object.keys(WIX_PLAN_IDS);
    expect(keys).toHaveLength(6);
    for (const pass of SUBSCRIPTION_PASSES) {
      expect(keys).toContain(pass.id);
    }
  });

  it('resolves static IDs or returns null when unset', () => {
    expect(wixPlanIdFor('flight-foundations-5x60')).toBeNull();
    expect(subscriptionPassIdForWixPlan('non-existent-guid')).toBeNull();
    expect(unmappedSubscriptionPassIds()).toHaveLength(6);
  });
});

describe('Wix Pricing Plans schema & resolution', () => {
  const originalClientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WIX_CLIENT_ID = 'test-client-id';
  });

  afterEach(() => {
    if (originalClientId !== undefined) {
      process.env.NEXT_PUBLIC_WIX_CLIENT_ID = originalClientId;
    } else {
      delete process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
    }
    vi.restoreAllMocks();
  });
  it('parses valid Wix plan structures', () => {
    const parsed = wixPlanSchema.safeParse({
      _id: '12345678-1234-1234-1234-123456789012',
      name: 'Flight Foundations (5x60)',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      buyable: true,
      pricingVariants: [
        {
          id: 'v-1',
          name: 'Single',
          pricingStrategies: [
            {
              flatRate: {
                amount: '2750',
              },
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.name).toBe('Flight Foundations (5x60)');
  });

  it('dynamically matches a plan by price when static ID is unmapped', async () => {
    vi.spyOn(clientModule, 'wixPost').mockResolvedValueOnce({
      plans: [
        {
          _id: 'plan-foundations-uuid',
          name: 'Custom 5 Sessions Pass',
          pricingVariants: [
            {
              pricingStrategies: [{ flatRate: { amount: '2750' } }],
            },
          ],
        },
      ],
    });

    const resolved = await resolveWixPlanId('flight-foundations-5x60');
    expect(resolved).toBe('plan-foundations-uuid');
  });

  it('dynamically matches a plan by session key pattern if price is omitted', async () => {
    vi.spyOn(clientModule, 'wixPost').mockResolvedValueOnce({
      plans: [
        {
          _id: 'plan-airline-10x90-uuid',
          name: 'Sim Dream Airline Readiness 10x90',
        },
      ],
    });

    const resolved = await resolveWixPlanId('airline-readiness-10x90');
    expect(resolved).toBe('plan-airline-10x90-uuid');
  });

  it('generates a checkout redirect URL via Wix redirects', async () => {
    const mockCreateRedirectSession = vi.fn().mockResolvedValue({
      redirectSession: {
        fullUrl: 'https://checkout.wix.com/hosted-paid-plans-session',
      },
    });

    vi.spyOn(clientModule, 'getWixClient').mockReturnValue({
      redirects: {
        createRedirectSession: mockCreateRedirectSession,
      },
    } as any);

    const url = await createPlanCheckoutUrl({
      planId: 'test-plan-id',
      baseUrl: 'https://simdream.co.il',
      passId: 'flight-foundations-5x60',
    });

    expect(url).toBe('https://checkout.wix.com/hosted-paid-plans-session');
    expect(mockCreateRedirectSession).toHaveBeenCalledWith({
      paidPlansCheckout: {
        planId: 'test-plan-id',
      },
      callbacks: {
        postFlowUrl: 'https://simdream.co.il/subscriptions#flight-foundations-5x60',
        thankYouPageUrl: 'https://simdream.co.il/subscriptions/thank-you',
      },
    });
  });
});
