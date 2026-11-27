import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// `scripts/prepare-opennext-for-wix.mjs` rewrites OpenNext's build output so the Wix Worker runner
// can load it. It is part of every `npm run wix:build`; these tests pin what it does to the files.

const SCRIPT = resolve(process.cwd(), 'scripts/prepare-opennext-for-wix.mjs');
const DURABLE_OBJECT_FILES = ['bucket-cache-purge.js', 'queue.js', 'sharded-tag-cache.js'];
const CLOUDFLARE_IMPORT = 'import { DurableObject } from "cloudflare:workers";';
const WORKER = [
  'export { DOQueueHandler } from "./.build/durable-objects/queue.js";',
  'export { DOShardedTagCache } from "./.build/durable-objects/sharded-tag-cache.js";',
  'export { BucketCachePurge } from "./.build/durable-objects/bucket-cache-purge.js";',
  'export default { fetch() {} };',
  '',
].join('\n');

const workspaces: string[] = [];

function workspace(options: { worker?: string | null; durableObjectSource?: (file: string) => string } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'prepare-opennext-'));
  workspaces.push(root);
  const generated = join(root, '.open-next/.build/durable-objects');
  mkdirSync(generated, { recursive: true });
  for (const file of DURABLE_OBJECT_FILES) {
    const source = options.durableObjectSource?.(file) ?? `${CLOUDFLARE_IMPORT}\nexport class Handler extends DurableObject {}\n`;
    writeFileSync(join(generated, file), source);
  }
  if (options.worker !== null) writeFileSync(join(root, '.open-next/worker.js'), options.worker ?? WORKER);
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' });
}

/**
 * Runs the script with a file system that accepts at most `bytesPerWrite` bytes per write call, as a
 * nearly full disk or a slow device may. A preload module caps `FileHandle.write`; no shell is involved.
 */
function runWithShortWrites(root: string, bytesPerWrite: number) {
  const preload = join(root, 'short-writes.mjs');
  writeFileSync(
    preload,
    [
      "import { open } from 'node:fs/promises';",
      'const probe = await open(new URL(import.meta.url), "r");',
      'const fileHandle = Object.getPrototypeOf(probe);',
      'await probe.close();',
      'const write = fileHandle.write;',
      `const cap = ${bytesPerWrite};`,
      'fileHandle.write = function (buffer, offset, length, position) {',
      '  if (cap === 0) return Promise.resolve({ bytesWritten: 0, buffer });',
      '  return write.call(this, buffer, offset, Math.min(length, cap), position);',
      '};',
      '',
    ].join('\n')
  );
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, SCRIPT], { cwd: root, encoding: 'utf8' });
}

afterEach(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('prepare-opennext-for-wix', () => {
  it('points the worker at a visible folder and replaces the Cloudflare base class', () => {
    const root = workspace();
    const result = run(root);
    expect(result.status, result.stderr).toBe(0);

    const worker = readFileSync(join(root, '.open-next/worker.js'), 'utf8');
    expect(worker).toBe(WORKER.replaceAll('./.build/durable-objects/', './durable-objects/'));

    for (const file of DURABLE_OBJECT_FILES) {
      const deployed = readFileSync(join(root, '.open-next/durable-objects', file), 'utf8');
      expect(deployed).toBe(
        'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }\nexport class Handler extends DurableObject {}\n'
      );
      // The generated copy is left as OpenNext wrote it.
      expect(readFileSync(join(root, '.open-next/.build/durable-objects', file), 'utf8')).toContain(CLOUDFLARE_IMPORT);
    }
  });

  it('writes a shorter worker without leaving bytes of the longer one behind', () => {
    const root = workspace();
    expect(run(root).status).toBe(0);
    const worker = readFileSync(join(root, '.open-next/worker.js'), 'utf8');
    expect(worker.endsWith('export default { fetch() {} };\n')).toBe(true);
    expect(worker.length).toBe(WORKER.length - 3 * '.build/'.length);
  });

  it('keeps multi-byte text intact', () => {
    const text = `// עברית, العربية, русский, 🛫\n${WORKER}`;
    const root = workspace({ worker: text });
    expect(run(root).status).toBe(0);
    expect(readFileSync(join(root, '.open-next/worker.js'), 'utf8')).toBe(text.replaceAll('./.build/durable-objects/', './durable-objects/'));
  });

  it('writes the whole file when the file system takes it in pieces', () => {
    // A write may store fewer bytes than asked. Stopping after the first piece would exit 0 with a
    // truncated worker, which a release would then ship.
    const root = workspace();
    const result = runWithShortWrites(root, 7);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(root, '.open-next/worker.js'), 'utf8')).toBe(WORKER.replaceAll('./.build/durable-objects/', './durable-objects/'));
    for (const file of DURABLE_OBJECT_FILES) {
      expect(readFileSync(join(root, '.open-next/durable-objects', file), 'utf8')).toContain('export class Handler extends DurableObject {}');
    }
  });

  it('fails when the file system accepts no more bytes', () => {
    const result = runWithShortWrites(workspace(), 0);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('the rewritten file is incomplete');
  });

  it('leaves the worker untouched when the generated Durable Object folder is missing', () => {
    const root = workspace();
    rmSync(join(root, '.open-next/.build'), { recursive: true, force: true });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(readFileSync(join(root, '.open-next/worker.js'), 'utf8')).toBe(WORKER);
  });

  it('fails when the OpenNext worker is missing', () => {
    const result = run(workspace({ worker: null }));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('worker.js');
  });

  it('fails when the worker has no Durable Object imports to rewrite', () => {
    const root = workspace({ worker: 'export default { fetch() {} };\n' });
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Expected OpenNext Durable Object imports were not found in worker.js.');
    expect(readFileSync(join(root, '.open-next/worker.js'), 'utf8')).toBe('export default { fetch() {} };\n');
  });

  it('fails when a Durable Object module does not import the Cloudflare base class', () => {
    const result = run(workspace({ durableObjectSource: (file) => (file === 'queue.js' ? 'export class Handler {}\n' : `${CLOUDFLARE_IMPORT}\n`) }));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Expected Cloudflare DurableObject import was not found in queue.js.');
  });
});
