import { access, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), '.open-next');
const workerPath = resolve(outputDirectory, 'worker.js');
const entryPath = resolve(outputDirectory, 'entry.mjs');
const generatedDurableObjectsPath = resolve(outputDirectory, '.build/durable-objects');
const deployableDurableObjectsPath = resolve(outputDirectory, 'durable-objects');
const durableObjectFiles = ['bucket-cache-purge.js', 'queue.js', 'sharded-tag-cache.js'];

// Wix-managed Headless loads the Cloudflare Worker server bundle from this
// conventional entry name. OpenNext emits `worker.js`; expose it through
// Wix's bootstrap file while keeping its generated module graph intact.
await access(workerPath);
await cp(generatedDurableObjectsPath, deployableDurableObjectsPath, { recursive: true, force: true });

// Wix intentionally excludes dot-directories from an uploaded server bundle.
// OpenNext stores Durable Object modules under `.build`, so publish those
// modules at a visible equivalent path and update the generated entry imports.
const worker = await readFile(workerPath, 'utf8');
const wixCompatibleWorker = worker.replaceAll('./.build/durable-objects/', './durable-objects/');
if (wixCompatibleWorker === worker) {
  throw new Error('Expected OpenNext Durable Object imports were not found in worker.js.');
}
await writeFile(workerPath, wixCompatibleWorker, 'utf8');

// The OpenNext adapter emits Cloudflare Durable Object classes even when its
// default dummy cache adapters are selected. Wix runs the worker without the
// `cloudflare:workers` module, so retain the otherwise-unused exports with a
// minimal constructor-compatible class. This is deliberately not a Durable
// Object implementation: the app does not bind or use those OpenNext exports.
for (const fileName of durableObjectFiles) {
  const filePath = resolve(deployableDurableObjectsPath, fileName);
  const source = await readFile(filePath, 'utf8');
  const transformed = source.replace(
    'import { DurableObject } from "cloudflare:workers";',
    'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }'
  );
  if (transformed === source) {
    throw new Error(`Expected Cloudflare DurableObject import was not found in ${fileName}.`);
  }
  await writeFile(filePath, transformed, 'utf8');
}
await writeFile(
  entryPath,
  `import worker from './worker.js';

const fallbackExecutionContext = {
  waitUntil(promise) {
    // Wix's Worker-compatible runner does not provide Cloudflare's third
    // ExecutionContext argument. Preserve non-blocking OpenNext work without
    // letting a rejected background task become an unhandled process error.
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

console.log('Prepared Wix-compatible Cloudflare Worker entry and durable object modules.');
