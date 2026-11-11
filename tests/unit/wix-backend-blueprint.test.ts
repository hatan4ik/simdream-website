import { describe, expect, it } from 'vitest';
import {
  CANONICAL_STAGING_WIX_SITE_ID,
  RETIRED_WIX_SITE_IDS,
  WIX_BACKEND_BLUEPRINT,
  buildWixGiftCardProductPayload,
  buildWixPricingPlanCreatePayload,
  buildWixServiceCreatePayload,
  evaluateWixProvisionSafetyGate,
  planWixBackendProvisioning,
  reconcileGiftCardProduct,
  type WixGiftCardProduct,
  type WixPlan,
  type WixService,
} from '@/lib/wix';

function makeAlignedLiveState(): {
  services: WixService[];
  plans: WixPlan[];
  giftCardProducts: WixGiftCardProduct[];
} {
  const services: WixService[] = WIX_BACKEND_BLUEPRINT.bookingsServices.map((spec) => ({
    id: spec.expectedServiceId,
    name: spec.title,
    type: 'APPOINTMENT',
    hidden: false,
    schedule: {
      availabilityConstraints: {
        sessionDurations: [spec.durationMinutes],
      },
    },
    payment: {
      rateType: 'FIXED',
      fixed: {
        price: {
          value: String(spec.priceIls),
          currency: 'ILS',
        },
      },
    },
    serviceResources: [
      {
        resourceType: { id: 'shared-boeing-737-resource-type' },
      },
    ],
  }));

  const plans: WixPlan[] = WIX_BACKEND_BLUEPRINT.pricingPlans.map((spec, index) => ({
    _id: spec.expectedPlanId ?? `live-plan-${index + 1}`,
    name: spec.name,
    visibility: 'PUBLIC',
    buyable: true,
    pricingVariants: [
      {
        pricingStrategies: [
          {
            flatRate: {
              amount: String(spec.priceIls),
            },
          },
        ],
      },
    ],
  }));

  const giftCardProducts: WixGiftCardProduct[] = [
    {
      id: WIX_BACKEND_BLUEPRINT.giftCardProduct.productId,
      revision: '7',
      name: WIX_BACKEND_BLUEPRINT.giftCardProduct.name,
      presetVariants: WIX_BACKEND_BLUEPRINT.giftCardProduct.allPresetVariants.map((variant) => ({
        id: variant.wixVariantId,
        price: { amount: String(variant.amountIls) },
        value: { amount: String(variant.amountIls) },
        ...(variant.wixMediaId
          ? {
              image: {
                id: variant.wixMediaId,
                url: `https://static.wixstatic.com/media/${variant.wixMediaId}`,
              },
            }
          : {}),
      })),
    },
  ];

  return { services, plans, giftCardProducts };
}

describe('Wix-as-Code Backend Blueprint & Multi-Lock Provisioning Protection', () => {
  it('codifies all 9 Bookings services, 6 Pricing Plans, and 17 Gift Card preset variants', () => {
    expect(WIX_BACKEND_BLUEPRINT.site.canonicalStagingSiteId).toBe(
      CANONICAL_STAGING_WIX_SITE_ID
    );
    expect(WIX_BACKEND_BLUEPRINT.bookingsServices).toHaveLength(9);
    expect(WIX_BACKEND_BLUEPRINT.pricingPlans).toHaveLength(6);
    expect(WIX_BACKEND_BLUEPRINT.giftCardProduct.signatureVariants).toHaveLength(7);
    expect(WIX_BACKEND_BLUEPRINT.giftCardProduct.allPresetVariants).toHaveLength(17);

    const pro60 = WIX_BACKEND_BLUEPRINT.bookingsServices.find(
      (s) => s.packageId === 'pkg-pro-60'
    );
    expect(pro60).toMatchObject({
      durationMinutes: 60,
      reservedMinutes: 75,
      turnaroundBufferMinutes: 15,
      priceIls: 950,
    });
  });

  it('detects 100% alignment when live Wix state matches the blueprint', () => {
    const liveState = makeAlignedLiveState();
    const plan = planWixBackendProvisioning(liveState);

    expect(plan.alreadyFullyProvisioned).toBe(true);
    expect(plan.sharedCapacityResourceAligned).toBe(true);
    expect(plan.summary).toEqual({
      inSyncCount: 22,
      createCount: 0,
      updateCount: 0,
    });
    expect(reconcileGiftCardProduct(liveState.giftCardProducts)).toEqual([]);
  });

  it('plans create actions on an empty disaster-recovery Wix site', () => {
    const plan = planWixBackendProvisioning({
      services: [],
      plans: [],
      giftCardProducts: [],
    });

    expect(plan.alreadyFullyProvisioned).toBe(false);
    expect(plan.sharedCapacityResourceAligned).toBe(false);
    expect(plan.summary).toEqual({
      inSyncCount: 0,
      createCount: 22,
      updateCount: 0,
    });
  });

  it('hard-blocks --apply when the target Wix backend is already provisioned (circuit breaker)', () => {
    const alignedPlan = planWixBackendProvisioning(makeAlignedLiveState());

    const decision = evaluateWixProvisionSafetyGate({
      apply: true,
      targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
      confirmSiteId: CANONICAL_STAGING_WIX_SITE_ID,
      envAllowApply: 'true',
      adminApiKey: 'IST.test-admin-key',
      plan: alignedPlan,
    });

    expect(decision.allowedToMutate).toBe(false);
    expect(decision.blockerCode).toBe('already-provisioned');
    expect(decision.reason).toContain('already 100% provisioned');
  });

  it('enforces all 5 safety locks (dry-run default, forbidden site denylist, site confirmation, env interlock, admin key)', () => {
    const emptyPlan = planWixBackendProvisioning({
      services: [],
      plans: [],
      giftCardProducts: [],
    });

    // Lock 1: dry-run default
    expect(
      evaluateWixProvisionSafetyGate({
        apply: false,
        targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: false,
      blockerCode: 'dry-run-only',
    });

    // Lock 2: retired/forbidden site ID denylist
    expect(
      evaluateWixProvisionSafetyGate({
        apply: true,
        targetSiteId: RETIRED_WIX_SITE_IDS[0],
        confirmSiteId: RETIRED_WIX_SITE_IDS[0],
        envAllowApply: 'true',
        adminApiKey: 'IST.key',
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: false,
      blockerCode: 'forbidden-site-id',
    });

    // Lock 3: missing --confirm-site-id
    expect(
      evaluateWixProvisionSafetyGate({
        apply: true,
        targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        confirmSiteId: 'wrong-site-id',
        envAllowApply: 'true',
        adminApiKey: 'IST.key',
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: false,
      blockerCode: 'missing-site-confirmation',
    });

    // Lock 4: missing WIX_PROVISION_ALLOW_APPLY=true
    expect(
      evaluateWixProvisionSafetyGate({
        apply: true,
        targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        confirmSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        envAllowApply: 'false',
        adminApiKey: 'IST.key',
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: false,
      blockerCode: 'missing-apply-interlock',
    });

    // Lock 5: missing WIX_ADMIN_API_KEY
    expect(
      evaluateWixProvisionSafetyGate({
        apply: true,
        targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        confirmSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        envAllowApply: 'true',
        adminApiKey: '',
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: false,
      blockerCode: 'missing-admin-api-key',
    });

    // All 5 locks satisfied on an unprovisioned recovery site
    expect(
      evaluateWixProvisionSafetyGate({
        apply: true,
        targetSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        confirmSiteId: CANONICAL_STAGING_WIX_SITE_ID,
        envAllowApply: 'true',
        adminApiKey: 'IST.valid-recovery-key',
        plan: emptyPlan,
      })
    ).toMatchObject({
      allowedToMutate: true,
      blockerCode: null,
    });
  });

  it('builds valid Wix REST API payloads for Bookings V2, Pricing Plans V3, and Gift Cards V1', () => {
    const servicePayload = buildWixServiceCreatePayload(
      WIX_BACKEND_BLUEPRINT.bookingsServices[0]!,
      'shared-resource-type-1'
    );
    expect(servicePayload).toMatchObject({
      service: {
        name: WIX_BACKEND_BLUEPRINT.bookingsServices[0]!.title,
        type: 'APPOINTMENT',
        schedule: {
          availabilityConstraints: {
            sessionDurations: [30],
            timeBetweenSessions: 15,
          },
        },
        serviceResources: [{ resourceType: { id: 'shared-resource-type-1' } }],
      },
    });

    const planPayload = buildWixPricingPlanCreatePayload(
      WIX_BACKEND_BLUEPRINT.pricingPlans[0]!
    );
    expect(planPayload).toMatchObject({
      plan: {
        name: WIX_BACKEND_BLUEPRINT.pricingPlans[0]!.name,
        visibility: 'PUBLIC',
        buyable: true,
      },
    });

    const giftCardPayload = buildWixGiftCardProductPayload();
    expect(giftCardPayload).toMatchObject({
      giftCardProduct: {
        id: WIX_BACKEND_BLUEPRINT.giftCardProduct.productId,
        customVariant: {
          minValue: { amount: '50' },
          maxValue: { amount: '5000' },
        },
      },
    });
  });
});

