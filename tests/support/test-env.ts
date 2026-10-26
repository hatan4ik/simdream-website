/**
 * Credentials and environment shared by every test layer (Vitest and Playwright).
 * Nothing here is a real secret: the values only satisfy format checks.
 */

export const TEST_ADMIN = {
  user: 'qa-admin',
  // Production builds reject admin passwords shorter than 16 characters.
  password: 'qa-admin-password-0123456789',
} as const;

export const TEST_STRIPE = {
  secretKey: 'sk_test_simdreamQaKey0000000000',
  webhookSecret: 'whsec_simdreamQaSecret000000000',
} as const;

/**
 * Blanks every external-service secret so no test can reach real Supabase,
 * Stripe, SendGrid or Google, even when a developer's .env.local holds live keys.
 * Next.js never overrides a variable that is already defined, so '' wins.
 */
export const SANDBOX_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  SENDGRID_API_KEY: '',
  GOOGLE_PLACES_API_KEY: '',
  NEXT_PUBLIC_APP_URL: '',
  ALLOW_IN_MEMORY_STORE: '',
  // Deterministic local dates for seed data and servers, whatever the machine's zone.
  TZ: 'Asia/Jerusalem',
  ADMIN_USER: TEST_ADMIN.user,
  ADMIN_PASSWORD: TEST_ADMIN.password,
};

/**
 * Production fails closed without Supabase. Test servers and production-rule tests opt
 * in to the seeded in-memory store explicitly; fail-closed tests override this with ''.
 */
export const IN_MEMORY_STORE_ENV: Record<string, string> = { ALLOW_IN_MEMORY_STORE: 'true' };

/** Environment for sandboxed `next start` servers (Playwright, load smoke, Lighthouse). */
export const SERVER_SANDBOX_ENV: Record<string, string> = { ...SANDBOX_ENV, ...IN_MEMORY_STORE_ENV };

/** Enables online payments in non-production test runs; Stripe calls are mocked. */
export const STRIPE_TEST_ENV: Record<string, string> = {
  STRIPE_SECRET_KEY: TEST_STRIPE.secretKey,
  STRIPE_WEBHOOK_SECRET: TEST_STRIPE.webhookSecret,
};
