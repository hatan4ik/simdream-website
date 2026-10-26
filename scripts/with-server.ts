import { spawn, spawnSync } from 'node:child_process';
import { SERVER_SANDBOX_ENV } from '../tests/support/test-env';

/**
 * Starts a sandboxed production server (`next start`, all external secrets blank, seeded
 * in-memory store), waits until it answers, runs a command against it, then stops it.
 *
 *   tsx scripts/with-server.ts --port 3304 -- tsx tests/load/smoke.ts
 *
 * The command receives BASE_URL and PW_PORT. The exit code is the command's.
 */
const argv = process.argv.slice(2);
const separator = argv.indexOf('--');
if (separator < 0 || separator === argv.length - 1) {
  console.error('Usage: tsx scripts/with-server.ts [--port N] -- <command> [...args]');
  process.exit(2);
}
const portFlag = argv.indexOf('--port');
const port = portFlag >= 0 && portFlag < separator ? Number(argv[portFlag + 1]) : 3304;
const [command, ...args] = argv.slice(separator + 1);
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn('npx', ['next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
  env: { ...process.env, ...SERVER_SANDBOX_ENV },
  stdio: ['ignore', 'ignore', 'inherit'],
  detached: true,
});

function stopServer(): void {
  // Kill the whole process group: npx spawns next as a child.
  if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
}
process.on('exit', stopServer);
process.on('SIGINT', () => process.exit(130));

async function waitUntilReady(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`next start exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/packages`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server on ${baseUrl} did not become ready within ${timeoutMs / 1000}s`);
}

try {
  await waitUntilReady();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, BASE_URL: baseUrl, PW_PORT: String(port), LHCI_BASE_URL: baseUrl },
});
process.exit(result.status ?? 1);
