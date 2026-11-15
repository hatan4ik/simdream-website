import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEST_STRIPE } from '../support/test-env';

/**
 * lib/stripe.ts against a stand-in Stripe client: the hosted checkout reports its expiry, and
 * expiring a session that can no longer be paid (already expired or complete) is not an error.
 */

const sessions = {
  create: vi.fn(),
  expire: vi.fn(),
  retrieve: vi.fn(),
};

async function loadStripe(configured = true) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('STRIPE_SECRET_KEY', configured ? TEST_STRIPE.secretKey : '');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', configured ? TEST_STRIPE.webhookSecret : '');
  vi.doMock('stripe', () => ({
    default: class FakeStripe {
      checkout = { sessions };
      webhooks = {};
    },
  }));
  return import('@/lib/stripe');
}

afterEach(() => {
  vi.doUnmock('stripe');
  sessions.create.mockReset();
  sessions.expire.mockReset();
  sessions.retrieve.mockReset();
});

describe('createCheckoutSession', () => {
  it('returns the hosted URL, the session id and the expiry Stripe reports', async () => {
    const { createCheckoutSession } = await loadStripe();
    sessions.create.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', expires_at: 4_102_443_000 });

    await expect(
      createCheckoutSession({
        bookingId: 'booking-1',
        title: 'Sim Dream: Discovery',
        description: '2099-11-10',
        amountIls: 450,
        customerEmail: 'pilot@example.test',
        successUrl: 'https://simdream.example.test/book/success',
        cancelUrl: 'https://simdream.example.test/book?cancelled=true',
      })
    ).resolves.toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      sessionId: 'cs_test_1',
      expiresAt: '2099-12-31T23:30:00.000Z',
    });
  });
});

describe('expireCheckoutSession', () => {
  it('expires an open session and reports it expired', async () => {
    const { expireCheckoutSession } = await loadStripe();
    sessions.expire.mockResolvedValue({ id: 'cs_test_1', status: 'expired' });

    await expect(expireCheckoutSession('cs_test_1')).resolves.toBe('expired');
    expect(sessions.expire).toHaveBeenCalledWith('cs_test_1');
  });

  it.each(['expired', 'complete'])('leaves a session that is already %s as it is and reports that state', async (status) => {
    const { expireCheckoutSession } = await loadStripe();
    sessions.expire.mockRejectedValue(new Error('This Checkout Session is not open.'));
    sessions.retrieve.mockResolvedValue({ id: 'cs_test_1', status });

    await expect(expireCheckoutSession('cs_test_1')).resolves.toBe(status);
    expect(sessions.retrieve).toHaveBeenCalledWith('cs_test_1');
  });

  it('reports the original failure while the session is still open', async () => {
    const { expireCheckoutSession } = await loadStripe();
    const failure = new Error('Stripe API unreachable');
    sessions.expire.mockRejectedValue(failure);
    sessions.retrieve.mockResolvedValue({ id: 'cs_test_1', status: 'open' });

    await expect(expireCheckoutSession('cs_test_1')).rejects.toBe(failure);
  });

  it('reports the original failure when the session cannot be read either', async () => {
    const { expireCheckoutSession } = await loadStripe();
    const failure = new Error('Stripe API unreachable');
    sessions.expire.mockRejectedValue(failure);
    sessions.retrieve.mockRejectedValue(new Error('still unreachable'));

    await expect(expireCheckoutSession('cs_test_1')).rejects.toBe(failure);
  });

  it('refuses while payments are not configured', async () => {
    const { expireCheckoutSession, PAYMENTS_DISABLED_MESSAGE } = await loadStripe(false);

    await expect(expireCheckoutSession('cs_test_1')).rejects.toThrow(PAYMENTS_DISABLED_MESSAGE);
    expect(sessions.expire).not.toHaveBeenCalled();
  });
});
