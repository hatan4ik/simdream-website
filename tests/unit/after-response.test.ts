import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from './_support/source';

// Non-critical, one-shot work (the voucher-funded confirmation email) runs after the response so a Worker
// that ends the request cannot cut it off. It never carries payment state: the Stripe webhook keeps awaiting
// its own email so a failure there still triggers Stripe's redelivery.

const nextAfter = vi.hoisted(() => vi.fn());
vi.mock('next/server', () => ({ after: nextAfter }));

import { runAfterResponse } from '@/lib/booking/after-response';

afterEach(() => {
  nextAfter.mockReset();
  vi.restoreAllMocks();
});

describe('runAfterResponse', () => {
  it('schedules the task with after() and does not run it before the response', () => {
    nextAfter.mockImplementation(() => undefined);
    const task = vi.fn().mockResolvedValue(undefined);

    runAfterResponse(task, 'booking confirmation');

    expect(nextAfter).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();
  });

  it('logs and swallows a failure of the scheduled task, naming it, never the booking', async () => {
    nextAfter.mockImplementation((callback: () => Promise<void>) => callback());
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runAfterResponse(() => Promise.reject(new Error('sendgrid down')), 'booking confirmation');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(error).toHaveBeenCalledWith(expect.stringContaining('booking confirmation'), expect.any(Error));
  });

  it('runs the task at once, as before, when there is no request scope to schedule it in', async () => {
    nextAfter.mockImplementation(() => {
      throw new Error('`after` was called outside a request scope.');
    });
    const task = vi.fn().mockResolvedValue(undefined);

    runAfterResponse(task, 'booking confirmation');
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(1);
  });
});

describe('checkout composition', () => {
  it('sends the voucher-funded confirmation after the response, and nothing else in checkout uses it', () => {
    const source = readFileSync(path.join(REPO_ROOT, 'lib/booking/checkout-composition.ts'), 'utf8');
    expect(source).toMatch(/runAfterResponse\(\(\) => sendBookingConfirmationEmail\(booking\)/);
  });
});
