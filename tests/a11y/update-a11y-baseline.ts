/**
 * Merges scans recorded with A11Y_BASELINE_UPDATE=1 into tests/a11y/a11y-baseline.json.
 *
 *   A11Y_BASELINE_UPDATE=1 PW_PORT=3202 npx playwright test --project=a11y
 *   npx tsx tests/a11y/update-a11y-baseline.ts
 *
 * Only keys present in the recording are replaced, so a partial run updates part of the
 * baseline. Review the diff: every added rule is a regression someone must justify.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { BASELINE_PATH, OBSERVED_DIR, readBaseline, type ObservedScan } from './support/baseline-store';

if (!existsSync(OBSERVED_DIR)) {
  console.error(`Nothing recorded in ${OBSERVED_DIR}. Run the a11y project with A11Y_BASELINE_UPDATE=1 first.`);
  process.exit(1);
}

const baseline = readBaseline();
const scans: Record<string, string[]> = { ...baseline.scans };
const files = readdirSync(OBSERVED_DIR).filter((file) => file.endsWith('.json'));
for (const file of files) {
  const observed = JSON.parse(readFileSync(`${OBSERVED_DIR}${file}`, 'utf8')) as ObservedScan;
  scans[observed.scanKey] = observed.rules;
}

const sorted = Object.fromEntries(Object.entries(scans).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(BASELINE_PATH, `${JSON.stringify({ description: baseline.description, scans: sorted }, null, 2)}\n`);
rmSync(OBSERVED_DIR, { recursive: true, force: true });
console.log(`Merged ${files.length} recorded scan(s) into ${BASELINE_PATH}.`);
