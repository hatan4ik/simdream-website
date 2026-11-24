import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { restoreUtf8Literals } from './wix-worker-charset.mjs';
import { findBrokenCookieImports } from './wix-worker-guards.mjs';

const outputDirectory = resolve(process.cwd(), '.wix-worker');
const workerPath = resolve(outputDirectory, 'worker.js');
const sourceMapPath = resolve(outputDirectory, 'worker.js.map');
const entryPath = resolve(outputDirectory, 'entry.mjs');

// Wix accepts a deployment of about 20 MB; a 12.5 MiB worker released fine and a
// 16.0 MiB one was refused with HTTP 413 (2026-11-09). The budget keeps a margin
// under the smallest refused size so a bundle regression fails here, in CI, and
// not in the production release. Override only to investigate, never to ship.
const WORKER_BUDGET_BYTES = Number(process.env.WIX_WORKER_BUDGET_BYTES) || 14 * 1024 * 1024;

// Wix requires this conventional server entry name. Wrangler has already
// bundled the OpenNext module graph into worker.js for an ESM runtime; a missing
// worker.js fails the read below with ENOENT, no separate existence check needed.
await rm(sourceMapPath, { force: true });

// Wrangler's esbuild writes non-ASCII text as `\uXXXX` escapes; this site is mostly
// Hebrew, Arabic and Russian, so emit it as UTF-8 like esbuild's `charset: 'utf8'`.
const escapedWorker = await readFile(workerPath, 'utf8');
const utf8Worker = restoreUtf8Literals(escapedWorker);
await writeFile(workerPath, utf8Worker, 'utf8');

// OpenNext writes the middleware before wrangler minifies it, so the `import_cookie` binding is still
// readable here; in worker.js the names are mangled. A missing file means the OpenNext layout changed
// and this guard must be updated, so fail instead of skipping it.
const middlewarePath = resolve(process.cwd(), '.open-next/middleware/handler.mjs');
const middlewareSource = await readFile(middlewarePath, 'utf8').catch(() => {
  throw new Error(`Cannot read ${middlewarePath}: the OpenNext middleware layout changed, update scripts/wix-worker-guards.mjs.`);
});
const brokenCookieImports = findBrokenCookieImports(middlewareSource);
if (brokenCookieImports.length > 0) {
  throw new Error(
    `The Wix worker bundles the cookie parser without esbuild's node-mode flag (${brokenCookieImports[0]}). ` +
      "Every request that carries a Cookie header would answer HTTP 500 (\"Cannot read properties of undefined (reading 'parse')\"). " +
      'This is the @opennextjs/cloudflare 1.20.18 regression: stay on the pinned 1.20.16 until it is fixed upstream.'
  );
}

const size = Buffer.byteLength(utf8Worker);
const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
console.log(
  `Wix worker: ${mib(size)} as UTF-8 (${mib(Buffer.byteLength(escapedWorker))} with \\u escapes), budget ${mib(WORKER_BUDGET_BYTES)}.`
);
if (size > WORKER_BUDGET_BYTES) {
  throw new Error(
    `The Wix worker is ${mib(size)}, over the ${mib(WORKER_BUDGET_BYTES)} budget: Wix refuses deployments near 20 MB (HTTP 413). ` +
      'Keep large data out of client components and shared modules so it is bundled once, or move it to static assets.'
  );
}

await writeFile(
  entryPath,
  `import worker from './worker.js';

const fallbackExecutionContext = {
  waitUntil(promise) {
    // Wix's Worker-compatible runner omits Cloudflare's third
    // ExecutionContext argument. Preserve non-blocking OpenNext work without
    // allowing a rejected background task to become an unhandled error.
    Promise.resolve(promise).catch(() => undefined);
  },
};

export default {
  fetch(request, env, ctx) {
    return worker.fetch(request, env, ctx ?? fallbackExecutionContext);
  },
};
`,
  'utf8'
);

console.log('Prepared bundled Wix-compatible worker entry.');
