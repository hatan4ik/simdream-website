import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  STAGING_URL,
  describePr,
  describeRun,
  formatSnapshot,
  summarizeChecks,
} from '../../scripts/session-status.mjs';
import { REPO_ROOT } from './_support/source';

// `npm run status` is the one cheap read a new session (or the owner after a reboot) does first. It is read-only,
// prints about thirty lines, and only ever requests the staging site.
const checkRun = (status: string, conclusion: string | null) => ({ __typename: 'CheckRun', status, conclusion });
const statusContext = (state: string) => ({ __typename: 'StatusContext', state });

describe('summarizeChecks', () => {
  it('counts passed, failed, pending and skipped checks', () => {
    const counts = summarizeChecks([
      checkRun('COMPLETED', 'SUCCESS'),
      checkRun('COMPLETED', 'NEUTRAL'),
      checkRun('COMPLETED', 'SKIPPED'),
      checkRun('COMPLETED', 'FAILURE'),
      checkRun('COMPLETED', 'CANCELLED'),
      checkRun('COMPLETED', 'ACTION_REQUIRED'),
      checkRun('IN_PROGRESS', null),
      checkRun('QUEUED', null),
      statusContext('SUCCESS'),
      statusContext('PENDING'),
      statusContext('FAILURE'),
    ]);
    expect(counts).toEqual({ pass: 3, fail: 4, pending: 3, skipped: 1 });
  });

  it('treats a missing rollup as no checks', () => {
    expect(summarizeChecks(undefined)).toEqual({ pass: 0, fail: 0, pending: 0, skipped: 0 });
    expect(summarizeChecks(null)).toEqual({ pass: 0, fail: 0, pending: 0, skipped: 0 });
  });
});

describe('describePr and describeRun', () => {
  it('shows number, merge state, check counts and title for a pull request', () => {
    const line = describePr({
      number: 330,
      title: 'chore(main): release 1.32.6',
      mergeStateStatus: 'BLOCKED',
      statusCheckRollup: [checkRun('COMPLETED', 'SUCCESS'), checkRun('COMPLETED', 'FAILURE'), checkRun('IN_PROGRESS', null)],
    });
    expect(line).toContain('#330');
    expect(line).toContain('BLOCKED');
    expect(line).toContain('1 pass');
    expect(line).toContain('1 fail');
    expect(line).toContain('1 pending');
    expect(line).toContain('chore(main): release 1.32.6');
  });

  it('shows a finished run with its conclusion and an unfinished one with its status, with the UTC time', () => {
    expect(describeRun({ workflowName: 'Verify', status: 'completed', conclusion: 'success', createdAt: '2026-11-25T00:35:26Z' })).toBe('Verify success 00:35Z');
    expect(describeRun({ workflowName: 'Verify', status: 'in_progress', conclusion: '', createdAt: '2026-11-25T00:35:26Z' })).toBe('Verify in_progress 00:35Z');
  });
});

describe('formatSnapshot', () => {
  const full = {
    now: '2026-11-25T01:55Z',
    checkout: { branch: 'main', changed: 0, behind: 0, stashes: 0, unpushed: [] as string[] },
    prs: ['#330 [CLEAN] 20 pass, 0 fail, 0 pending  chore(main): release 1.32.6'],
    mainRuns: ['Verify success 00:55Z', 'CodeQL success 00:55Z'],
    release: 'v1.32.6 (2026-11-25 00:49Z)',
    publish: 'completed success 00:55Z',
    nightly: 'completed success 02:00Z',
    staging: ['/ with a Cookie header: HTTP 200, no error page', '/post/en/does-autopilot-land-alone: own canonical'],
  };

  it('prints a short, fixed-shape snapshot', () => {
    const lines = formatSnapshot(full);
    expect(lines.length).toBeLessThanOrEqual(30);
    expect(lines[0]).toContain('2026-11-25T01:55Z');
    expect(lines.join('\n')).toContain('Open PRs');
    expect(lines.join('\n')).toContain('v1.32.6');
    expect(lines.join('\n')).toContain('PROJECT_STATE.md');
  });

  it('says "none" when there are no open pull requests, and warns about work that a reboot would lose', () => {
    const quiet = formatSnapshot({ ...full, prs: [] }).join('\n');
    expect(quiet).toMatch(/Open PRs:\s*none/);
    expect(quiet).not.toMatch(/WARNING/);
    const risky = formatSnapshot({
      ...full,
      checkout: { branch: 'devel/x', changed: 3, behind: 2, stashes: 1, unpushed: ['abc1234 wip'] },
    }).join('\n');
    expect(risky).toMatch(/WARNING.*3 changed file/);
    expect(risky).toMatch(/WARNING.*unpushed/);
    expect(risky).toMatch(/behind origin\/main/);
  });

  it('degrades to "unavailable" instead of failing when a source cannot be read', () => {
    const lines = formatSnapshot({ ...full, prs: null, mainRuns: null, release: null, publish: null, nightly: null, staging: null }).join('\n');
    expect(lines).toMatch(/Open PRs:\s*unavailable/);
    expect(lines).toMatch(/Staging.*unavailable/);
  });
});

describe('staging-only', () => {
  it('requests only the staging site', () => {
    expect(STAGING_URL).toBe('https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com');
    const source = readFileSync(path.join(REPO_ROOT, 'scripts/session-status.mjs'), 'utf8');
    const hosts = [...source.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((match) => new URL(match[0]).origin);
    expect([...new Set(hosts)]).toEqual([STAGING_URL]);
  });
});
