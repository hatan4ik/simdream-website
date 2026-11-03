import 'server-only';

import { hasUsableValue, isProduction } from '@/lib/config/server-env';
import { requireSupabaseAdmin } from '@/lib/db/supabase-admin';

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
 * Resolves a request address only for rate limiting. The stored key is hashed before
 * persistence, so the database never receives raw IP addresses or voucher codes.
 */
export function rateLimitClientAddress(request: Request): string {
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
  const candidate = forwarded?.split(',')[0]?.trim();
  if (candidate && /^[0-9a-f:.]{3,64}$/i.test(candidate)) return candidate.toLowerCase();
  return 'unknown-client';
}

/**
 * Atomically consumes one rate-limit attempt. Production uses the database function
 * installed by migration 005, so limits survive process restarts and scale across
 * Node instances. Development and tests use a deterministic in-process equivalent.
 */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitDecision> {
  if (!validRule(rule)) throw new RateLimitUnavailableError();

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

export function rateLimitHeaders(decision: RateLimitDecision): HeadersInit {
  return { 'Retry-After': String(decision.retryAfterSeconds), 'Cache-Control': 'no-store' };
}

/** Test seam. Runtime code never clears a production rate-limit record. */
export function resetInMemoryRateLimitsForTests(): void {
  if (!isProduction || process.env.ALLOW_IN_MEMORY_STORE === 'true' || !hasUsableValue(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    inMemoryBuckets.clear();
  }
}
