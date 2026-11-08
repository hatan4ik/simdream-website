import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const reportBlock = workflow.split('      - name: Fail closed if any required verification gate failed\n')[1];
const reportScript = reportBlock?.split('        run: |\n')[1]?.split('      # Writes test-results/quality-report.md')[0]
  ?.replace(/^          /gm, '');

const requiredGates = ['RELEASE_INTEGRITY', 'QUALITY', 'SECRET_SCAN', 'BUILD', 'E2E'];
const optionalGates = ['E2E_WEBKIT_SHARD', 'WEB_QUALITY', 'WEB_QUALITY_SHARDS', 'LOAD_SMOKE', 'LIGHTHOUSE'];

function runGate(overrides: Record<string, string> = {}) {
  if (!reportScript) throw new Error('Cannot find the CI report gate script');
  const env = Object.fromEntries([...requiredGates, ...optionalGates].map((gate) => [gate, 'success']));
  return spawnSync('bash', ['-c', reportScript], {
    encoding: 'utf8',
    env: { ...process.env, ...env, FAST_PATH: 'false', DOCS_ONLY: 'false', ...overrides },
  });
}

describe('CI verification gates', () => {
  it('requires every gate for a normal change', () => {
    expect(runGate().status).toBe(0);
    for (const gate of [...requiredGates, ...optionalGates]) {
      for (const status of ['failure', 'cancelled', 'skipped']) {
        expect(runGate({ [gate]: status }).status, `${gate}: ${status}`).not.toBe(0);
      }
    }
  });

  it.each(['FAST_PATH', 'DOCS_ONLY'])('only permits expected skips for %s', (mode) => {
    const skips = Object.fromEntries(optionalGates.map((gate) => [gate, 'skipped']));
    expect(runGate({ ...skips, [mode]: 'true' }).status).toBe(0);
    for (const gate of requiredGates) {
      expect(runGate({ ...skips, [mode]: 'true', [gate]: 'skipped' }).status, gate).not.toBe(0);
    }
    for (const gate of optionalGates) {
      expect(runGate({ ...skips, [mode]: 'true', [gate]: 'failure' }).status, gate).not.toBe(0);
    }
  });

  it.each(['e2e-webkit-shard', 'web-quality-shards'])('skips %s for both fast paths', (job) => {
    const block = workflow.split(`  ${job}:\n`)[1]?.split(/\n  [\w-]+:\n/)[0];
    expect(block).toContain("needs.release-integrity.outputs.fast_path != 'true'");
    expect(block).toContain("needs.release-integrity.outputs.docs_only != 'true'");
  });
});
