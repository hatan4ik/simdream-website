import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * One command for the whole quality framework.
 *
 *   npm run test:all                    typecheck, Vitest + coverage, sandboxed build, e2e (Chromium),
 *                                       a11y / usability / security-web / resilience, visual, load smoke
 *   npm run test:all -- --quick         typecheck + Vitest only (seconds; no browser, no build)
 *   npm run test:all -- --full          e2e on all five browser projects
 *   npm run test:all -- --no-build      reuse an up-to-date .next-test instead of rebuilding
 *   npm run test:all -- --lighthouse    add the Lighthouse budgets stage
 *   npm run test:all -- --bail          stop at the first failing stage
 *   npm run test:all -- --report-only   rebuild test-results/quality-report.md from existing results
 *
 * Every stage runs even after a failure (unless --bail); the exit code is non-zero if any failed.
 */

const flags = new Set(process.argv.slice(2));
const quick = flags.has('--quick');
const full = flags.has('--full');
const bail = flags.has('--bail');

const RESULTS = 'test-results';
const BROWSER_PROJECTS = full ? ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'] : ['chromium'];

interface Stage {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  /** JUnit file the stage writes, summarized in the report. */
  junit?: string;
}

interface StageResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  seconds: number;
}

const playwright = (name: string, port: number, projects: string[]): Stage => ({
  name,
  command: 'npx',
  args: ['playwright', 'test', ...projects.map((project) => `--project=${project}`)],
  // A distinct port per stage gives each its own server, output folder and JUnit file.
  env: { PW_PORT: String(port) },
  junit: `${RESULTS}/playwright-junit-${port}.xml`,
});

const stages: Stage[] = [
  { name: 'Typecheck', command: 'npx', args: ['tsc', '--noEmit', '-p', '.'] },
  {
    name: 'Vitest (unit, integration, security, reliability) + coverage',
    command: 'npx',
    args: ['vitest', 'run', '--coverage', '--reporter=default', '--reporter=junit', `--outputFile.junit=${RESULTS}/vitest-junit.xml`],
    junit: `${RESULTS}/vitest-junit.xml`,
  },
];

if (!quick) {
  if (!flags.has('--no-build')) {
    stages.push({ name: 'Sandboxed production build', command: 'npx', args: ['tsx', 'scripts/run-sandboxed.ts', 'npx', 'next', 'build'] });
  }
  stages.push(
    playwright(`E2E journeys (${BROWSER_PROJECTS.join(', ')})`, 3801, BROWSER_PROJECTS),
    playwright('Accessibility, usability, security-web, resilience', 3802, ['a11y', 'usability', 'security-web', 'resilience']),
    playwright('Visual regression', 3803, ['visual']),
    {
      name: 'Load smoke',
      command: 'npx',
      args: ['tsx', 'scripts/with-server.ts', '--port', '3804', '--', 'npx', 'tsx', 'tests/load/smoke.ts'],
    }
  );
  if (flags.has('--lighthouse')) {
    stages.push({
      name: 'Lighthouse budgets',
      command: 'npx',
      args: ['tsx', 'scripts/with-server.ts', '--port', '3805', '--', 'npx', 'tsx', 'tests/perf/run-lighthouse.ts'],
    });
  }
}

function runStages(): StageResult[] {
  const results: StageResult[] = [];
  let stopped = false;
  for (const stage of stages) {
    if (stopped) {
      results.push({ name: stage.name, status: 'skipped', seconds: 0 });
      continue;
    }
    console.log(`\n━━━ ${stage.name} ━━━`);
    const started = Date.now();
    const run = spawnSync(stage.command, stage.args, { stdio: 'inherit', env: { ...process.env, ...stage.env } });
    const status = run.status === 0 ? 'passed' : 'failed';
    results.push({ name: stage.name, status, seconds: Math.round((Date.now() - started) / 1000) });
    if (status === 'failed' && bail) stopped = true;
  }
  return results;
}

/** Totals from every <testsuite> element of a JUnit file. */
function junitTotals(path: string): { tests: number; failures: number; skipped: number } | null {
  if (!existsSync(path)) return null;
  const xml = readFileSync(path, 'utf8');
  const totals = { tests: 0, failures: 0, skipped: 0 };
  for (const [, attributes] of xml.matchAll(/<testsuite\b([^>]*)>/g)) {
    const attr = (name: string) => Number(new RegExp(`\\b${name}="(\\d+)"`).exec(attributes)?.[1] ?? 0);
    totals.tests += attr('tests');
    totals.failures += attr('failures') + attr('errors');
    totals.skipped += attr('skipped');
  }
  return totals;
}

/** Open known defects: expected-failure markers in the test tree, plus rules the a11y baseline tolerates. */
function openKnownDefects(): string[] {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry)) {
        const source = readFileSync(path, 'utf8');
        // The window spans an it.fails.each table; comments about fixed defects do not say KNOWN-DEFECT.
        for (const [, id] of source.matchAll(/(?:it\.fails|test\.fail)[\s\S]{0,600}?KNOWN-DEFECT ([A-Z0-9]+-\d+)/g)) ids.add(id);
      }
    }
  };
  walk('tests');

  // Defects tolerated by the accessibility baseline: every baselined axe rule maps to one.
  const scanKeys = readFileSync('tests/a11y/support/scan-keys.ts', 'utf8');
  const ruleDefects = new Map(
    [...scanKeys.matchAll(/^\s+'?([a-z-]+)'?: '([A-Z0-9]+-\d+)',$/gm)].map(([, rule, id]) => [rule, id] as const)
  );
  const baseline = JSON.parse(readFileSync('tests/a11y/a11y-baseline.json', 'utf8')) as { scans: Record<string, string[]> };
  for (const rule of new Set(Object.values(baseline.scans).flat())) {
    const id = ruleDefects.get(rule);
    if (id) ids.add(id);
  }
  return [...ids].sort();
}

function writeReport(results: StageResult[]): string {
  const lines: string[] = ['# Quality report', ''];
  if (results.length) {
    lines.push('| Stage | Result | Duration |', '| --- | --- | --- |');
    for (const result of results) {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      lines.push(`| ${result.name} | ${icon} ${result.status} | ${result.seconds}s |`);
    }
    lines.push('');
  }

  // Only this framework's stage outputs; ad-hoc runs on other ports leave their own files.
  const junitFiles = ['vitest-junit.xml', 'playwright-junit-3801.xml', 'playwright-junit-3802.xml', 'playwright-junit-3803.xml'].filter(
    (file) => existsSync(join(RESULTS, file))
  );
  if (junitFiles.length) {
    lines.push('## Test results', '', '| Suite file | Tests | Failed | Skipped |', '| --- | --- | --- | --- |');
    for (const file of junitFiles) {
      const totals = junitTotals(join(RESULTS, file));
      if (totals) lines.push(`| ${file} | ${totals.tests} | ${totals.failures} | ${totals.skipped} |`);
    }
    lines.push('', 'Expected failures (open known defects) count as passed.', '');
  }

  const coveragePath = join(RESULTS, 'coverage', 'coverage-summary.json');
  if (existsSync(coveragePath)) {
    const total = JSON.parse(readFileSync(coveragePath, 'utf8')).total as Record<string, { pct: number }>;
    lines.push(
      '## Coverage (server code)',
      '',
      `Lines ${total.lines.pct}% · Branches ${total.branches.pct}% · Functions ${total.functions.pct}% · Statements ${total.statements.pct}%`,
      ''
    );
  }

  const loadPath = join(RESULTS, 'load-smoke.json');
  if (existsSync(loadPath)) {
    const load = JSON.parse(readFileSync(loadPath, 'utf8')) as {
      passed: boolean;
      endpoints: Array<{ name: string; requestsPerSecond: number; latencyMs: { p99: number }; p99BudgetMs: number; errors: number; non2xx: number }>;
    };
    lines.push('## Load smoke', '', '| Endpoint | Req/s | p99 | Budget | Errors |', '| --- | --- | --- | --- | --- |');
    for (const endpoint of load.endpoints) {
      lines.push(
        `| ${endpoint.name} | ${endpoint.requestsPerSecond} | ${endpoint.latencyMs.p99} ms | ${endpoint.p99BudgetMs} ms | ${endpoint.errors + endpoint.non2xx} |`
      );
    }
    lines.push('');
  }

  const defects = openKnownDefects();
  lines.push(
    '## Open known defects',
    '',
    defects.length
      ? `${defects.join(', ')}. Details and remediation: tests/KNOWN_DEFECTS.md.`
      : 'None. No expected-failure markers remain and the accessibility baseline is empty.',
    ''
  );

  mkdirSync(RESULTS, { recursive: true });
  const markdown = lines.join('\n');
  writeFileSync(join(RESULTS, 'quality-report.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  return markdown;
}

const results = flags.has('--report-only') ? [] : runStages();
console.log(`\n${writeReport(results)}`);
console.log(`Report written to ${RESULTS}/quality-report.md`);
process.exit(results.some((result) => result.status === 'failed') ? 1 : 0);
