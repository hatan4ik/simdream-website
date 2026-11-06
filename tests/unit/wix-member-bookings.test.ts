import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_MEMBER_TOKEN = 'wix-member-token.' + 'x'.repeat(96);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Wix member appointment projection', () => {
  it('uses the signed-in member endpoint and exposes timing without fabricating payment data', async () => {
    const event = {
      id: 'calendar-event-123',
      scheduleName: 'Captain’s Command 60',
      status: 'CONFIRMED',
      start: { localDate: '2026-11-12T10:00:00', utcDate: '2026-11-12T08:00:00Z' },
      end: { localDate: '2026-11-12T11:00:00', utcDate: '2026-11-12T09:00:00Z' },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ events: [event] }))
      .mockResolvedValueOnce(Response.json({ events: [event] }));
    vi.stubGlobal('fetch', fetchMock);
    const { listWixMemberBookings } = await import('@/lib/wix/member-bookings');

    const bookings = await listWixMemberBookings(VALID_MEMBER_TOKEN, new Date('2026-11-10T12:00:00Z'));

    expect(bookings).toEqual([
      expect.objectContaining({
        id: 'calendar-event-123',
        source: 'wix',
        packageTitle: 'Captain’s Command 60',
        bookingDate: '2026-11-12',
        startTime: '10:00',
        endTime: '11:00',
        durationMinutes: 60,
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'desk',
        totalIls: 0,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(String(url)).toContain('/calendar/v3/events/memberId/me?');
      expect(options).toMatchObject({ headers: { Authorization: VALID_MEMBER_TOKEN } });
    }
  });

  it('skips malformed events and safely projects a cancelled event without a title', async () => {
    const event = {
      id: 'calendar-event-cancelled',
      status: 'CANCELLED',
      start: { localDate: '2026-11-12T10:00:00' },
      end: { localDate: '2026-11-12T10:30:00' },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ events: [{ id: 'missing-start' }, event] }))
      .mockResolvedValueOnce(Response.json({ events: [event] }));
    vi.stubGlobal('fetch', fetchMock);
    const { listWixMemberBookings } = await import('@/lib/wix/member-bookings');

    await expect(listWixMemberBookings(VALID_MEMBER_TOKEN, new Date('2026-11-10T12:00:00Z'))).resolves.toEqual([
      expect.objectContaining({
        id: 'calendar-event-cancelled',
        packageTitle: 'Sim Dream flight session',
        status: 'cancelled',
        durationMinutes: 30,
      }),
    ]);
  });
});
