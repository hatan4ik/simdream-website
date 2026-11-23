/**
 * Pure audit and reconciliation logic for Wix Pricing Plans benefit pools.
 *
 * Each pricing plan linked to a Bookings service should have at most one
 * unique `poolDefinitionId` (PUNCH_CARD pool). The Wix Dashboard's "connect
 * plan to service" action creates a new pool definition on every linkage,
 * which can cause duplicate benefit pools and multiplied sessions.
 *
 * @see docs/DECISIONS.md "Wix benefit pools"
 */

export interface PlanBenefitItem {
  planId: string;
  planName: string;
  poolDefinitionId?: string | null;
  benefitKey?: string | null;
}

export interface PlanBenefitPoolSummary {
  planId: string;
  planName: string;
  poolDefinitionIds: string[];
}

export interface DuplicateBenefitPoolViolation {
  planId: string;
  planName: string;
  duplicateCount: number;
  poolDefinitionIds: string[];
}

export interface PlanBenefitPoolAuditReport {
  isClean: boolean;
  totalPlansAudited: number;
  summaries: PlanBenefitPoolSummary[];
  violations: DuplicateBenefitPoolViolation[];
}

/**
 * Audits a collection of plan benefit items from the Wix Pricing Plans API
 * and flags any plan associated with more than one unique pool definition ID.
 */
export function auditPlanBenefitPools(items: readonly PlanBenefitItem[]): PlanBenefitPoolAuditReport {
  const byPlan = new Map<string, { planName: string; pools: Set<string> }>();

  for (const item of items) {
    const planId = (item.planId ?? '').trim();
    if (!planId) continue;

    let entry = byPlan.get(planId);
    if (!entry) {
      entry = { planName: item.planName || planId, pools: new Set() };
      byPlan.set(planId, entry);
    }

    const poolId = (item.poolDefinitionId ?? '').trim();
    if (poolId) {
      entry.pools.add(poolId);
    }
  }

  const summaries: PlanBenefitPoolSummary[] = [];
  const violations: DuplicateBenefitPoolViolation[] = [];

  for (const [planId, { planName, pools }] of byPlan.entries()) {
    const poolDefinitionIds = Array.from(pools).sort();
    summaries.push({ planId, planName, poolDefinitionIds });

    if (poolDefinitionIds.length > 1) {
      violations.push({
        planId,
        planName,
        duplicateCount: poolDefinitionIds.length,
        poolDefinitionIds,
      });
    }
  }

  return {
    isClean: violations.length === 0,
    totalPlansAudited: summaries.length,
    summaries,
    violations,
  };
}
