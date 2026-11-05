import { access, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), '.open-next');
const workerPath = resolve(outputDirectory, 'worker.js');
const generatedDurableObjectsPath = resolve(outputDirectory, '.build/durable-objects');
const deployableDurableObjectsPath = resolve(outputDirectory, 'durable-objects');
const durableObjectFiles = ['bucket-cache-purge.js', 'queue.js', 'sharded-tag-cache.js'];

await access(workerPath);
await cp(generatedDurableObjectsPath, deployableDurableObjectsPath, { recursive: true, force: true });

// The Wix CLI omits dot-directories and its Worker runner has no
// `cloudflare:workers` module. OpenNext emits these exports for optional cache
// bindings that this application does not use, so retain their public shape
// with a constructor-compatible local base class before Wrangler bundles them.
const worker = await readFile(workerPath, 'utf8');
const wixCompatibleWorker = worker.replaceAll('./.build/durable-objects/', './durable-objects/');
if (wixCompatibleWorker === worker) {
  throw new Error('Expected OpenNext Durable Object imports were not found in worker.js.');
}
await writeFile(workerPath, wixCompatibleWorker, 'utf8');

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

console.log('Normalized OpenNext optional Durable Object modules for the Wix runtime.');
