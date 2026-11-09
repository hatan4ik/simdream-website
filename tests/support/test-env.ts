/**
 * Credentials and environment shared by every test layer (Vitest and Playwright).
 * Nothing here is a real secret: the values only satisfy format checks.
 */

export const TEST_ADMIN = {
  user: 'qa-admin',
  // Production builds reject admin passwords shorter than 16 characters.
  password: 'qa-admin-password-0123456789',
} as const;

/** Bearer token for POST /api/reviews/refresh in tests (32+ characters, as the route requires); not a real secret. */
export const TEST_REVIEWS_REFRESH_TOKEN = 'qa-reviews-refresh-token-0123456789abcdef';

export const TEST_STRIPE = {
  // Prefixes exercise Stripe's format guards, while short fixture suffixes cannot
  // be mistaken for a deployable credential by repository secret scanners.
  secretKey: 'sk_test_fixture',
  webhookSecret: 'whsec_fixture',
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
  REVIEWS_REFRESH_TOKEN: '',
  // Tests must never use a developer's Wix client or turn a browser journey into
  // a live Wix Bookings checkout. Individual integration tests opt in explicitly.
  NEXT_PUBLIC_WIX_CLIENT_ID: '',
  WIX_SITE_ID: '',
  WIX_AVAILABILITY_ADAPTER_ENABLED: 'false',
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

/**
 * Sandboxed builds and servers use their own build folder, so a test build never replaces
 * the .next that a developer's own `npm run start` is serving.
 */
export const TEST_DIST_DIR = '.next-test';

/** Environment for sandboxed builds and `next start` servers (Playwright, load smoke, Lighthouse). */
export const SERVER_SANDBOX_ENV: Record<string, string> = {
  ...SANDBOX_ENV,
  ...IN_MEMORY_STORE_ENV,
  NEXT_DIST_DIR: TEST_DIST_DIR,
  // Browser security tests create many hostile requests concurrently. Unit tests
  // exercise the actual rate limiter; this isolates browser journeys from each
  // other's synthetic attacker traffic.
  SIMDREAM_TEST_RATE_LIMIT_BYPASS: 'true',
};

/** Enables online payments in non-production test runs; Stripe calls are mocked. */
export const STRIPE_TEST_ENV: Record<string, string> = {
  STRIPE_SECRET_KEY: TEST_STRIPE.secretKey,
  STRIPE_WEBHOOK_SECRET: TEST_STRIPE.webhookSecret,
};
