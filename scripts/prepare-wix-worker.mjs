import { access, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), '.wix-worker');
const workerPath = resolve(outputDirectory, 'worker.js');
const sourceMapPath = resolve(outputDirectory, 'worker.js.map');
const entryPath = resolve(outputDirectory, 'entry.mjs');

// Wix requires this conventional server entry name. Wrangler has already
// bundled the OpenNext module graph into worker.js for an ESM runtime.
await access(workerPath);
await rm(sourceMapPath, { force: true });

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
