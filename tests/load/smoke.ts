/**
 * Load smoke: ~10 seconds of concurrent traffic against a production build.
 *
 *   npx tsx scripts/run-sandboxed.ts npx next start -p 3304 -H 127.0.0.1   # in another shell
 *   BASE_URL=http://127.0.0.1:3304 npx tsx tests/load/smoke.ts
 *
 * Fails (exit 1) on any connection error, timeout or non-2xx response, or when an
 * endpoint's p99 latency exceeds its budget. Writes test-results/load-smoke.json.
 * Exit 2 means the run could not start (server unreachable, bad options).
 *
 * Budgets (p99, 2xx only) come from a measured baseline: `next start` with the
 * in-memory store on an 8-core Intel i9 MacBook shared with other test suites
 * (load average 340-700), 4 endpoints x 4 connections in parallel, 3 runs.
 * Worst p99 observed: home 1632 ms, /book 1485 ms, /api/packages 616 ms,
 * /api/slots 728 ms. Budgets add about 50% headroom. On dedicated CI hardware set
 * LOAD_BUDGET_SCALE (for example 0.5) to tighten them; never raise it to hide a regression.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

interface AutocannonOptions {
  url: string;
  title: string;
  connections: number;
  duration: number;
  /** Seconds before a request counts as a timeout. */
  timeout: number;
  pipelining: number;
}

interface AutocannonResult {
  title: string;
  url: string;
  requests: { average: number; total: number; sent: number };
  latency: { average: number; p50: number; p90: number; p99: number; max: number };
  errors: number;
  timeouts: number;
  non2xx: number;
  duration: number;
}

type Autocannon = (options: AutocannonOptions, done: (error: Error | null, result: AutocannonResult) => void) => unknown;

/**
 * autocannon ships CommonJS without type definitions; the interfaces above cover
 * what this script reads. If the installed copy cannot load (a broken dependency
 * tree), the smoke falls back to a built-in closed-loop driver with the same
 * metrics and the same pass/fail rules, and says so in the report.
 */
function loadAutocannon(): { engine: Autocannon | null; reason?: string } {
  try {
    return { engine: createRequire(import.meta.url)('autocannon') as Autocannon };
  } catch (error) {
    return { engine: null, reason: error instanceof Error ? error.message.split('\n')[0] : String(error) };
  }
}

const BASE_URL = (process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PW_PORT ?? 3304}`).replace(/\/$/, '');
const DURATION_SECONDS = Number(process.env.LOAD_DURATION_SECONDS ?? 10);
const CONNECTIONS_PER_ENDPOINT = Number(process.env.LOAD_CONNECTIONS_PER_ENDPOINT ?? 4);
const REQUEST_TIMEOUT_SECONDS = 10;
const REPORT_PATH = path.resolve('test-results/load-smoke.json');
const BUDGET_SCALE = Number(process.env.LOAD_BUDGET_SCALE ?? 1);

/** Next Sunday (a full Sun–Thu operating day) in Israel time, never today. */
function nextIsraelSunday(now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7 || 7));
  return date.toISOString().slice(0, 10);
}

interface Endpoint {
  name: string;
  path: string;
  p99BudgetMs: number;
}

const ENDPOINTS: Endpoint[] = [
  { name: 'home page', path: '/', p99BudgetMs: 2_500 },
  { name: 'booking page', path: '/book', p99BudgetMs: 2_500 },
  { name: 'packages API', path: '/api/packages', p99BudgetMs: 1_000 },
  { name: 'slots API', path: `/api/slots?date=${nextIsraelSunday()}&duration=60`, p99BudgetMs: 1_100 },
].map((endpoint) => ({ ...endpoint, p99BudgetMs: Math.round(endpoint.p99BudgetMs * BUDGET_SCALE) }));

function runWithAutocannon(autocannon: Autocannon, options: AutocannonOptions): Promise<AutocannonResult> {
  return new Promise((resolve, reject) => {
    autocannon(options, (error, result) => (error ? reject(error) : resolve(result)));
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]);
}

/** Fallback driver: `connections` workers issue back-to-back requests for `duration` seconds. */
async function runBuiltIn(options: AutocannonOptions): Promise<AutocannonResult> {
  const latencies: number[] = [];
  let sent = 0;
  let completed = 0;
  let errors = 0;
  let timeouts = 0;
  let non2xx = 0;
  const startedAt = performance.now();
  const deadline = startedAt + options.duration * 1_000;

  async function worker() {
    while (performance.now() < deadline) {
      const requestStartedAt = performance.now();
      sent += 1;
      try {
        const response = await fetch(options.url, { signal: AbortSignal.timeout(options.timeout * 1_000) });
        await response.arrayBuffer();
        completed += 1;
        // Like autocannon, only 2xx responses contribute to the latency histogram.
        if (response.status >= 200 && response.status < 300) latencies.push(performance.now() - requestStartedAt);
        else non2xx += 1;
      } catch (error) {
        errors += 1;
        if (error instanceof Error && error.name === 'TimeoutError') timeouts += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: options.connections }, () => worker()));
  const elapsedSeconds = (performance.now() - startedAt) / 1_000;
  latencies.sort((a, b) => a - b);
  const average = latencies.length ? latencies.reduce((total, value) => total + value, 0) / latencies.length : 0;
  return {
    title: options.title,
    url: options.url,
    requests: { average: Math.round(completed / elapsedSeconds), total: completed, sent },
    latency: {
      average: Math.round(average),
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p99: percentile(latencies, 99),
      max: percentile(latencies, 100),
    },
    errors,
    timeouts,
    non2xx,
    duration: Math.round(elapsedSeconds),
  };
}

async function assertServerReachable(): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/packages`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`GET /api/packages answered ${response.status}`);
  } catch (error) {
    console.error(`Load smoke cannot reach ${BASE_URL}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Start the server first: npx tsx scripts/run-sandboxed.ts npx next start -p ${new URL(BASE_URL).port || 3304} -H 127.0.0.1`);
    process.exit(2);
  }
}

function evaluate(endpoint: Endpoint, result: AutocannonResult) {
  const failures: string[] = [];
  if (result.requests.total === 0) failures.push('no request completed');
  if (result.errors > 0) failures.push(`${result.errors} connection errors`);
  if (result.timeouts > 0) failures.push(`${result.timeouts} timeouts`);
  if (result.non2xx > 0) failures.push(`${result.non2xx} non-2xx responses`);
  if (result.latency.p99 > endpoint.p99BudgetMs) {
    failures.push(`p99 ${result.latency.p99} ms exceeds the ${endpoint.p99BudgetMs} ms budget`);
  }
  return {
    name: endpoint.name,
    path: endpoint.path,
    p99BudgetMs: endpoint.p99BudgetMs,
    requests: result.requests.total,
    requestsPerSecond: result.requests.average,
    latencyMs: {
      average: result.latency.average,
      p50: result.latency.p50,
      p90: result.latency.p90,
      p99: result.latency.p99,
      max: result.latency.max,
    },
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
    passed: failures.length === 0,
    failures,
  };
}

async function main(): Promise<void> {
  if (!(BUDGET_SCALE > 0) || !(DURATION_SECONDS > 0) || !(CONNECTIONS_PER_ENDPOINT >= 1)) {
    console.error('LOAD_BUDGET_SCALE and LOAD_DURATION_SECONDS must be positive; LOAD_CONNECTIONS_PER_ENDPOINT at least 1.');
    process.exit(2);
  }
  await assertServerReachable();
  const { engine: autocannon, reason } = loadAutocannon();
  const engine = autocannon ? 'autocannon' : `built-in (autocannon unavailable: ${reason})`;
  if (!autocannon) console.warn(`autocannon could not be loaded (${reason}); using the built-in driver.`);
  const startedAt = new Date().toISOString();
  console.log(
    `Load smoke: ${ENDPOINTS.length} endpoints x ${CONNECTIONS_PER_ENDPOINT} connections for ${DURATION_SECONDS}s against ${BASE_URL}`
  );

  // All endpoints run in parallel, so each budget holds under the combined load.
  const results = await Promise.all(
    ENDPOINTS.map((endpoint) => {
      const options: AutocannonOptions = {
        url: `${BASE_URL}${endpoint.path}`,
        title: endpoint.name,
        connections: CONNECTIONS_PER_ENDPOINT,
        duration: DURATION_SECONDS,
        timeout: REQUEST_TIMEOUT_SECONDS,
        pipelining: 1,
      };
      return autocannon ? runWithAutocannon(autocannon, options) : runBuiltIn(options);
    })
  );
  const endpoints = ENDPOINTS.map((endpoint, index) => evaluate(endpoint, results[index]));
  const passed = endpoints.every((endpoint) => endpoint.passed);

  const report = {
    engine,
    baseUrl: BASE_URL,
    startedAt,
    durationSeconds: DURATION_SECONDS,
    budgetScale: BUDGET_SCALE,
    connectionsPerEndpoint: CONNECTIONS_PER_ENDPOINT,
    totalConnections: CONNECTIONS_PER_ENDPOINT * ENDPOINTS.length,
    passed,
    endpoints,
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.table(
    endpoints.map((endpoint) => ({
      endpoint: endpoint.name,
      requests: endpoint.requests,
      'req/s': endpoint.requestsPerSecond,
      'p50 ms': endpoint.latencyMs.p50,
      'p99 ms': endpoint.latencyMs.p99,
      'budget ms': endpoint.p99BudgetMs,
      result: endpoint.passed ? 'pass' : endpoint.failures.join('; '),
    }))
  );
  console.log(`Report written to ${REPORT_PATH}`);
  if (!passed) process.exit(1);
}

main().catch((error: unknown) => {
  console.error('Load smoke crashed:', error);
  process.exit(2);
});
