import { cp, open } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), '.open-next');
const workerPath = resolve(outputDirectory, 'worker.js');
const generatedDurableObjectsPath = resolve(outputDirectory, '.build/durable-objects');
const deployableDurableObjectsPath = resolve(outputDirectory, 'durable-objects');
const durableObjectFiles = ['bucket-cache-purge.js', 'queue.js', 'sharded-tag-cache.js'];

/**
 * Rewrites one file through a single open handle: the bytes that are transformed are the bytes of
 * the file that is written, with no window in which another process could swap the path. A missing
 * file fails here, and a `transform` that throws leaves the file untouched.
 */
async function rewrite(path, transform) {
  const handle = await open(path, 'r+');
  try {
    const transformed = transform(await handle.readFile('utf8'));
    await handle.truncate(0);
    await handle.write(transformed, 0, 'utf8');
  } finally {
    await handle.close();
  }
}

// The Wix CLI omits dot-directories and its Worker runner has no
// `cloudflare:workers` module. OpenNext emits these exports for optional cache
// bindings that this application does not use, so retain their public shape
// with a constructor-compatible local base class before Wrangler bundles them.
await rewrite(workerPath, (worker) => {
  const wixCompatibleWorker = worker.replaceAll('./.build/durable-objects/', './durable-objects/');
  if (wixCompatibleWorker === worker) {
    throw new Error('Expected OpenNext Durable Object imports were not found in worker.js.');
  }
  return wixCompatibleWorker;
});

await cp(generatedDurableObjectsPath, deployableDurableObjectsPath, { recursive: true, force: true });

for (const fileName of durableObjectFiles) {
  await rewrite(resolve(deployableDurableObjectsPath, fileName), (source) => {
    const transformed = source.replace(
      'import { DurableObject } from "cloudflare:workers";',
      'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }'
    );
    if (transformed === source) {
      throw new Error(`Expected Cloudflare DurableObject import was not found in ${fileName}.`);
    }
    return transformed;
  });
}

console.log('Normalized OpenNext optional Durable Object modules for the Wix runtime.');
