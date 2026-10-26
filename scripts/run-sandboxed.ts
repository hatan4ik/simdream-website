import { spawnSync } from 'node:child_process';
import { SERVER_SANDBOX_ENV } from '../tests/support/test-env';

// Runs a command with every external-service secret blanked, so a test build or
// server can never reach real Supabase, Stripe, SendGrid or Google services. Servers
// it starts use the seeded in-memory store (explicit demo opt-in).
const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: tsx scripts/run-sandboxed.ts <command> [...args]');
  process.exit(2);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, ...SERVER_SANDBOX_ENV },
});
process.exit(result.status ?? 1);
