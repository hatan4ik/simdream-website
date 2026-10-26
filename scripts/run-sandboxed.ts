import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SERVER_SANDBOX_ENV } from '../tests/support/test-env';

// Runs a command with every external-service secret blanked, so a test build or
// server can never reach real Supabase, Stripe, SendGrid or Google services. Servers
// it starts use the seeded in-memory store (explicit demo opt-in), and builds go to
// the separate test build folder (NEXT_DIST_DIR).
const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: tsx scripts/run-sandboxed.ts <command> [...args]');
  process.exit(2);
}

// `next build` points next-env.d.ts and tsconfig.json at whichever build folder it writes.
// Both are tracked files that belong to the developer's .next, so put them back afterwards.
const TRACKED_BUILD_FILES = ['next-env.d.ts', 'tsconfig.json'];
const originals = new Map(TRACKED_BUILD_FILES.filter(existsSync).map((file) => [file, readFileSync(file, 'utf8')]));

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, ...SERVER_SANDBOX_ENV },
});

for (const [file, content] of originals) {
  if (readFileSync(file, 'utf8') !== content) writeFileSync(file, content);
}
process.exit(result.status ?? 1);
