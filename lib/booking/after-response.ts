import 'server-only';

import { after } from 'next/server';

/**
 * Runs non-critical, one-shot work after the HTTP response, so a Worker that ends the request cannot cut it
 * off. Use it only for work that may fail without changing the outcome (an informational email). It must
 * never carry payment or reservation state: those keep their durable, retried paths (the Stripe webhook
 * awaits its own email so a failure triggers Stripe's redelivery).
 *
 * A failure is logged under `label` and never rethrown. Outside a request scope (a script, a test) `after()`
 * throws, and the task runs at once instead, which is how it behaved before it was scheduled.
 */
export function runAfterResponse(task: () => Promise<unknown>, label: string): void {
  const guarded = async () => {
    try {
      await task();
    } catch (error) {
      console.error(`Background task failed: ${label}`, error);
    }
  };
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
