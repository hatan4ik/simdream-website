import { cp, open } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), '.open-next');
const workerPath = resolve(outputDirectory, 'worker.js');
const generatedDurableObjectsPath = resolve(outputDirectory, '.build/durable-objects');
const deployableDurableObjectsPath = resolve(outputDirectory, 'durable-objects');
const durableObjectFiles = ['bucket-cache-purge.js', 'queue.js', 'sharded-tag-cache.js'];

/**
 * Replaces a file's content through its already-open handle: the bytes that are transformed are the
 * bytes of the file that is written, with no window in which another process could swap the path.
 * A `transform` that throws leaves the file untouched. Every byte must be written: a write that
 * stops short (a full disk) is retried and then fails, never passes for a finished file.
 */
async function rewriteThrough(handle, transform) {
  const bytes = Buffer.from(transform(await handle.readFile('utf8')), 'utf8');
  await handle.truncate(0);
  let written = 0;
  while (written < bytes.length) {
    const { bytesWritten } = await handle.write(bytes, written, bytes.length - written, written);
    if (bytesWritten === 0) throw new Error('The file system accepted no more bytes; the rewritten file is incomplete.');
    written += bytesWritten;
  }
}

async function rewrite(path, transform) {
  const handle = await open(path, 'r+');
  try {
    await rewriteThrough(handle, transform);
  } finally {
    await handle.close();
  }
}

// Opening the worker first fails early when OpenNext produced none; it is rewritten only after the
// Durable Object modules were copied, so a failed copy leaves it as OpenNext wrote it.
const workerHandle = await open(workerPath, 'r+');
try {
  await cp(generatedDurableObjectsPath, deployableDurableObjectsPath, { recursive: true, force: true });

  // The Wix CLI omits dot-directories and its Worker runner has no
  // `cloudflare:workers` module. OpenNext emits these exports for optional cache
  // bindings that this application does not use, so retain their public shape
  // with a constructor-compatible local base class before Wrangler bundles them.
  await rewriteThrough(workerHandle, (worker) => {
    const wixCompatibleWorker = worker.replaceAll('./.build/durable-objects/', './durable-objects/');
    if (wixCompatibleWorker === worker) {
      throw new Error('Expected OpenNext Durable Object imports were not found in worker.js.');
    }
    return wixCompatibleWorker;
  });
} finally {
  await workerHandle.close();
}

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
