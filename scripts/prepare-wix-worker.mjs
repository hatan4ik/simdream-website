import { access, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { restoreUtf8Literals } from './wix-worker-charset.mjs';

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
// bundled the OpenNext module graph into worker.js for an ESM runtime.
await access(workerPath);
await rm(sourceMapPath, { force: true });

// Wrangler's esbuild writes non-ASCII text as `\uXXXX` escapes; this site is mostly
// Hebrew, Arabic and Russian, so emit it as UTF-8 like esbuild's `charset: 'utf8'`.
const escapedWorker = await readFile(workerPath, 'utf8');
const utf8Worker = restoreUtf8Literals(escapedWorker);
await writeFile(workerPath, utf8Worker, 'utf8');

const { size } = await stat(workerPath);
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
