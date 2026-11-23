import { describe, expect, it } from 'vitest';
import { auditPlanBenefitPools, type PlanBenefitItem } from '@/lib/wix/plan-benefit-pools';

describe('auditPlanBenefitPools', () => {
  it('reports clean report when each plan has at most one unique poolDefinitionId', () => {
    const items: PlanBenefitItem[] = [
      {
        planId: 'plan-foundations-5x60',
        planName: 'Flight Foundations 5x60',
        poolDefinitionId: 'pool-guid-1',
      },
      {
        planId: 'plan-advanced-5x90',
        planName: 'Advanced Captain 5x90',
        poolDefinitionId: 'pool-guid-2',
      },
      {
        planId: 'plan-airline-10x90',
        planName: 'Airline Readiness 10x90',
        poolDefinitionId: null,
      },
    ];

    const report = auditPlanBenefitPools(items);

    expect(report.isClean).toBe(true);
    expect(report.totalPlansAudited).toBe(3);
    expect(report.violations).toHaveLength(0);
    expect(report.summaries).toEqual([
      {
        planId: 'plan-foundations-5x60',
        planName: 'Flight Foundations 5x60',
        poolDefinitionIds: ['pool-guid-1'],
      },
      {
        planId: 'plan-advanced-5x90',
        planName: 'Advanced Captain 5x90',
        poolDefinitionIds: ['pool-guid-2'],
      },
      {
        planId: 'plan-airline-10x90',
        planName: 'Airline Readiness 10x90',
        poolDefinitionIds: [],
      },
    ]);
  });

  it('flags duplicate benefit pool violations when a plan is linked to multiple pools', () => {
    const items: PlanBenefitItem[] = [
      {
        planId: 'plan-foundations-5x60',
        planName: 'Flight Foundations 5x60',
        poolDefinitionId: 'pool-guid-1',
      },
      {
        planId: 'plan-foundations-5x60',
        planName: 'Flight Foundations 5x60',
        poolDefinitionId: 'pool-guid-1-duplicate',
      },
      {
        planId: 'plan-advanced-5x90',
        planName: 'Advanced Captain 5x90',
        poolDefinitionId: 'pool-guid-2',
      },
    ];

    const report = auditPlanBenefitPools(items);

    expect(report.isClean).toBe(false);
    expect(report.totalPlansAudited).toBe(2);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toEqual({
      planId: 'plan-foundations-5x60',
      planName: 'Flight Foundations 5x60',
      duplicateCount: 2,
      poolDefinitionIds: ['pool-guid-1', 'pool-guid-1-duplicate'],
    });
  });

  it('deduplicates identical poolDefinitionId records without false positives', () => {
    const items: PlanBenefitItem[] = [
      {
        planId: 'plan-atpl-10x60',
        planName: 'ATPL 10x60',
        poolDefinitionId: 'pool-shared-abc',
      },
      {
        planId: 'plan-atpl-10x60',
        planName: 'ATPL 10x60',
        poolDefinitionId: 'pool-shared-abc',
      },
    ];

    const report = auditPlanBenefitPools(items);

    expect(report.isClean).toBe(true);
    expect(report.violations).toHaveLength(0);
    expect(report.summaries[0].poolDefinitionIds).toEqual(['pool-shared-abc']);
  });

  it('ignores empty items or whitespace-only poolDefinitionIds', () => {
    const items: PlanBenefitItem[] = [
      {
        planId: '   ',
        planName: 'Ignored',
        poolDefinitionId: 'pool-ignored',
      },
      {
        planId: 'plan-pro-3x90',
        planName: 'PRO 3x90',
        poolDefinitionId: '   ',
      },
    ];

    const report = auditPlanBenefitPools(items);

    expect(report.isClean).toBe(true);
    expect(report.totalPlansAudited).toBe(1);
    expect(report.summaries[0].poolDefinitionIds).toEqual([]);
  });
});
