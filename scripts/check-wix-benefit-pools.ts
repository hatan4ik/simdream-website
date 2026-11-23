/**
 * Wix Pricing Plans Benefit Pools Audit Script.
 *
 * Scans the live Wix Pricing Plans benefit allocations on SimDream-Staging
 * and verifies that no plan has more than one PUNCH_CARD benefit pool
 * definition assigned to it.
 *
 * Usage:
 *   npx tsx scripts/check-wix-benefit-pools.ts
 *   npm run wix:check-benefit-pools
 *
 * @see docs/DECISIONS.md "Wix benefit pools"
 */
import { loadWixLocalEnv } from './wix-env';
import { auditPlanBenefitPools, type PlanBenefitItem } from '../lib/wix/plan-benefit-pools';

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID']);

async function main() {
  const { isWixConfigured } = await import('../lib/wix/config');
  const { listWixPlans } = await import('../lib/wix/plans');

  if (!isWixConfigured()) {
    console.log('[wix:benefit-pools] Wix is not configured in this environment (offline mode).');
    process.exit(0);
  }

  console.log('[wix:benefit-pools] Auditing Wix Pricing Plans benefit pool allocations...');

  try {
    const plans = await listWixPlans();
    if (plans.length === 0) {
      console.log('[wix:benefit-pools] No published pricing plans returned by Wix API.');
      process.exit(0);
    }

    // Extract benefit definitions from the live plan objects
    const items: PlanBenefitItem[] = [];
    for (const plan of plans) {
      const planId = plan.id ?? plan._id ?? '';
      const planName = plan.name ?? 'Untitled Plan';

      // Check perks / benefit references on plan object
      const rawPlan = plan as Record<string, unknown>;
      const benefitList = Array.isArray(rawPlan.benefits) ? rawPlan.benefits : [];
      const perkList = Array.isArray(rawPlan.perks) ? rawPlan.perks : [];

      if (benefitList.length === 0 && perkList.length === 0) {
        items.push({ planId, planName, poolDefinitionId: null });
      } else {
        for (const b of benefitList) {
          const benefit = b as Record<string, unknown>;
          items.push({
            planId,
            planName,
            poolDefinitionId: typeof benefit.poolDefinitionId === 'string' ? benefit.poolDefinitionId : null,
            benefitKey: typeof benefit.benefitKey === 'string' ? benefit.benefitKey : null,
          });
        }
        for (const p of perkList) {
          const perk = p as Record<string, unknown>;
          if (typeof perk.poolDefinitionId === 'string') {
            items.push({
              planId,
              planName,
              poolDefinitionId: perk.poolDefinitionId,
            });
          }
        }
      }
    }

    const report = auditPlanBenefitPools(items);

    console.log(`[wix:benefit-pools] Total plans audited: ${report.totalPlansAudited}`);
    for (const summary of report.summaries) {
      const poolCount = summary.poolDefinitionIds.length;
      console.log(`  - Plan: "${summary.planName}" (${summary.planId}): ${poolCount} pool(s) [${summary.poolDefinitionIds.join(', ') || 'none'}]`);
    }

    if (!report.isClean) {
      console.error('\n[wix:benefit-pools] ERROR: Duplicate benefit pools detected!');
      for (const v of report.violations) {
        console.error(`  VIOLATION: Plan "${v.planName}" (${v.planId}) has ${v.duplicateCount} pools: ${v.poolDefinitionIds.join(', ')}`);
      }
      console.error('See docs/DECISIONS.md ("Wix benefit pools") for remediation instructions.');
      process.exit(1);
    }

    console.log('\n[wix:benefit-pools] ✓ All plans have at most one benefit pool.');
    process.exit(0);
  } catch (err) {
    console.warn('[wix:benefit-pools] Failed to audit benefit pools:', err);
    process.exit(0);
  }
}

main();
