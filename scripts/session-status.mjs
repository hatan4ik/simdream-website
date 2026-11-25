#!/usr/bin/env node
/**
 * Read-only snapshot for the start of a session, or after a reboot:  npm run status
 *
 * About thirty lines that replace ten or fifteen exploratory commands: the checkout (branch, changed files,
 * how far behind origin/main, stashes, commits that exist only on this machine), the open pull requests with
 * their check counts, main's latest CI runs, the latest release against the latest Wix publish, the last
 * nightly run, and a two-request health check of the staging site. It needs git and an authenticated `gh`;
 * any source that cannot be read prints "unavailable" instead of failing. It writes nothing, and the only
 * host it ever requests is the staging site (the same rule as the staging runners).
 */
import { execFileSync } from 'node:child_process';

export const STAGING_URL = 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com';
const ARTICLE_PATH = '/post/en/does-autopilot-land-alone';

/** Counts check runs and status contexts from the `statusCheckRollup` of `gh pr list --json`. */
export function summarizeChecks(rollup) {
  const counts = { pass: 0, fail: 0, pending: 0, skipped: 0 };
  for (const item of rollup ?? []) {
    if (item.__typename === 'StatusContext') {
      if (item.state === 'SUCCESS') counts.pass += 1;
      else if (item.state === 'PENDING' || item.state === 'EXPECTED') counts.pending += 1;
      else counts.fail += 1;
    } else if (item.status !== 'COMPLETED') {
      counts.pending += 1;
    } else if (item.conclusion === 'SUCCESS' || item.conclusion === 'NEUTRAL') {
      counts.pass += 1;
    } else if (item.conclusion === 'SKIPPED') {
      counts.skipped += 1;
    } else {
      counts.fail += 1;
    }
  }
  return counts;
}

export function describePr(pr) {
  const { pass, fail, pending } = summarizeChecks(pr.statusCheckRollup);
  return `#${pr.number} [${pr.mergeStateStatus}] ${pass} pass, ${fail} fail, ${pending} pending  ${String(pr.title).slice(0, 70)}`;
}

const utcTime = (iso) => `${/T(\d\d:\d\d)/.exec(iso ?? '')?.[1] ?? '??:??'}Z`;

export function describeRun(run) {
  return `${run.workflowName} ${run.status === 'completed' ? run.conclusion : run.status} ${utcTime(run.createdAt)}`;
}

/** Turns the collected facts into the printed lines. A `null` source means it could not be read. */
export function formatSnapshot({ now, checkout, prs, mainRuns, release, publish, nightly, staging }) {
  const lines = [`SESSION STATUS (read-only) ${now}`];
  lines.push(
    `Checkout: branch ${checkout.branch ?? 'unknown'} | ${checkout.changed} changed file(s) | ${checkout.behind} behind origin/main | ${checkout.stashes} stash(es)`
  );
  if (checkout.changed > 0) lines.push(`WARNING: ${checkout.changed} changed file(s) here are not committed; a reboot or another session can lose or clash with them.`);
  if (checkout.unpushed.length > 0) lines.push(`WARNING: unpushed commits that exist only on this machine: ${checkout.unpushed.slice(0, 3).join(' | ')}`);
  if (prs === null) lines.push('Open PRs: unavailable (is gh installed and logged in?)');
  else if (prs.length === 0) lines.push('Open PRs: none');
  else {
    lines.push('Open PRs:');
    for (const pr of prs) lines.push(`  ${pr}`);
  }
  lines.push(`Main CI: ${mainRuns ? mainRuns.join(' | ') : 'unavailable'}`);
  lines.push(`Latest release: ${release ?? 'unavailable'} | Wix publish: ${publish ?? 'unavailable'}`);
  lines.push(`Nightly: ${nightly ?? 'unavailable'}`);
  if (staging === null) lines.push(`Staging ${STAGING_URL}: unavailable`);
  else {
    lines.push(`Staging ${STAGING_URL}:`);
    for (const line of staging) lines.push(`  ${line}`);
  }
  lines.push('Next: docs/PROJECT_STATE.md ("Next step"), then the "Working rules" and "Open" sections of docs/DECISIONS.md.');
  return lines;
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function runJson(command, args) {
  const out = run(command, args);
  try {
    return out ? JSON.parse(out) : null;
  } catch {
    return null;
  }
}

const countLines = (text) => (text ? text.split('\n').filter(Boolean).length : 0);

function collectCheckout() {
  run('git', ['fetch', '-q', 'origin']);
  return {
    branch: run('git', ['branch', '--show-current']),
    changed: countLines(run('git', ['status', '--short'])),
    behind: Number(run('git', ['rev-list', '--count', 'HEAD..origin/main']) ?? 0),
    stashes: countLines(run('git', ['stash', 'list'])),
    unpushed: (run('git', ['log', '--branches', '--not', '--remotes', '--oneline', '-n', '5']) ?? '').split('\n').filter(Boolean),
  };
}

function collectGithub() {
  const prs = runJson('gh', ['pr', 'list', '--state', 'open', '--json', 'number,title,mergeStateStatus,statusCheckRollup']);
  const mainRuns = runJson('gh', ['run', 'list', '--branch', 'main', '--limit', '3', '--json', 'workflowName,status,conclusion,createdAt']);
  const releases = runJson('gh', ['release', 'list', '--limit', '1', '--json', 'tagName,publishedAt']);
  const publishes = runJson('gh', ['run', 'list', '--workflow', 'wix-release.yml', '--limit', '1', '--json', 'status,conclusion,createdAt']);
  const nightlies = runJson('gh', ['run', 'list', '--workflow', 'nightly.yml', '--limit', '1', '--json', 'status,conclusion,createdAt,event']);

  const latest = releases?.[0];
  const publish = publishes?.[0];
  const release = latest ? `${latest.tagName} (${latest.publishedAt.slice(0, 10)} ${utcTime(latest.publishedAt)})` : null;
  const publishText = publish
    ? `${publish.status === 'completed' ? publish.conclusion : publish.status} ${utcTime(publish.createdAt)}${latest && publish.createdAt < latest.publishedAt ? ' (older than the latest release)' : ''}`
    : null;
  const nightly = nightlies?.[0] ? `${nightlies[0].event} ${nightlies[0].status === 'completed' ? nightlies[0].conclusion : nightlies[0].status} ${nightlies[0].createdAt.slice(0, 10)} ${utcTime(nightlies[0].createdAt)}` : null;
  return { prs: prs ? prs.map(describePr) : null, mainRuns: mainRuns ? mainRuns.map(describeRun) : null, release, publish: publishText, nightly };
}

async function checkStaging() {
  try {
    const home = await fetch(`${STAGING_URL}/`, { headers: { Cookie: 'simdream_smoke=1' }, signal: AbortSignal.timeout(20_000) });
    const homeBody = await home.text();
    const article = await fetch(`${STAGING_URL}${ARTICLE_PATH}`, { headers: { Cookie: 'simdream_smoke=1' }, signal: AbortSignal.timeout(20_000) });
    const articleBody = await article.text();
    const canonical = /rel="canonical" href="([^"]*)"/.exec(articleBody)?.[1] ?? '';
    return [
      `/ with a Cookie header: HTTP ${home.status}${/Error while running user code/.test(homeBody) ? ', ERROR PAGE' : ', no error page'}`,
      `${ARTICLE_PATH}: HTTP ${article.status}, ${canonical.endsWith(ARTICLE_PATH) ? 'own canonical' : 'CANONICAL IS NOT ITS OWN (Hebrew fallback?)'}`,
    ];
  } catch {
    return null;
  }
}

async function main() {
  const github = collectGithub();
  const snapshot = {
    now: new Date().toISOString().slice(0, 16) + 'Z',
    checkout: collectCheckout(),
    ...github,
    staging: await checkStaging(),
  };
  console.log(formatSnapshot(snapshot).join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(String(error?.message ?? error));
    process.exit(1);
  });
}
