#!/usr/bin/env node
/**
 * `npm audit --audit-level=high` with a short, reviewed list of exceptions.
 *
 * An exception names one advisory, says why it is safe, and expires. It never widens the gate:
 * every other high or critical advisory still fails, an expired exception fails, and an exception
 * whose advisory now has a patched version fails so it gets removed instead of forgotten.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** @type {ReadonlyArray<{ advisory: string; reason: string; expires: string }>} */
export const AUDIT_EXCEPTIONS = [];

const BLOCKING = new Set(['high', 'critical']);

/** Every advisory object npm reports (transitive `via` strings repeat one of these). */
export function advisoriesOf(report) {
  const found = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === 'object' && via.url) found.set(via.url, via);
    }
  }
  return [...found.values()];
}

/** Pure decision: which advisories block, which exceptions were used, which exceptions are unusable. */
export function evaluateAudit(report, today, exceptions = AUDIT_EXCEPTIONS) {
  const byAdvisory = new Map(exceptions.map((entry) => [entry.advisory, entry]));
  const blocking = [];
  const excused = [];
  const problems = [];

  for (const advisory of advisoriesOf(report)) {
    if (!BLOCKING.has(advisory.severity)) continue;
    const id = String(advisory.url).split('/').pop();
    const exception = byAdvisory.get(id);
    if (!exception) {
      blocking.push(`${advisory.severity} ${id} ${advisory.name}: ${advisory.title}`);
    } else if (exception.expires < today) {
      problems.push(`The exception for ${id} expired on ${exception.expires}; remove it or review it again.`);
    } else {
      excused.push(`${id} ${advisory.name} (until ${exception.expires}): ${exception.reason}`);
    }
  }

  const seen = new Set(advisoriesOf(report).map((advisory) => String(advisory.url).split('/').pop()));
  for (const exception of exceptions) {
    if (!seen.has(exception.advisory)) {
      problems.push(`The exception for ${exception.advisory} no longer matches an advisory; delete it from scripts/audit-gate.mjs.`);
    }
  }
  return { blocking, excused, problems, ok: blocking.length === 0 && problems.length === 0 };
}

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything; the JSON report is still on stdout.
    if (error.stdout) return String(error.stdout);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const today = new Date().toISOString().slice(0, 10);
  const result = evaluateAudit(JSON.parse(runAudit()), today);
  for (const line of result.excused) console.log(`excepted: ${line}`);
  for (const line of result.blocking) console.error(`BLOCKING: ${line}`);
  for (const line of result.problems) console.error(`EXCEPTION PROBLEM: ${line}`);
  if (!result.ok) process.exit(1);
  console.log('npm audit: no high or critical advisory outside the reviewed exceptions.');
}
