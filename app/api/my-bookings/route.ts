import { NextResponse } from 'next/server';
import { getDevelopmentDemoEmail, requireAuthenticatedUser } from '@/lib/auth/request-auth';
import { store } from '@/lib/db/store';

export async function GET(request: Request) {
  try {
    const authenticated = await requireAuthenticatedUser(request).catch(() => null);
    if (authenticated) {
      if (!authenticated.emailVerified) {
        return NextResponse.json({ error: 'Confirm your email address to access member purchases.' }, { status: 403 });
      }
      await store.ensureMemberProfile(authenticated);
      await store.linkGuestBookingsToMember(authenticated);
      return NextResponse.json(await store.getBookingsForMember(authenticated.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const demoEmail = getDevelopmentDemoEmail(request);
    if (!demoEmail) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return NextResponse.json(await store.getBookingsByEmail(demoEmail), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('My booking lookup failed', error);
    return NextResponse.json({ error: 'Booking data is temporarily unavailable.' }, { status: 503 });
  }
}
