import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Two gates refuse to continue unless a successful `Verify` run exists for an exact `main` commit:
// the publish gate in `wix-release.yml` and the release-lineage gate in `ci.yml`. Both read GitHub's
// list of workflow runs. On 2026-11-27 that list, narrowed with `status=completed`, left out the
// completed, successful Verify run of release commit 0336b1d for more than eight minutes while the
// same list without that filter returned it, and the publish of v1.36.0 failed. The run's own
// `conclusion` is the fact both gates need, so neither may depend on that list filter.

const wixReleaseWorkflow = readFileSync('.github/workflows/wix-release.yml', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');

const STEP = '      - name: Require a successful Verify run for this exact main commit\n';
const gateScript = wixReleaseWorkflow
  .split(STEP)[1]
  ?.split('        run: |\n')[1]
  ?.split('\n      - ')[0]
  ?.replace(/^ {10}/gm, '');

const RELEASE_SHA = 'a'.repeat(40);
const REPOSITORY = 'example/repo';

type Run = {
  name: string;
  status: string;
  conclusion: string | null;
  event: string;
  head_branch: string;
  head_sha: string;
  html_url: string;
  /** Mimics the fault seen on GitHub: the run is missing from a list narrowed by `status=`. */
  missingFromStatusFilteredList?: boolean;
};

const verifyRun = (overrides: Partial<Run> = {}): Run => ({
  name: 'Verify',
  status: 'completed',
  conclusion: 'success',
  event: 'push',
  head_branch: 'main',
  head_sha: RELEASE_SHA,
  html_url: 'https://github.com/example/repo/actions/runs/1',
  ...overrides,
});

const codeqlRun: Run = { ...verifyRun(), name: 'CodeQL', html_url: 'https://github.com/example/repo/actions/runs/2' };

const workspaces: string[] = [];

/** Runs the gate's own script against a stand-in `gh` and `git`, so no network or repository is needed. */
function runGate(runs: Run[]) {
  if (!gateScript) throw new Error('Cannot find the Verify attestation step in wix-release.yml');
  const root = mkdtempSync(join(tmpdir(), 'release-gate-'));
  workspaces.push(root);
  writeFileSync(join(root, 'runs.json'), JSON.stringify(runs));
  writeFileSync(join(root, 'requests.log'), '');
  writeFileSync(
    join(root, 'gh'),
    [
      '#!/usr/bin/env node',
      "const { appendFileSync, readFileSync } = require('node:fs');",
      "const { join } = require('node:path');",
      'const [command, target] = process.argv.slice(2);',
      "if (command !== 'api') process.exit(64);",
      "appendFileSync(join(__dirname, 'requests.log'), `${target}\\n`);",
      "const query = new URL(`https://api.github.test/${target}`).searchParams;",
      "const all = JSON.parse(readFileSync(join(__dirname, 'runs.json'), 'utf8'));",
      'const listed = all.filter((run) => {',
      "  if (query.get('head_sha') && run.head_sha !== query.get('head_sha')) return false;",
      "  if (query.get('event') && run.event !== query.get('event')) return false;",
      "  const status = query.get('status');",
      '  if (!status) return true;',
      '  if (run.missingFromStatusFilteredList) return false;',
      '  return run.status === status || run.conclusion === status;',
      '});',
      'process.stdout.write(JSON.stringify({ total_count: listed.length, workflow_runs: listed }));',
      '',
    ].join('\n')
  );
  writeFileSync(join(root, 'git'), `#!/bin/sh\ntest "$1" = rev-list || exit 64\necho ${RELEASE_SHA}\n`);
  chmodSync(join(root, 'gh'), 0o755);
  chmodSync(join(root, 'git'), 0o755);
  const result = spawnSync('bash', ['-e', '-c', gateScript], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${root}:${process.env.PATH ?? ''}`,
      GITHUB_REPOSITORY: REPOSITORY,
      GITHUB_STEP_SUMMARY: join(root, 'summary.md'),
      RELEASE_TAG: 'v9.9.9',
    },
  });
  return {
    status: result.status,
    stderr: result.stderr,
    requests: readFileSync(join(root, 'requests.log'), 'utf8').trim().split('\n').filter(Boolean),
    summary: result.status === 0 ? readFileSync(join(root, 'summary.md'), 'utf8') : '',
  };
}

afterEach(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('publish gate: a successful Verify run for the exact release commit', () => {
  it('accepts the release when the run succeeded', () => {
    const gate = runGate([codeqlRun, verifyRun()]);
    expect(gate.status, gate.stderr).toBe(0);
    expect(gate.summary).toContain('- Verify run: https://github.com/example/repo/actions/runs/1');
    expect(gate.summary).toContain(`- Release commit: \`${RELEASE_SHA}\``);
    expect(gate.requests).toHaveLength(1);
    expect(gate.requests[0]).toContain(`repos/${REPOSITORY}/actions/runs?`);
    expect(gate.requests[0]).toContain(`head_sha=${RELEASE_SHA}`);
  });

  it('accepts the release when the status-filtered list leaves the successful run out', () => {
    const gate = runGate([codeqlRun, verifyRun({ missingFromStatusFilteredList: true })]);
    expect(gate.status, gate.stderr).toBe(0);
    expect(gate.summary).toContain('- Verify run: https://github.com/example/repo/actions/runs/1');
  });

  it.each([
    ['is still running', verifyRun({ status: 'in_progress', conclusion: null })],
    ['is queued', verifyRun({ status: 'queued', conclusion: null })],
    ['failed', verifyRun({ conclusion: 'failure' })],
    ['was cancelled', verifyRun({ conclusion: 'cancelled' })],
    ['was skipped', verifyRun({ conclusion: 'skipped' })],
    ['waits for approval', verifyRun({ conclusion: 'action_required' })],
    ['ran for a pull request', verifyRun({ event: 'pull_request' })],
    ['was started by hand', verifyRun({ event: 'workflow_dispatch' })],
    ['ran on another branch', verifyRun({ head_branch: 'devel/topic' })],
    ['ran for another commit', verifyRun({ head_sha: 'b'.repeat(40) })],
    ['belongs to another workflow', verifyRun({ name: 'CodeQL' })],
  ])('refuses the release when the only Verify run %s', (_case, run) => {
    const gate = runGate([run]);
    expect(gate.status).not.toBe(0);
    expect(gate.stderr).toContain('No successful Verify workflow run exists for this exact main commit.');
  });

  it('refuses the release when there is no run at all', () => {
    expect(runGate([]).status).not.toBe(0);
  });
});

describe('Verify attestation queries', () => {
  const queries = (workflow: string) => [...workflow.matchAll(/actions\/runs\?[^"\s]*head_sha=[^"\s]*/g)].map((match) => match[0]);

  it('never narrow the run list by status in the publish gate or the release-lineage gate', () => {
    const publish = queries(wixReleaseWorkflow);
    const lineage = queries(ciWorkflow);
    expect(publish).toHaveLength(1);
    expect(lineage).toHaveLength(1);
    for (const query of [...publish, ...lineage]) {
      expect(query, query).not.toMatch(/[?&]status=/);
      expect(query, query).toContain('event=push');
    }
  });

  it('still require the run to have concluded successfully on a push to main in the lineage gate', () => {
    expect(ciWorkflow).toContain(
      'select(.name == "Verify" and .conclusion == "success" and .event == "push" and .head_branch == "main")'
    );
  });
});
