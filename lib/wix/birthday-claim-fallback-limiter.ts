import type { RateLimitDecision, RateLimitRule } from '@/lib/security/rate-limit';

/**
 * A bounded, in-process fixed-window counter. The birthday claim route uses it only while the
 * durable limiter is unavailable (the Wix-hosted Worker has no store): see
 * `lib/wix/birthday-claim-throttle.ts`.
 *
 * It counts per process, so on a Worker every instance keeps its own counts: it bounds a burst
 * against one instance, not the whole site. It never holds more than `maxBuckets` subjects: when
 * it is full, closed windows are dropped first and then the oldest bucket. Subjects are hashed
 * before they are kept, so no email or address sits in memory as written.
 */
export interface FixedWindowLimiter {
  consume(rule: RateLimitRule): Promise<RateLimitDecision>;
  /** The number of subjects currently tracked. */
  size(): number;
  clear(): void;
}

interface Bucket {
  count: number;
  expiresAt: number;
}

async function bucketKey(rule: RateLimitRule): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${rule.scope}\u0000${rule.subject}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createFixedWindowLimiter(options: { maxBuckets: number; now?: () => number }): FixedWindowLimiter {
  const { maxBuckets, now = () => Date.now() } = options;
  const buckets = new Map<string, Bucket>();

  function makeRoom(at: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.expiresAt <= at) buckets.delete(key);
    }
    // Map iteration follows insertion order, so the first key is the oldest bucket.
    while (buckets.size >= maxBuckets) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  return {
    async consume(rule) {
      const key = await bucketKey(rule);
      const at = now();
      const windowMs = rule.windowSeconds * 1_000;
      const expiresAt = Math.floor(at / windowMs) * windowMs + windowMs;
      let bucket = buckets.get(key);
      if (!bucket || bucket.expiresAt !== expiresAt) {
        // A new window starts a new bucket at the end of the eviction order.
        buckets.delete(key);
        if (buckets.size >= maxBuckets) makeRoom(at);
        bucket = { count: 0, expiresAt };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return { allowed: bucket.count <= rule.limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - at) / 1_000)) };
    },
    size: () => buckets.size,
    clear: () => buckets.clear(),
  };
}
