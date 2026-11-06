import 'server-only';

import type { Booking } from '@/types';

const WIX_MEMBER_EVENTS_URL = 'https://www.wixapis.com/calendar/v3/events/memberId';
const WIX_TIME_ZONE = 'Asia/Jerusalem';
const DAY_MS = 24 * 60 * 60 * 1000;

interface WixCalendarEvent {
  id?: unknown;
  title?: unknown;
  scheduleName?: unknown;
  status?: unknown;
  start?: { localDate?: unknown; utcDate?: unknown };
  end?: { localDate?: unknown; utcDate?: unknown };
}

interface WixCalendarEventsResponse {
  events?: WixCalendarEvent[];
}

function localDateTimeInIsrael(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIX_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}`;
}

function dateParts(value: unknown): { date: string; time: string; timestamp: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match[1].split('-').map(Number);
  const [hour, minute] = match[2].split(':').map(Number);
  return { date: match[1], time: match[2], timestamp: Date.UTC(year, month - 1, day, hour, minute) };
}

async function listEventsInRange(
  accessToken: string,
  from: Date,
  to: Date
): Promise<WixCalendarEvent[]> {
  // Wix documents `me` specifically for the currently authenticated member.
  // It prevents an application-side member ID from ever widening the result set.
  const url = new URL(`${WIX_MEMBER_EVENTS_URL}/me`);
  url.searchParams.set('fromLocalDate', localDateTimeInIsrael(from));
  url.searchParams.set('toLocalDate', localDateTimeInIsrael(to));
  url.searchParams.set('timeZone', WIX_TIME_ZONE);
  const response = await fetch(url, {
    headers: { Authorization: accessToken },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Wix member calendar is unavailable.');
  const payload = (await response.json()) as WixCalendarEventsResponse;
  return Array.isArray(payload.events) ? payload.events : [];
}

/**
 * Returns only the signed-in Wix member's appointments. Calendar events are
 * Wix's authority for session timing; we never recreate price, payment, or
 * customer data from client-side input.
 */
export async function listWixMemberBookings(
  accessToken: string,
  now = new Date()
): Promise<Booking[]> {
  const [past, future] = await Promise.all([
    listEventsInRange(accessToken, new Date(now.getTime() - 364 * DAY_MS), now),
    listEventsInRange(accessToken, now, new Date(now.getTime() + 364 * DAY_MS)),
  ]);
  const seen = new Set<string>();
  const bookings: Booking[] = [];

  for (const event of [...past, ...future]) {
    const id = typeof event.id === 'string' ? event.id : '';
    const start = dateParts(event.start?.localDate);
    const end = dateParts(event.end?.localDate);
    if (!id || seen.has(id) || !start || !end) continue;
    seen.add(id);
    const title = typeof event.scheduleName === 'string' && event.scheduleName.trim()
      ? event.scheduleName.trim()
      : typeof event.title === 'string' && event.title.trim()
      ? event.title.trim()
      : 'Sim Dream flight session';
    const durationMinutes = Math.max(0, Math.round((end.timestamp - start.timestamp) / 60_000));
    bookings.push({
      id,
      source: 'wix',
      bookingReference: `WIX-${id.slice(0, 8).toUpperCase()}`,
      packageId: 'wix-booking',
      packageTitle: title,
      durationMinutes,
      bookingDate: start.date,
      startTime: start.time,
      endTime: end.time,
      pilotName: 'Wix member',
      pilotEmail: '',
      pilotPhone: '',
      experienceLevel: 'beginner',
      addons: [],
      subtotalIls: 0,
      discountIls: 0,
      totalIls: 0,
      status: event.status === 'CANCELLED' ? 'cancelled' : 'confirmed',
      // Calendar confirms a session, not its payment. Keep finance and
      // receipts out of this projection until an order-specific Wix adapter
      // proves them from the authoritative order/payment record.
      paymentStatus: 'pending',
      paymentMethod: 'desk',
      createdAt: typeof event.start?.utcDate === 'string' ? event.start.utcDate : `${start.date}T${start.time}:00`,
    });
  }
  return bookings.sort((a, b) => `${a.bookingDate}${a.startTime}`.localeCompare(`${b.bookingDate}${b.startTime}`));
}
