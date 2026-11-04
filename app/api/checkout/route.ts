import { NextResponse } from 'next/server';
import { CheckoutError } from '@/lib/booking/checkout-service';
import { startBookingCheckout, startVoucherCheckout } from '@/lib/booking/checkout-runtime';
import { requirePaymentsEnabled } from '@/lib/stripe';
import { checkoutRequestSchema, validationError } from '@/lib/validation';
import { scheduleWixCheckoutShadow } from '@/lib/wix';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 });
  }

  // A fully funded voucher is an already-paid tender. All card transactions
  // require Stripe plus webhook configuration before any pending record is made.
  const requiresCardPayment =
    parsed.data.kind === 'voucher' ||
    (parsed.data.kind === 'booking' && !parsed.data.voucherCode);
  if (requiresCardPayment) {
    const paymentsDisabled = requirePaymentsEnabled();
    if (paymentsDisabled) return paymentsDisabled;
  }

  try {
    const result =
      parsed.data.kind === 'booking'
        ? await startBookingCheckout(request, parsed.data)
        : await startVoucherCheckout(request, parsed.data);

    // This is a diagnostic-only, feature-flagged Wix visitor read. Next's
    // `after()` keeps it outside the customer response, and it receives no
    // customer identity, payment, voucher, or booking-record data.
    if (parsed.data.kind === 'booking') {
      const pkg = SIMULATOR_PACKAGES.find((item) => item.id === parsed.data.packageId);
      if (pkg) {
        scheduleWixCheckoutShadow({
          packageId: pkg.id,
          bookingDate: parsed.data.bookingDate,
          startTime: parsed.data.startTime,
          durationMinutes: pkg.durationMinutes,
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Checkout initialization failed', error);
    return NextResponse.json({ error: 'Unable to start checkout. Please try again.' }, { status: 503 });
  }
}
