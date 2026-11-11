import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  SUBSCRIPTION_PASSES,
  type SubscriptionPassId,
} from '@/lib/data/subscription-passes';
import {
  GIFT_CARD_DESIGNS,
  MIN_GIFT_VOUCHER_AMOUNT_ILS,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';
import { getReservedMinutesForFlight } from '@/lib/scheduler/kantorovich-engine';
import {
  WIX_GIFT_CARDS_APP_ID,
  WIX_GIFT_CARD_PRODUCT_ID,
  WIX_GIFT_CARD_VARIANT_IDS,
  WIX_PLAN_IDS,
  WIX_SERVICE_IDS,
} from './catalog';
import { WIX_TIME_ZONE } from './config';
import {
  reconcileCatalog,
  sharedWixResourceTypeIds,
  type WixService,
} from './bookings';
import {
  reconcileGiftCardProduct,
  type WixGiftCardProduct,
} from './gift-cards';
import type { WixPlan } from './plans';

/**
 * Canonical writable Wix Headless staging/recovery target (`AGENTS.md` §6.7).
 */
export const CANONICAL_STAGING_WIX_SITE_ID = '317b0c6d-6608-499a-bb3c-b1c37650e460';

/**
 * Retired or forbidden Wix metasite IDs that must NEVER be written to from this repository (`AGENTS.md` §6.7).
 */
export const RETIRED_WIX_SITE_IDS = [
  '4c5e1c7a-163c-48ce-8278-cdc42e4deed4',
] as const;

export interface WixServiceBlueprintSpec {
  packageId: string;
  expectedServiceId: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  reservedMinutes: number;
  turnaroundBufferMinutes: number;
  priceIls: number;
  primeTimePriceIls: number;
  type: 'APPOINTMENT';
  daytimePromoWindow: {
    days: readonly ('SUN' | 'MON' | 'TUE')[];
    beforeLocalTime: '18:00';
  } | null;
}

export interface WixPricingPlanBlueprintSpec {
  passId: SubscriptionPassId;
  expectedPlanId: string | null;
  name: string;
  summary: string;
  priceIls: number;
  sessions: 3 | 5 | 10;
  sessionMinutes: 60 | 90;
  validityMonths: 12;
  eligiblePackageId: string;
  eligibleServiceId: string;
}

export interface WixGiftCardSignatureVariantSpec {
  designId: GiftCardDesignId;
  amountIls: number;
  wixVariantId: string;
  wixMediaId: string;
}

export interface WixGiftCardPresetVariantSpec {
  amountIls: number;
  wixVariantId: string;
  designId: GiftCardDesignId | null;
  wixMediaId: string | null;
}

export interface WixBackendBlueprint {
  site: {
    canonicalStagingSiteId: string;
    retiredSiteIds: readonly string[];
    timeZone: string;
    currency: 'ILS';
    operatingWindow: {
      days: readonly ('SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT')[];
      openTime: '09:00';
      closeTime: '24:00';
      totalMinutesPerDay: 900;
    };
  };
  sharedResourcePool: {
    name: string;
    capacity: 1;
    locationAddress: string;
  };
  bookingsServices: readonly WixServiceBlueprintSpec[];
  pricingPlans: readonly WixPricingPlanBlueprintSpec[];
  giftCardProduct: {
    appId: string;
    productId: string;
    name: string;
    description: string;
    minCustomAmountIls: number;
    maxCustomAmountIls: number;
    signatureVariants: readonly WixGiftCardSignatureVariantSpec[];
    allPresetVariants: readonly WixGiftCardPresetVariantSpec[];
  };
}

const SERVICE_BLUEPRINTS: readonly WixServiceBlueprintSpec[] = SIMULATOR_PACKAGES.map((pkg) => {
  const reservedMinutes = getReservedMinutesForFlight(pkg.durationMinutes);
  const turnaroundBufferMinutes = Math.max(0, reservedMinutes - pkg.durationMinutes);
  const expectedServiceId = WIX_SERVICE_IDS[pkg.id] ?? '';

  return {
    packageId: pkg.id,
    expectedServiceId,
    title: pkg.title,
    description: pkg.description,
    category: pkg.category,
    durationMinutes: pkg.durationMinutes,
    reservedMinutes,
    turnaroundBufferMinutes,
    priceIls: pkg.priceIls,
    primeTimePriceIls: pkg.id === 'pkg-ultimate-90' ? 950 : pkg.priceIls,
    type: 'APPOINTMENT',
    daytimePromoWindow:
      pkg.id === 'pkg-promo-45'
        ? { days: ['SUN', 'MON', 'TUE'] as const, beforeLocalTime: '18:00' as const }
        : null,
  };
});

const PRICING_PLAN_BLUEPRINTS: readonly WixPricingPlanBlueprintSpec[] = SUBSCRIPTION_PASSES.map(
  (pass) => ({
    passId: pass.id,
    expectedPlanId: WIX_PLAN_IDS[pass.id] ?? null,
    name: pass.copy.en.title,
    summary: pass.copy.en.summary,
    priceIls: pass.priceIls,
    sessions: pass.sessions,
    sessionMinutes: pass.sessionMinutes,
    validityMonths: pass.validityMonths,
    eligiblePackageId: pass.packageId,
    eligibleServiceId: WIX_SERVICE_IDS[pass.packageId] ?? '',
  })
);

const SIGNATURE_GIFT_CARD_VARIANTS: readonly WixGiftCardSignatureVariantSpec[] =
  GIFT_CARD_DESIGNS.map((design) => ({
    designId: design.id,
    amountIls: design.amountIls,
    wixVariantId: design.wixVariantId,
    wixMediaId: design.wixMediaId,
  }));

const ALL_PRESET_GIFT_CARD_VARIANTS: readonly WixGiftCardPresetVariantSpec[] = Object.entries(
  WIX_GIFT_CARD_VARIANT_IDS
)
  .map(([amountStr, wixVariantId]) => {
    const amountIls = Number(amountStr);
    const matchingDesign = GIFT_CARD_DESIGNS.find((design) => design.amountIls === amountIls);
    return {
      amountIls,
      wixVariantId,
      designId: matchingDesign?.id ?? null,
      wixMediaId: matchingDesign?.wixMediaId ?? null,
    };
  })
  .sort((a, b) => a.amountIls - b.amountIls);

/**
 * Declarative Wix-as-Code Backend Blueprint.
 * Captures every Wix Bookings service, shared simulator capacity pool,
 * Pricing Plan subscription, and Gift Card product/variant configuration
 * required to audit or reconstruct the SimDream Wix Headless backend.
 */
export const WIX_BACKEND_BLUEPRINT: WixBackendBlueprint = {
  site: {
    canonicalStagingSiteId: CANONICAL_STAGING_WIX_SITE_ID,
    retiredSiteIds: RETIRED_WIX_SITE_IDS,
    timeZone: WIX_TIME_ZONE,
    currency: 'ILS',
    operatingWindow: {
      days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      openTime: '09:00',
      closeTime: '24:00',
      totalMinutesPerDay: 900,
    },
  },
  sharedResourcePool: {
    name: 'Boeing 737-800 NG & MAX Flight Deck Simulator',
    capacity: 1,
    locationAddress: 'Gershon Shatz St 36, Tel Aviv-Yafo, Israel',
  },
  bookingsServices: SERVICE_BLUEPRINTS,
  pricingPlans: PRICING_PLAN_BLUEPRINTS,
  giftCardProduct: {
    appId: WIX_GIFT_CARDS_APP_ID,
    productId: WIX_GIFT_CARD_PRODUCT_ID,
    name: 'SimDream Boeing 737 Flight Simulator Gift Card',
    description:
      'Digital gift card and flight voucher for the SimDream Boeing 737 Flight Simulator in Tel Aviv.',
    minCustomAmountIls: MIN_GIFT_VOUCHER_AMOUNT_ILS,
    maxCustomAmountIls: 5000,
    signatureVariants: SIGNATURE_GIFT_CARD_VARIANTS,
    allPresetVariants: ALL_PRESET_GIFT_CARD_VARIANTS,
  },
};

export type WixProvisionActionKind = 'in_sync' | 'create' | 'update';

export interface WixProvisionPlanItem {
  domain: 'bookings_service' | 'pricing_plan' | 'gift_card_variant';
  localId: string;
  title: string;
  expectedWixId: string | null;
  matchedWixId: string | null;
  action: WixProvisionActionKind;
  driftFields: string[];
  reason: string;
}

export interface WixBackendLiveState {
  services: readonly WixService[];
  plans: readonly WixPlan[];
  giftCardProducts: readonly WixGiftCardProduct[];
}

export interface WixBackendProvisionPlan {
  services: WixProvisionPlanItem[];
  pricingPlans: WixProvisionPlanItem[];
  giftCardVariants: WixProvisionPlanItem[];
  sharedCapacityResourceTypeIds: string[];
  sharedCapacityResourceAligned: boolean;
  giftCardProductPresent: boolean;
  alreadyFullyProvisioned: boolean;
  summary: {
    inSyncCount: number;
    createCount: number;
    updateCount: number;
  };
}

function matchLivePlan(
  spec: WixPricingPlanBlueprintSpec,
  livePlans: readonly WixPlan[]
): WixPlan | undefined {
  if (spec.expectedPlanId) {
    const byId = livePlans.find(
      (plan) => (plan._id ?? plan.id) === spec.expectedPlanId
    );
    if (byId) return byId;
  }

  const targetPrice = String(spec.priceIls);
  const byPrice = livePlans.find((plan) => {
    const amount = plan.pricingVariants?.[0]?.pricingStrategies?.[0]?.flatRate?.amount;
    return amount === targetPrice;
  });
  if (byPrice) return byPrice;

  const keyPattern = `${spec.sessions}x${spec.sessionMinutes}`;
  return livePlans.find((plan) =>
    plan.name.toLowerCase().replace(/\s+/g, '').includes(keyPattern)
  );
}

/**
 * Pure, read-only reconciliation planner that compares the live Wix backend
 * state against `WIX_BACKEND_BLUEPRINT`.
 *
 * It never performs a network write. When all services, plans, gift card
 * variants, and the shared simulator resource pool are aligned, it sets
 * `alreadyFullyProvisioned: true` so the safety gate refuses accidental
 * re-provisioning.
 */
export function planWixBackendProvisioning(
  liveState: WixBackendLiveState
): WixBackendProvisionPlan {
  const catalogMismatches = reconcileCatalog([...liveState.services]);
  const mismatchesByPackage = new Map<string, string[]>();
  for (const mismatch of catalogMismatches) {
    const list = mismatchesByPackage.get(mismatch.packageId) ?? [];
    list.push(`${mismatch.field} (expected ${mismatch.expected}, got ${mismatch.actual})`);
    mismatchesByPackage.set(mismatch.packageId, list);
  }

  const servicesById = new Map(liveState.services.map((svc) => [svc.id, svc]));
  const servicesByName = new Map(liveState.services.map((svc) => [svc.name, svc]));

  const serviceItems: WixProvisionPlanItem[] = WIX_BACKEND_BLUEPRINT.bookingsServices.map(
    (spec) => {
      const byId = servicesById.get(spec.expectedServiceId);
      const byName = servicesByName.get(spec.title);
      const matched = byId ?? byName;

      if (!matched) {
        return {
          domain: 'bookings_service',
          localId: spec.packageId,
          title: spec.title,
          expectedWixId: spec.expectedServiceId,
          matchedWixId: null,
          action: 'create',
          driftFields: ['missing'],
          reason: `No Wix Bookings service found for ${spec.packageId} (${spec.title}).`,
        };
      }

      const packageDrifts = mismatchesByPackage.get(spec.packageId) ?? [];
      const nonMissingDrifts = packageDrifts.filter((entry) => !entry.startsWith('missing'));
      if (matched.id !== spec.expectedServiceId) {
        nonMissingDrifts.push(`serviceId (expected ${spec.expectedServiceId}, got ${matched.id})`);
      }

      if (nonMissingDrifts.length > 0) {
        return {
          domain: 'bookings_service',
          localId: spec.packageId,
          title: spec.title,
          expectedWixId: spec.expectedServiceId,
          matchedWixId: matched.id,
          action: 'update',
          driftFields: nonMissingDrifts,
          reason: `Service ${matched.id} drifted: ${nonMissingDrifts.join('; ')}.`,
        };
      }

      return {
        domain: 'bookings_service',
        localId: spec.packageId,
        title: spec.title,
        expectedWixId: spec.expectedServiceId,
        matchedWixId: matched.id,
        action: 'in_sync',
        driftFields: [],
        reason: `Aligned with Wix service ${matched.id} (${spec.durationMinutes}m / ₪${spec.priceIls}).`,
      };
    }
  );

  const planItems: WixProvisionPlanItem[] = WIX_BACKEND_BLUEPRINT.pricingPlans.map((spec) => {
    const matched = matchLivePlan(spec, liveState.plans);
    const matchedId = matched?._id ?? matched?.id ?? null;

    if (!matched || !matchedId) {
      return {
        domain: 'pricing_plan',
        localId: spec.passId,
        title: spec.name,
        expectedWixId: spec.expectedPlanId,
        matchedWixId: null,
        action: 'create',
        driftFields: ['missing'],
        reason: `No published Wix Pricing Plan found for ${spec.passId} (₪${spec.priceIls}).`,
      };
    }

    const driftFields: string[] = [];
    const liveAmount =
      matched.pricingVariants?.[0]?.pricingStrategies?.[0]?.flatRate?.amount;
    if (liveAmount && liveAmount !== String(spec.priceIls)) {
      driftFields.push(`price (expected ${spec.priceIls}, got ${liveAmount})`);
    }
    if (spec.expectedPlanId && matchedId !== spec.expectedPlanId) {
      driftFields.push(`planId (expected ${spec.expectedPlanId}, got ${matchedId})`);
    }

    if (driftFields.length > 0) {
      return {
        domain: 'pricing_plan',
        localId: spec.passId,
        title: spec.name,
        expectedWixId: spec.expectedPlanId,
        matchedWixId: matchedId,
        action: 'update',
        driftFields,
        reason: `Plan ${matchedId} drifted: ${driftFields.join('; ')}.`,
      };
    }

    return {
      domain: 'pricing_plan',
      localId: spec.passId,
      title: spec.name,
      expectedWixId: spec.expectedPlanId,
      matchedWixId: matchedId,
      action: 'in_sync',
      driftFields: [],
      reason: `Aligned with Wix Pricing Plan ${matchedId} (₪${spec.priceIls}).`,
    };
  });

  const giftCardMismatches = reconcileGiftCardProduct(liveState.giftCardProducts);
  const giftCardProduct =
    liveState.giftCardProducts.find((prod) => prod.id === WIX_GIFT_CARD_PRODUCT_ID) ??
    liveState.giftCardProducts[0];
  const giftCardProductPresent = Boolean(giftCardProduct);

  const giftCardItems: WixProvisionPlanItem[] =
    WIX_BACKEND_BLUEPRINT.giftCardProduct.signatureVariants.map((spec) => {
      const mismatches = giftCardMismatches.filter(
        (m) => m.designId === spec.designId || m.field === 'product_missing'
      );
      const liveVariant =
        giftCardProduct?.presetVariants.find((v) => v.id === spec.wixVariantId) ??
        giftCardProduct?.presetVariants.find(
          (v) => Number(v.price.amount) === spec.amountIls
        );

      if (!giftCardProduct || !liveVariant) {
        return {
          domain: 'gift_card_variant',
          localId: `gift-card-${spec.designId}-${spec.amountIls}`,
          title: `Gift Card ${spec.designId} (₪${spec.amountIls})`,
          expectedWixId: spec.wixVariantId,
          matchedWixId: null,
          action: 'create',
          driftFields: mismatches.map((m) => m.field),
          reason: `Missing preset variant for ${spec.designId} (₪${spec.amountIls}).`,
        };
      }

      if (mismatches.length > 0) {
        return {
          domain: 'gift_card_variant',
          localId: `gift-card-${spec.designId}-${spec.amountIls}`,
          title: `Gift Card ${spec.designId} (₪${spec.amountIls})`,
          expectedWixId: spec.wixVariantId,
          matchedWixId: liveVariant.id,
          action: 'update',
          driftFields: mismatches.map(
            (m) => `${m.field} (expected ${m.expected}, got ${m.actual})`
          ),
          reason: `Variant ${liveVariant.id} drifted for ${spec.designId} (₪${spec.amountIls}).`,
        };
      }

      return {
        domain: 'gift_card_variant',
        localId: `gift-card-${spec.designId}-${spec.amountIls}`,
        title: `Gift Card ${spec.designId} (₪${spec.amountIls})`,
        expectedWixId: spec.wixVariantId,
        matchedWixId: liveVariant.id,
        action: 'in_sync',
        driftFields: [],
        reason: `Aligned with Wix Gift Card variant ${liveVariant.id} (₪${spec.amountIls}).`,
      };
    });

  const sharedCapacityResourceTypeIds = sharedWixResourceTypeIds(
    liveState.services,
    WIX_BACKEND_BLUEPRINT.bookingsServices.map((s) => s.expectedServiceId)
  );
  const sharedCapacityResourceAligned = sharedCapacityResourceTypeIds.length > 0;

  const allItems = [...serviceItems, ...planItems, ...giftCardItems];
  const inSyncCount = allItems.filter((item) => item.action === 'in_sync').length;
  const createCount = allItems.filter((item) => item.action === 'create').length;
  const updateCount = allItems.filter((item) => item.action === 'update').length;

  const alreadyFullyProvisioned =
    createCount === 0 &&
    updateCount === 0 &&
    sharedCapacityResourceAligned &&
    giftCardProductPresent;

  return {
    services: serviceItems,
    pricingPlans: planItems,
    giftCardVariants: giftCardItems,
    sharedCapacityResourceTypeIds,
    sharedCapacityResourceAligned,
    giftCardProductPresent,
    alreadyFullyProvisioned,
    summary: {
      inSyncCount,
      createCount,
      updateCount,
    },
  };
}

export type WixProvisionSafetyBlockerCode =
  | 'dry-run-only'
  | 'forbidden-site-id'
  | 'already-provisioned'
  | 'missing-site-confirmation'
  | 'missing-apply-interlock'
  | 'missing-admin-api-key';

export interface WixProvisionSafetyGateInput {
  apply: boolean;
  targetSiteId: string | null | undefined;
  confirmSiteId?: string | null | undefined;
  envAllowApply?: string | null | undefined;
  adminApiKey?: string | null | undefined;
  plan: Pick<WixBackendProvisionPlan, 'alreadyFullyProvisioned' | 'summary'>;
  additionalForbiddenSiteIds?: readonly string[];
}

export interface WixProvisionSafetyGateDecision {
  allowedToMutate: boolean;
  blockerCode: WixProvisionSafetyBlockerCode | null;
  reason: string;
}

/**
 * Multi-Lock Safety Gate protecting the live Wix backend from accidental
 * recreation, duplicate service/plan creation, or targeting a forbidden site.
 *
 * Even if `--apply` is passed, this gate refuses to run against an
 * `alreadyFullyProvisioned` site (`blockerCode: 'already-provisioned'`).
 */
export function evaluateWixProvisionSafetyGate(
  input: WixProvisionSafetyGateInput
): WixProvisionSafetyGateDecision {
  const siteId = (input.targetSiteId ?? '').trim();
  const forbiddenIds = new Set<string>([
    ...RETIRED_WIX_SITE_IDS,
    ...(input.additionalForbiddenSiteIds ?? []),
  ]);

  if (siteId && forbiddenIds.has(siteId)) {
    return {
      allowedToMutate: false,
      blockerCode: 'forbidden-site-id',
      reason: `Site ID "${siteId}" is on the forbidden/retired Wix site denylist (AGENTS.md §6.7).`,
    };
  }

  if (!input.apply) {
    return {
      allowedToMutate: false,
      blockerCode: 'dry-run-only',
      reason:
        'Running in read-only --dry-run mode (default). Zero writes will be sent to Wix.',
    };
  }

  if (!siteId) {
    return {
      allowedToMutate: false,
      blockerCode: 'forbidden-site-id',
      reason: 'WIX_SITE_ID is missing; refusing to run --apply against an unidentified Wix site.',
    };
  }

  // Circuit breaker: NEVER recreate or mutate a site that is already 100% aligned!
  if (input.plan.alreadyFullyProvisioned) {
    return {
      allowedToMutate: false,
      blockerCode: 'already-provisioned',
      reason:
        'Target Wix site is already 100% provisioned and aligned (9/9 services, shared simulator resource pool, 4/4 plans, 7/7 gift card variants). Refusing to recreate or mutate live backend entities.',
    };
  }

  const confirmedSiteId = (input.confirmSiteId ?? '').trim();
  if (!confirmedSiteId || confirmedSiteId !== siteId) {
    return {
      allowedToMutate: false,
      blockerCode: 'missing-site-confirmation',
      reason: `Missing or mismatched --confirm-site-id. Must explicitly pass --confirm-site-id=${siteId}.`,
    };
  }

  if (input.envAllowApply !== 'true') {
    return {
      allowedToMutate: false,
      blockerCode: 'missing-apply-interlock',
      reason:
        'Environment interlock WIX_PROVISION_ALLOW_APPLY=true is not set; refusing to mutate Wix backend.',
    };
  }

  if (!(input.adminApiKey ?? '').trim()) {
    return {
      allowedToMutate: false,
      blockerCode: 'missing-admin-api-key',
      reason:
        'Privileged WIX_ADMIN_API_KEY is missing from environment; visitor OAuth tokens cannot mutate Wix catalog definitions.',
    };
  }

  return {
    allowedToMutate: true,
    blockerCode: null,
    reason: `All 5 safety locks cleared for recovery site ${siteId} (${input.plan.summary.createCount} create, ${input.plan.summary.updateCount} update).`,
  };
}

/**
 * Builds the canonical Wix Bookings V2 service creation payload (`POST /_api/bookings/v2/services`)
 * for disaster-recovery provisioning on a clean Headless site.
 */
export function buildWixServiceCreatePayload(
  spec: WixServiceBlueprintSpec,
  sharedResourceTypeId: string
): Record<string, unknown> {
  return {
    service: {
      name: spec.title,
      description: spec.description,
      type: spec.type,
      hidden: false,
      schedule: {
        availabilityConstraints: {
          sessionDurations: [spec.durationMinutes],
          timeBetweenSessions: spec.turnaroundBufferMinutes,
        },
      },
      payment: {
        rateType: 'FIXED',
        fixed: {
          price: {
            value: String(spec.priceIls),
            currency: WIX_BACKEND_BLUEPRINT.site.currency,
          },
        },
        options: {
          online: true,
          inPerson: false,
        },
      },
      serviceResources: [
        {
          resourceType: { id: sharedResourceTypeId },
        },
      ],
    },
  };
}

/**
 * Builds the canonical Wix Pricing Plans V3 creation payload (`POST /pricing-plans/v3/plans`)
 * for a 12-month single-payment flight subscription pass.
 */
export function buildWixPricingPlanCreatePayload(
  spec: WixPricingPlanBlueprintSpec
): Record<string, unknown> {
  return {
    plan: {
      name: spec.name,
      description: spec.summary,
      visibility: 'PUBLIC',
      buyable: true,
      pricingVariants: [
        {
          name: `${spec.sessions} × ${spec.sessionMinutes} min · 12 months`,
          pricingStrategies: [
            {
              flatRate: {
                amount: String(spec.priceIls),
              },
            },
          ],
          duration: {
            unit: 'MONTH',
            count: spec.validityMonths,
          },
        },
      ],
    },
  };
}

/**
 * Builds the canonical Wix Gift Cards V1 product update payload
 * preserving existing variant UUIDs while ensuring all 17 preset denominations
 * and the 7 signature design media bindings exist.
 */
export function buildWixGiftCardProductPayload(
  existingProduct?: WixGiftCardProduct
): Record<string, unknown> {
  const existingByAmount = new Map(
    (existingProduct?.presetVariants ?? []).map((v) => [Number(v.price.amount), v])
  );

  const presetVariants = WIX_BACKEND_BLUEPRINT.giftCardProduct.allPresetVariants.map(
    (spec) => {
      const existing = existingByAmount.get(spec.amountIls);
      const amountStr = String(spec.amountIls);
      return {
        id: existing?.id ?? spec.wixVariantId,
        price: { amount: amountStr },
        value: { amount: amountStr },
        ...(spec.wixMediaId
          ? {
              image: {
                id: spec.wixMediaId,
                url: `https://static.wixstatic.com/media/${spec.wixMediaId}`,
              },
            }
          : existing?.image
            ? { image: existing.image }
            : {}),
      };
    }
  );

  return {
    giftCardProduct: {
      id: existingProduct?.id ?? WIX_BACKEND_BLUEPRINT.giftCardProduct.productId,
      ...(existingProduct?.revision ? { revision: existingProduct.revision } : {}),
      name: existingProduct?.name ?? WIX_BACKEND_BLUEPRINT.giftCardProduct.name,
      description:
        existingProduct?.description ?? WIX_BACKEND_BLUEPRINT.giftCardProduct.description,
      presetVariants,
      customVariant: {
        minValue: {
          amount: String(WIX_BACKEND_BLUEPRINT.giftCardProduct.minCustomAmountIls),
        },
        maxValue: {
          amount: String(WIX_BACKEND_BLUEPRINT.giftCardProduct.maxCustomAmountIls),
        },
      },
    },
  };
}

