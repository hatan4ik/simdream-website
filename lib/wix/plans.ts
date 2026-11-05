import { z } from 'zod';
import {
  findSubscriptionPass,
  SUBSCRIPTION_PASSES,
  type SubscriptionPassId,
} from '@/lib/data/subscription-passes';
import { getWixClient, wixPost } from './client';
import { isWixConfigured } from './config';
import { WIX_PLAN_IDS, wixPlanIdFor } from './catalog';

export { WIX_PLAN_IDS, wixPlanIdFor };

const wixPricingStrategySchema = z
  .object({
    flatRate: z
      .object({
        amount: z.string().optional(),
      })
      .optional(),
  })
  .loose();

const wixPricingVariantSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    pricingStrategies: z.array(wixPricingStrategySchema).optional(),
  })
  .loose();

export const wixPlanSchema = z
  .object({
    id: z.string().optional(),
    _id: z.string().optional(),
    name: z.string(),
    status: z.string().optional(),
    visibility: z.string().optional(),
    buyable: z.boolean().optional(),
    pricingVariants: z.array(wixPricingVariantSchema).optional(),
  })
  .loose();

export type WixPlan = z.infer<typeof wixPlanSchema>;

const queryPlansResponseSchema = z
  .object({
    plans: z.array(wixPlanSchema).default([]),
  })
  .loose();

/**
 * List public pricing plans from Wix Plans V3 REST endpoint.
 * Returns empty array if Wix is not configured or in case of error.
 */
export async function listWixPlans(): Promise<WixPlan[]> {
  if (!isWixConfigured()) return [];
  try {
    const raw = await wixPost<unknown>(
      'https://www.wixapis.com/pricing-plans/v3/plans/query',
      { filter: {} }
    );
    const parsed = queryPlansResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data.plans : [];
  } catch (err) {
    console.warn('[wix:plans] Failed to query Wix plans:', err);
    return [];
  }
}

/**
 * Resolve a Wix plan ID for a given SimDream subscription pass.
 * Priority:
 * 1. Static / env-mapped WIX_PLAN_IDS
 * 2. Dynamic lookup from live Wix plans matching pass price or title
 */
export async function resolveWixPlanId(passId: SubscriptionPassId): Promise<string | null> {
  const staticId = wixPlanIdFor(passId);
  if (staticId) return staticId;

  const pass = findSubscriptionPass(passId);
  if (!pass) return null;

  const livePlans = await listWixPlans();
  if (livePlans.length === 0) return null;

  // Match by price first (flatRate.amount matches pass.priceIls)
  const targetPriceStr = String(pass.priceIls);
  const priceMatch = livePlans.find((plan) => {
    const variantAmount = plan.pricingVariants?.[0]?.pricingStrategies?.[0]?.flatRate?.amount;
    return variantAmount === targetPriceStr;
  });
  if (priceMatch) {
    return priceMatch._id || priceMatch.id || null;
  }

  // Match by session count and minutes (e.g. "5x60" or "10x90")
  const keyPattern = `${pass.sessions}x${pass.sessionMinutes}`;
  const nameMatch = livePlans.find((plan) => {
    const cleanName = plan.name.toLowerCase().replace(/\s+/g, '');
    return cleanName.includes(keyPattern);
  });
  if (nameMatch) {
    return nameMatch._id || nameMatch.id || null;
  }

  return null;
}

export interface PlanCheckoutOptions {
  planId: string;
  baseUrl: string;
  passId?: string;
}

/**
 * Generate a Wix-hosted checkout redirect URL for a pricing plan order.
 */
export async function createPlanCheckoutUrl(options: PlanCheckoutOptions): Promise<string> {
  const client = getWixClient();
  const thankYouUrl = `${options.baseUrl}/subscriptions/thank-you`;
  const postFlowUrl = options.passId
    ? `${options.baseUrl}/subscriptions#${options.passId}`
    : `${options.baseUrl}/subscriptions`;

  const session = await client.redirects.createRedirectSession({
    paidPlansCheckout: {
      planId: options.planId,
    },
    callbacks: {
      postFlowUrl,
      thankYouPageUrl: thankYouUrl,
    },
  });

  const fullUrl = session?.redirectSession?.fullUrl;
  if (!fullUrl) {
    throw new Error('Wix redirects did not return a valid fullUrl.');
  }

  return fullUrl;
}

