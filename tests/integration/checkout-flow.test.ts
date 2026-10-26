import { describe, expect, it, vi } from 'vitest';
import { bookingCheckoutBody, findOpenSlot, loadApp, voucherCheckoutBody } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { checkoutSessionEvent, signedWebhookRequest } from '../support/stripe';

const BOOKING_DATE = '2026-11-01';
const SEED_VOUCHER_CODE = 'SD-VOUCH-DF7QK3MN8R2V6X9LPA';

describe('gift voucher recipient', () => {
  it('accepts a blank recipient email and delivers the voucher to the buyer (E2E-2)', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const { POST } = await app.routes.checkout();

    const response = await POST(
      apiRequest('/api/checkout', { body: voucherCheckoutBody({ recipientEmail: '', senderEmail: 'buyer@example.test' }) })
    );

    expect(response.status).toBe(201);
    const voucherId = app.checkoutSessions[0].voucherId!;
    expect(await app.store.getVoucherById(voucherId)).toMatchObject({ recipientEmail: 'buyer@example.test' });
  });
});

describe('checkout lifecycle', () => {
  it('confirms a fully voucher-funded booking immediately and consumes its slot', async () => {
    const app = await loadApp();
    const slot = await findOpenSlot(app, BOOKING_DATE, 20);
    const { POST } = await app.routes.checkout();

    const response = await readJson<{ kind: string; bookingReference: string }>(
      await POST(
        apiRequest('/api/checkout', {
          body: bookingCheckoutBody({ startTime: slot.startTime, voucherCode: SEED_VOUCHER_CODE }),
        })
      )
    );

    expect(response.status).toBe(201);
    expect(response.body.kind).toBe('voucher');
    const booking = await app.store.getBookingByRef(response.body.bookingReference);
    expect(booking).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'voucher', totalIls: 0 });

    const after = await app.store.getAvailableSlots(BOOKING_DATE, 20);
    expect(after.find((candidate) => candidate.startTime === slot.startTime)?.available).toBe(false);
  });

  it('keeps a card booking pending until a signed webhook confirms it, exactly once', async () => {
    const app = await loadApp({ stripe: 'mocked' });
    const slot = await findOpenSlot(app, BOOKING_DATE, 60);
    const checkout = await app.routes.checkout();

    const started = await readJson<{ kind: string; url: string }>(
      await checkout.POST(
        apiRequest('/api/checkout', {
          body: bookingCheckoutBody({ packageId: 'pkg-captain-60', startTime: slot.startTime }),
        })
      )
    );
    expect(started.status).toBe(201);
    expect(started.body.kind).toBe('stripe');
    expect(app.checkoutSessions).toHaveLength(1);

    const bookingId = app.checkoutSessions[0].bookingId;
    expect(bookingId).toBeTruthy();
    expect(await app.store.getBookingById(bookingId!)).toMatchObject({ status: 'pending', paymentStatus: 'pending' });

    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const webhook = await app.routes.stripeWebhook();
    const event = checkoutSessionEvent('checkout.session.completed', { metadata: { bookingId } });
    const first = await webhook.POST(signedWebhookRequest(event));
    const replay = await webhook.POST(signedWebhookRequest(event));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(await app.store.getBookingById(bookingId!)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    // Only the delivery that changes state sends the confirmation email.
    const confirmations = info.mock.calls.filter(([message]) => message === '[SIMULATION EMAIL] Booking confirmation queued');
    expect(confirmations).toHaveLength(1);
  });
});
