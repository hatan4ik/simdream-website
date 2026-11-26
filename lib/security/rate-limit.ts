import 'server-only';

import { hasUsableValue, isProduction } from '@/lib/config/server-env';
import { requireSupabaseAdmin } from '@/lib/db/supabase-admin';
import { AUTH_READ_TIMEOUT_MS } from '@/lib/http/timeouts';
import { resolveClientAddress } from '@/lib/security/client-address';

export interface RateLimitRule {
  /** Stable, internal identifier for one independently limited operation. */
  scope: string;
  /** A privacy-preserving subject, such as a client address or a voucher code. */
  subject: string;
  /** Maximum accepted attempts in one fixed window. */
  limit: number;
  /** Fixed window size in seconds. */
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super('Rate-limit persistence is unavailable.');
    this.name = 'RateLimitUnavailableError';
  }
}

interface InMemoryBucket {
  count: number;
  expiresAt: number;
}

const inMemoryBuckets = new Map<string, InMemoryBucket>();

/**
 * Browser suites issue hundreds of deliberately bad credentials in parallel.
 * They exercise throttling in Vitest, while this triple opt-in keeps one test's
 * synthetic attacker from blocking another test's authenticated browser.
 * It is unreachable in a real deployment: only the sandbox uses `.next-test`
 * and explicitly sets this marker alongside the in-memory store.
 */
function isBrowserTestSandbox(): boolean {
  return (
    process.env.SIMDREAM_TEST_RATE_LIMIT_BYPASS === 'true' &&
    process.env.ALLOW_IN_MEMORY_STORE === 'true' &&
    process.env.NEXT_DIST_DIR === '.next-test'
  );
}

function validRule(rule: RateLimitRule): boolean {
  return (
    rule.scope.length > 0 &&
    rule.scope.length <= 80 &&
    rule.subject.length > 0 &&
    rule.subject.length <= 512 &&
    Number.isInteger(rule.limit) &&
    rule.limit > 0 &&
    Number.isInteger(rule.windowSeconds) &&
    rule.windowSeconds > 0 &&
    rule.windowSeconds <= 86_400
  );
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function consumeInMemory(key: string, rule: RateLimitRule, now = Date.now()): RateLimitDecision {
  const windowMs = rule.windowSeconds * 1_000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;
  const existing = inMemoryBuckets.get(key);
  const bucket = existing && existing.expiresAt === expiresAt ? existing : { count: 0, expiresAt };
  bucket.count += 1;
  inMemoryBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1_000)),
  };
}

/**
 * Resolves a request address only for rate limiting, from the one header the deployment trusts
 * (lib/security/client-address.ts), or 'unknown-client'. The stored key is hashed before
 * persistence, so the database never receives raw IP addresses or voucher codes.
 */
export function rateLimitClientAddress(request: Request): string {
  return resolveClientAddress(request.headers);
}

/**
 * Atomically consumes one rate-limit attempt. Production uses the database function
 * installed by migration 005, so limits survive process restarts and scale across
 * Node instances. Development and tests use a deterministic in-process equivalent.
 */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitDecision> {
  if (!validRule(rule)) throw new RateLimitUnavailableError();

  if (isBrowserTestSandbox()) return { allowed: true, retryAfterSeconds: 1 };

  const subjectHash = await sha256(`${rule.scope}\u0000${rule.subject}`);
  // The sandboxed production build explicitly opts into the in-memory store so
  // tests never contact a real Supabase project. Real deployments must not set it.
  if (!isProduction || process.env.ALLOW_IN_MEMORY_STORE === 'true') {
    return consumeInMemory(`${rule.scope}:${subjectHash}`, rule);
  }

  try {
    const admin = requireSupabaseAdmin();
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_scope: rule.scope,
      p_subject_hash: subjectHash,
      p_window_seconds: rule.windowSeconds,
      p_limit: rule.limit,
    });
    if (error || !Array.isArray(data) || data.length !== 1) throw new RateLimitUnavailableError();
    const result = data[0] as { allowed?: unknown; retry_after_seconds?: unknown };
    if (typeof result.allowed !== 'boolean' || !Number.isFinite(Number(result.retry_after_seconds))) {
      throw new RateLimitUnavailableError();
    }
    return {
      allowed: result.allowed,
      retryAfterSeconds: Math.max(1, Math.floor(Number(result.retry_after_seconds))),
    };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) throw error;
    throw new RateLimitUnavailableError();
  }
}

/**
 * Reads a budget without spending it: `allowed` is false once the open window has no attempt left, the
 * state in which the next `consumeRateLimit` would be refused. It writes nothing, so the caller can ask
 * on every request. Production reads the window row that `consume_rate_limit` (migration 005) maintains.
 */
export async function peekRateLimit(rule: RateLimitRule, now = Date.now()): Promise<RateLimitDecision> {
  if (!validRule(rule)) throw new RateLimitUnavailableError();
  if (isBrowserTestSandbox()) return { allowed: true, retryAfterSeconds: 1 };

  const windowMs = rule.windowSeconds * 1_000;
  const subjectHash = await sha256(`${rule.scope}\u0000${rule.subject}`);
  let attempts = 0;
  let expiresAt = Math.floor(now / windowMs) * windowMs + windowMs;
  if (!isProduction || process.env.ALLOW_IN_MEMORY_STORE === 'true') {
    const bucket = inMemoryBuckets.get(`${rule.scope}:${subjectHash}`);
    if (bucket?.expiresAt === expiresAt) attempts = bucket.count;
  } else {
    try {
      // Windows are one `windowSeconds` apart, so at most one row started after "now minus one window".
      const { data, error } = await requireSupabaseAdmin()
        .from('security_rate_limits')
        .select('attempt_count, window_started_at')
        .eq('scope', rule.scope)
        .eq('subject_hash', subjectHash)
        .gt('window_started_at', new Date(now - windowMs).toISOString())
        .order('window_started_at', { ascending: false })
        .limit(1)
        .abortSignal(AbortSignal.timeout(AUTH_READ_TIMEOUT_MS));
      if (error || !Array.isArray(data)) throw new RateLimitUnavailableError();
      const row = data[0] as { attempt_count?: unknown; window_started_at?: unknown } | undefined;
      const startedAt = row ? Date.parse(String(row.window_started_at)) : NaN;
      if (row && (!Number.isFinite(Number(row.attempt_count)) || !Number.isFinite(startedAt))) {
        throw new RateLimitUnavailableError();
      }
      if (row) [attempts, expiresAt] = [Number(row.attempt_count), startedAt + windowMs];
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) throw error;
      throw new RateLimitUnavailableError();
    }
  }
  return { allowed: attempts < rule.limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1_000)) };
}

export function rateLimitHeaders(decision: RateLimitDecision): HeadersInit {
  return { 'Retry-After': String(decision.retryAfterSeconds), 'Cache-Control': 'no-store' };
}

/** Test seam. Runtime code never clears a production rate-limit record. */
export function resetInMemoryRateLimitsForTests(): void {
  if (!isProduction || process.env.ALLOW_IN_MEMORY_STORE === 'true' || !hasUsableValue(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    inMemoryBuckets.clear();
  }
}
