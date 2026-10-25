import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/request-auth';
import { store } from '@/lib/db/store';

/**
 * Idempotently creates the member profile and attaches historical guest
 * purchases that use the member's verified email. It deliberately exposes no
 * email lookup to anonymous callers, preventing customer enumeration.
 */
export async function POST(request: Request) {
  const member = await requireAuthenticatedUser(request).catch(() => null);
  if (!member) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!member.emailVerified) {
    return NextResponse.json({ error: 'Confirm your email address before activating membership.' }, { status: 403 });
  }

  try {
    await store.ensureMemberProfile(member);
    const linkedGuestBookings = await store.linkGuestBookingsToMember(member);
    const bookings = await store.getBookingsForMember(member.id);
    return NextResponse.json(
      {
        memberActive: true,
        linkedGuestBookings,
        hasPurchaseHistory: bookings.length > 0,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Member bootstrap failed', error);
    return NextResponse.json({ error: 'Unable to activate membership right now.' }, { status: 503 });
  }
}
