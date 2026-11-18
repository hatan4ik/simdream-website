import type { WixPricingPlanBlueprintSpec } from './backend-blueprint';

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
      currency: 'ILS',
      perks: [
        { id: crypto.randomUUID(), description: `${spec.sessions} captain-led Boeing 737 sessions of ${spec.sessionMinutes} minutes.` },
        { id: crypto.randomUUID(), description: `Valid for ${spec.validityMonths} months from purchase.` },
      ],
      pricingVariants: [
        {
          // Wix Pricing Plans v3 rejects a create whose variants or perks carry no GUID.
          id: crypto.randomUUID(),
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
