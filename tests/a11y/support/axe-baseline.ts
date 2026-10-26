import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect } from '../../support/e2e';
import { freezeCssMotion } from '../../usability/support/page';
import { OBSERVED_DIR, observedFileName, readBaseline, type A11yBaseline, type ObservedScan } from './baseline-store';

/** WCAG 2.0, 2.1 and 2.2 success criteria at levels A and AA. */
export const WCAG_A_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/** Impacts that gate the build. Moderate and minor findings are attached to the report only. */
const GATING_IMPACTS = new Set(['serious', 'critical']);

let cachedBaseline: A11yBaseline | undefined;

/**
 * Runs axe against the current page state and enforces the ratcheting baseline:
 * - any serious or critical rule not baselined for `scanKey` fails (new violation);
 * - any baselined rule that no longer fires fails too (stale entry: delete it).
 * The full axe result is attached to the HTML report either way.
 *
 * With A11Y_BASELINE_UPDATE=1 the observed rules are recorded instead; run
 * `npx tsx tests/a11y/update-a11y-baseline.ts` afterwards to merge them.
 */
export async function expectAxeBaseline(page: Page, testInfo: TestInfo, scanKey: string): Promise<void> {
  await freezeCssMotion(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_A_AA_TAGS).analyze();
  await testInfo.attach(`axe-results ${scanKey}`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const gating = results.violations.filter((violation) => GATING_IMPACTS.has(violation.impact ?? ''));
  const observed = [...new Set(gating.map((violation) => violation.id))].sort();

  // Triage aid: A11Y_DUMP_DIR=<dir> writes every gating node (selector, HTML, axe summary) per scan.
  const dumpDir = process.env.A11Y_DUMP_DIR;
  if (dumpDir) {
    mkdirSync(dumpDir, { recursive: true });
    const nodes = gating.flatMap((violation) =>
      violation.nodes.map((node) => ({ rule: violation.id, target: node.target.join(' '), html: node.html, summary: node.failureSummary }))
    );
    writeFileSync(`${dumpDir}/${observedFileName(scanKey)}`, `${JSON.stringify({ scanKey, nodes }, null, 2)}\n`);
  }

  if (process.env.A11Y_BASELINE_UPDATE === '1') {
    mkdirSync(OBSERVED_DIR, { recursive: true });
    const record: ObservedScan = { scanKey, rules: observed };
    writeFileSync(`${OBSERVED_DIR}${observedFileName(scanKey)}`, `${JSON.stringify(record)}\n`);
    testInfo.annotations.push({ type: 'a11y-baseline-recorded', description: `${scanKey}: ${observed.join(', ') || 'clean'}` });
    return;
  }

  cachedBaseline ??= readBaseline();
  const baselined = cachedBaseline.scans[scanKey] ?? [];
  testInfo.annotations.push({
    type: 'a11y-known-violations',
    description: `${scanKey}: ${baselined.join(', ') || 'none'}`,
  });

  const newViolations = gating
    .filter((violation) => !baselined.includes(violation.id))
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}, ${violation.nodes.length} node(s)): ${violation.help} -> ` +
        violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join(' | ')
    );
  const staleBaselineEntries = baselined.filter((ruleId) => !observed.includes(ruleId));

  expect(
    { newViolations, staleBaselineEntries },
    `axe ratchet for "${scanKey}": fix new violations; delete stale entries from tests/a11y/a11y-baseline.json`
  ).toEqual({ newViolations: [], staleBaselineEntries: [] });
}
