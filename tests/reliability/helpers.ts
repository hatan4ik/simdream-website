import { vi } from 'vitest';
import type { Booking, GiftVoucher } from '@/types';
import type { TestApp } from '../support/app';
import { apiRequest, readJson, type JsonResponse } from '../support/http';
import { TEST_STRIPE } from '../support/test-env';

/** Production rules with payments switched on. Always pair with `stripe: 'mocked'` so no request reaches Stripe. */
export const PRODUCTION_PAYMENTS_ENV: Record<string, string> = {
  NODE_ENV: 'production',
  // A live-format key satisfies the production check; the Stripe client is only used to verify signatures.
  STRIPE_SECRET_KEY: 'sk_live_simdreamQaKey0000000000',
  STRIPE_WEBHOOK_SECRET: TEST_STRIPE.webhookSecret,
  NEXT_PUBLIC_APP_URL: 'https://qa.simdream.test',
};

/** Supabase "configured" but unreachable: port 9 (discard) refuses connections immediately. */
export const UNREACHABLE_SUPABASE_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  SUPABASE_SERVICE_ROLE_KEY: 'qa-unreachable-service-role-key',
};

/** Makes lib/sendgrid use the (mocked) SendGrid transport instead of simulation mode. */
export const MAIL_ENV: Record<string, string> = { SENDGRID_API_KEY: 'SG.qa-reliability-transport-key' };

/** Package per flight duration, for picking whichever departure is open. */
export const PACKAGE_FOR_DURATION: Record<number, string> = {
  20: 'pkg-discovery-30',
  45: 'pkg-promo-45',
  60: 'pkg-captain-60',
  90: 'pkg-ultimate-90',
};

export interface CheckoutResponseBody {
  kind?: 'stripe' | 'voucher';
  url?: string;
  sessionId?: string;
  bookingReference?: string;
  successUrl?: string;
  error?: string;
  fields?: Record<string, string>;
}

export async function postCheckout(
  app: TestApp,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<JsonResponse<CheckoutResponseBody>> {
  const { POST } = await app.routes.checkout();
  return readJson<CheckoutResponseBody>(await POST(apiRequest('/api/checkout', { body, headers })));
}

export function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** Non-cancelled bookings starting at the given departure. */
export async function bookingsHolding(app: TestApp, date: string, startTime: string): Promise<Booking[]> {
  const bookings = await app.store.getBookings();
  return bookings.filter(
    (booking) => booking.bookingDate === date && booking.startTime === startTime && booking.status !== 'cancelled'
  );
}

export async function isSlotAvailable(app: TestApp, date: string, durationMinutes: number, startTime: string) {
  const slots = await app.store.getAvailableSlots(date, durationMinutes);
  return slots.some((slot) => slot.startTime === startTime && slot.available);
}

/** A paid, unredeemed voucher created through the store's own purchase lifecycle. */
export async function createPaidVoucher(app: TestApp, valueIls: number): Promise<GiftVoucher> {
  const pending = await app.store.createPendingVoucher({
    initialValueIls: valueIls,
    recipientName: 'Reliability Recipient',
    recipientEmail: 'recipient@example.test',
    senderName: 'Reliability Sender',
    senderEmail: 'sender@example.test',
    personalMessage: '',
    expiryDate: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  });
  const paid = await app.store.activateVoucherIfPending(pending.id, `cs_test_seed_${pending.id}`);
  if (!paid) throw new Error('Voucher could not be activated for the test');
  return paid;
}

/** First open departure on a date across durations, optionally restricted to a time window. */
export async function findOpenDeparture(
  app: TestApp,
  date: string,
  window: { after?: string; before?: string } = {}
) {
  for (const duration of Object.keys(PACKAGE_FOR_DURATION).map(Number)) {
    const slots = await app.store.getAvailableSlots(date, duration);
    const open = slots.find(
      (slot) =>
        slot.available &&
        (window.after === undefined || slot.startTime > window.after) &&
        (window.before === undefined || slot.startTime < window.before)
    );
    if (open) return { slot: open, packageId: PACKAGE_FOR_DURATION[duration], durationMinutes: duration };
  }
  throw new Error(`No open departure on ${date} within ${JSON.stringify(window)}`);
}

export interface MailProbe {
  /** Make the next `count` booking-confirmation attempts fail. */
  failNext(count: number): void;
  /** Booking confirmations that actually went out for a booking reference. */
  confirmationsFor(bookingReference: string): number;
  /** Voucher activation emails that actually went out to a recipient. */
  activationsTo(email: string): number;
}

/**
 * Replaces the SendGrid HTTP transport (`@sendgrid/mail`) so the real lib/sendgrid
 * code runs end to end. Call before loadApp, pass MAIL_ENV, and `vi.doUnmock('@sendgrid/mail')`
 * after the test.
 */
export function mockMailTransport(): MailProbe {
  const delivered: Array<{ to: string; subject: string }> = [];
  let failures = 0;
  const send = vi.fn(async (message: { to?: unknown; subject?: unknown }) => {
    if (failures > 0) {
      failures -= 1;
      throw new Error('SendGrid responded 503 Service Unavailable');
    }
    delivered.push({ to: String(message.to), subject: String(message.subject) });
    return [{ statusCode: 202 }, {}];
  });
  vi.doMock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send } }));
  return {
    failNext: (count) => {
      failures = count;
    },
    confirmationsFor: (reference) => delivered.filter((mail) => mail.subject.includes(`[${reference}]`)).length,
    activationsTo: (email) =>
      delivered.filter((mail) => mail.to === email && mail.subject.includes('gift voucher')).length,
  };
}

/**
 * Makes lib/sendgrid's confirmation function itself reject (for example an
 * unexpected exception), keeping the real implementation for successful sends.
 * Call before loadApp and `vi.doUnmock('@/lib/sendgrid')` after the test.
 */
export function mockFailingMailer(): MailProbe {
  const delivered: string[] = [];
  let failures = 0;
  vi.doMock('@/lib/sendgrid', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/sendgrid')>();
    return {
      ...actual,
      sendBookingConfirmationEmail: vi.fn(async (booking: Booking) => {
        if (failures > 0) {
          failures -= 1;
          throw new Error('Mailer crashed while rendering the confirmation');
        }
        delivered.push(booking.bookingReference);
        return actual.sendBookingConfirmationEmail(booking);
      }),
    };
  });
  return {
    failNext: (count) => {
      failures = count;
    },
    confirmationsFor: (reference) => delivered.filter((entry) => entry === reference).length,
    activationsTo: () => 0,
  };
}

/**
 * Supabase retries failed idempotent reads with 1s/2s/4s back-off. This fakes
 * setTimeout and steps the clock whenever a timer is pending, so an outage
 * resolves in milliseconds while real socket I/O still runs between steps.
 */
export async function withRetryClock<T>(work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: Date.now() });
  let settled = false;
  const pending = work().finally(() => {
    settled = true;
  });
  // The caller observes a rejection through the returned promise; this only prevents an early unhandled warning.
  pending.catch(() => undefined);
  while (!settled) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (vi.getTimerCount() > 0) await vi.advanceTimersToNextTimerAsync();
  }
  return pending;
}
