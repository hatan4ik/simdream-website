/**
 * Lighthouse CI budgets for /, /book and /pro (config: tests/perf/lighthouserc.json).
 *
 *   npx tsx scripts/run-sandboxed.ts npx next start -p 3202 -H 127.0.0.1   # production build, sandboxed secrets
 *   npx tsx tests/perf/run-lighthouse.ts
 *
 * Uses Playwright's Chromium so no separate Chrome install is needed. LHCI writes its raw
 * runs to tests/perf/.lighthouseci and HTML/JSON reports to tests/perf/reports. Set
 * LHCI_BASE_URL (e.g. http://127.0.0.1:3100) or PW_PORT to audit a server on another port.
 * Exit code is non-zero when an "error" assertion fails; "warn" budgets only print.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const LHCI_VERSION = '0.15.1';
const AUDITED_PATHS = ['/', '/book', '/pro'];

const perfDir = fileURLToPath(new URL('.', import.meta.url));
const args = ['--yes', `@lhci/cli@${LHCI_VERSION}`, 'autorun', '--config=./lighthouserc.json'];
// lighthouserc.json targets port 3202; LHCI_BASE_URL, or the suite's PW_PORT, points it elsewhere.
const baseUrl = (process.env.LHCI_BASE_URL ?? (process.env.PW_PORT ? `http://127.0.0.1:${process.env.PW_PORT}` : undefined))?.replace(
  /\/$/,
  ''
);
if (baseUrl) args.push(...AUDITED_PATHS.map((path) => `--collect.url=${baseUrl}${path}`));

const result = spawnSync('npx', args, {
  cwd: perfDir,
  stdio: 'inherit',
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
});
process.exit(result.status ?? 1);
