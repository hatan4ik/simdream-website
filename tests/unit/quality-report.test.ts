import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('quality report', () => {
  it('includes local and downloaded shard JUnit results without collisions', () => {
    const root = mkdtempSync(join(tmpdir(), 'simdream-report-'));
    try {
      mkdirSync(join(root, 'test-results', 'test-results'), { recursive: true });
      mkdirSync(join(root, 'tests', 'a11y', 'support'), { recursive: true });
      writeFileSync(join(root, 'tests', 'a11y', 'support', 'scan-keys.ts'), '');
      writeFileSync(join(root, 'tests', 'a11y', 'a11y-baseline.json'), '{"scans":{}}');
      writeFileSync(join(root, 'test-results', 'vitest-junit.xml'), '<testsuite tests="4" failures="0" skipped="1"/>');
      writeFileSync(join(root, 'test-results', 'playwright-junit-3803.xml'), '<testsuite tests="3" failures="0"/>');
      writeFileSync(join(root, 'test-results', 'test-results', 'playwright-junit-3812.xml'), '<testsuite tests="5" failures="1"/>');
      writeFileSync(join(root, 'test-results', 'test-results', 'playwright-junit-3815.xml'), '<testsuite tests="6" failures="0"/>');

      const result = spawnSync(process.execPath, ['--import', resolve('node_modules/tsx/dist/loader.mjs'), resolve('scripts/test-all.ts'), '--report-only'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
      });

      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      const report = readFileSync(join(root, 'test-results', 'quality-report.md'), 'utf8');
      expect(report).toContain('| vitest-junit.xml | 4 | 0 | 1 |');
      expect(report).toContain('| playwright-junit-3803.xml | 3 | 0 | 0 |');
      expect(report).toContain('| test-results/playwright-junit-3812.xml | 5 | 1 | 0 |');
      expect(report).toContain('| test-results/playwright-junit-3815.xml | 6 | 0 | 0 |');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
