import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: `${root}tests/support/server-only-stub.ts` },
      { find: /^@\/(.*)$/, replacement: `${root}$1` },
    ],
  },
  test: {
    // Server logic runs in Node; browser behaviour is covered by Playwright.
    environment: 'node',
    // Seed data and local-date helpers depend on the process time zone; pin it so results
    // do not change with the developer's machine (2026-11-01 is a US DST changeover day).
    env: { TZ: 'Asia/Jerusalem' },
    setupFiles: ['tests/support/vitest.setup.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    testTimeout: 20_000,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/vitest-junit.xml' },
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['lib/i18n/translations.ts', 'lib/db/seed-data.ts', '**/*.d.ts'],
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'test-results/coverage',
      // Ratchet: a little below measured coverage (2026-10-25). Raise these as coverage
      // grows; never lower them to make a change pass.
      thresholds: {
        lines: 83,
        branches: 76,
        functions: 83,
        statements: 83,
        'lib/scheduler/**': { lines: 97, branches: 94, functions: 98, statements: 97 },
        'lib/validation.ts': { lines: 98, branches: 98, functions: 98, statements: 98 },
        'lib/auth/**': { lines: 95, branches: 86, functions: 98, statements: 94 },
        'lib/booking/**': { lines: 98, branches: 97, functions: 88, statements: 96 },
        'app/api/**': { lines: 96, branches: 95, functions: 90, statements: 95 },
      },
    },
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['tests/integration/**/*.test.ts'] } },
      { extends: true, test: { name: 'security', include: ['tests/security/**/*.test.ts'] } },
      { extends: true, test: { name: 'reliability', include: ['tests/reliability/**/*.test.ts'] } },
    ],
  },
});
