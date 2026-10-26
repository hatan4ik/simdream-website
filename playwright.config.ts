import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { SERVER_SANDBOX_ENV, TEST_DIST_DIR } from './tests/support/test-env';

// Tests run against the sandboxed production build (`npm run test:build`), as the Next.js
// docs recommend. PW_PORT lets several suites run side by side on one machine.
const PORT = Number(process.env.PW_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);

/** Newest modification time of the app sources a build depends on. */
function newestSourceMtime(paths: string[]): number {
  let newest = 0;
  const visit = (path: string) => {
    if (!existsSync(path)) return;
    const stats = statSync(path);
    if (stats.isDirectory()) readdirSync(path).forEach((entry) => visit(join(path, entry)));
    else newest = Math.max(newest, stats.mtimeMs);
  };
  paths.forEach(visit);
  return newest;
}

// A browser verdict on a missing or out-of-date build is meaningless, so refuse to run.
// CI builds in the same workflow; locally PW_ALLOW_STALE_BUILD=1 overrides the age check.
const buildId = join(TEST_DIST_DIR, 'BUILD_ID');
if (!existsSync(buildId)) {
  throw new Error(`No test build in ${TEST_DIST_DIR}/. Run \`npm run test:build\` first.`);
}
if (!isCI && !process.env.PW_ALLOW_STALE_BUILD) {
  const sources = ['app', 'components', 'lib', 'types', 'public', 'proxy.ts', 'next.config.mjs', 'package-lock.json'];
  if (newestSourceMtime(sources) > statSync(buildId).mtimeMs) {
    throw new Error(
      `The test build in ${TEST_DIST_DIR}/ is older than the app sources. Run \`npm run test:build\` ` +
        '(or set PW_ALLOW_STALE_BUILD=1 to test the old build on purpose).'
    );
  }
}
// Playwright empties its output folders on start; per-port folders keep parallel runs apart.
const runSuffix = process.env.PW_PORT ? `-${PORT}` : '';

const desktopChrome = devices['Desktop Chrome'];

export default defineConfig({
  testDir: 'tests',
  outputDir: `test-results/playwright${runSuffix}`,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  failOnFlakyTests: isCI,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  // Screenshot baselines are per-platform. Locally a missing one is recorded (and the check
  // passes); in CI that would compare nothing, so a missing Linux baseline fails there instead.
  updateSnapshots: isCI ? 'none' : 'missing',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `playwright-report${runSuffix}` }],
    ['junit', { outputFile: `test-results/playwright-junit${runSuffix}.xml` }],
  ],
  use: {
    baseURL,
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    url: `${baseURL}/api/packages`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: SERVER_SANDBOX_ENV,
  },
  projects: [
    // Customer journeys across engines and form factors.
    { name: 'chromium', testDir: 'tests/e2e', use: { ...desktopChrome } },
    { name: 'firefox', testDir: 'tests/e2e', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testDir: 'tests/e2e', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', testDir: 'tests/e2e', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', testDir: 'tests/e2e', use: { ...devices['iPhone 15'] } },
    // Quality dimensions run once, on Chromium.
    { name: 'a11y', testDir: 'tests/a11y', use: { ...desktopChrome } },
    { name: 'usability', testDir: 'tests/usability', use: { ...desktopChrome } },
    { name: 'security-web', testDir: 'tests/security-web', use: { ...desktopChrome } },
    { name: 'resilience', testDir: 'tests/resilience', use: { ...desktopChrome } },
    {
      name: 'visual',
      testDir: 'tests/visual',
      use: { ...desktopChrome, viewport: { width: 1280, height: 800 } },
    },
  ],
});
