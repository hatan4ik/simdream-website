import fc from 'fast-check';
import { afterEach, vi } from 'vitest';

// FC_SEED=<n> replays a property-test failure exactly (fast-check prints the seed on failure).
if (process.env.FC_SEED) fc.configureGlobal({ seed: Number(process.env.FC_SEED) });

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('@/lib/stripe');
  vi.doUnmock('@/lib/auth/request-auth');
  // Mail mocks must never leak between files.
  vi.doUnmock('@/lib/sendgrid');
  vi.doUnmock('@sendgrid/mail');
});
