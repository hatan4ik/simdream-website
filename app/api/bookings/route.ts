import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { PersistenceError, store } from '@/lib/db/store';
import { adminBookingPatchSchema, validationError } from '@/lib/validation';
import { Booking } from '@/types';

const BOOKING_REFERENCE_PATTERN = /^SD-737-[A-Z2-9]{16}$/;

function publicBookingView(booking: Booking) {
  return {
    bookingReference: booking.bookingReference,
    packageId: booking.packageId,
    packageTitle: booking.packageTitle,
    durationMinutes: booking.durationMinutes,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    pilotName: booking.pilotName,
    addons: booking.addons,
    totalIls: booking.totalIls,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('ref');

  try {
    // The success page needs a narrow public projection. References are
    // cryptographically generated capability identifiers, never short codes.
    if (reference) {
      if (!BOOKING_REFERENCE_PATTERN.test(reference)) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      const booking = await store.getBookingByRef(reference);
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return NextResponse.json(publicBookingView(booking), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const denied = requireAdmin(request);
    if (denied) return denied;

    const id = searchParams.get('id');
    const email = searchParams.get('email');
    if (id) {
      const booking = await store.getBookingById(id);
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return NextResponse.json(booking, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (email) {
      return NextResponse.json(await store.getBookingsByEmail(email), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    return NextResponse.json(await store.getBookings(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Booking lookup failed', error);
    return NextResponse.json({ error: 'Booking data is temporarily unavailable.' }, { status: 503 });
  }
}

// Checkout creation moved to POST /api/checkout. Keeping this explicit prevents
// a caller from persisting a paid booking without verified payment.
export async function POST() {
  return NextResponse.json({ error: 'Create bookings through /api/checkout.' }, { status: 405 });
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = adminBookingPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const { id, status, startTime } = parsed.data;
    if (startTime) await store.assertRescheduleAllowed(id, startTime);

    let updated: Booking | undefined;
    if (startTime) updated = await store.updateBookingTime(id, startTime);
    if (status) updated = await store.updateBookingStatus(id, status);
    if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof PersistenceError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Booking update failed', error);
    return NextResponse.json({ error: 'Unable to update booking.' }, { status: 503 });
  }
}
