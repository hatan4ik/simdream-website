import { beforeEach, describe, expect, it, vi } from 'vitest';

const wixPost = vi.hoisted(() => vi.fn());

vi.mock('@/lib/wix/client', () => ({
  wixPost,
  WixApiError: class WixApiError extends Error {
    constructor(
      readonly status: number,
      readonly url: string,
      readonly body: string
    ) {
      super(`Wix API ${status} for ${url}: ${body}`);
    }
  },
}));

import { listWixAvailability } from '@/lib/wix/bookings';

const TIME_SLOTS_URL = 'https://www.wixapis.com/_api/service-availability/v2/time-slots';
const serviceId = 'd4a11b86-541e-44ed-ba41-8d11aac60004';

describe('Wix availability pagination', () => {
  beforeEach(() => wixPost.mockReset());

  it('follows every documented cursor page before returning a shadow comparison input', async () => {
    wixPost
      .mockResolvedValueOnce({
        timeSlots: [{ serviceId, localStartDate: '2026-11-11T10:00:00', localEndDate: '2026-11-11T11:00:00' }],
        timeZone: 'Asia/Jerusalem',
        cursorPagingMetadata: { hasNext: true, cursors: { next: 'next-page' } },
      })
      .mockResolvedValueOnce({
        timeSlots: [{ serviceId, localStartDate: '2026-11-11T11:00:00', localEndDate: '2026-11-11T12:00:00' }],
        timeZone: 'Asia/Jerusalem',
        cursorPagingMetadata: { hasNext: false },
      });

    const result = await listWixAvailability({
      serviceId,
      fromLocalDate: '2026-11-11T00:00:00',
      toLocalDate: '2026-11-12T00:00:00',
    });

    expect(result.timeSlots).toHaveLength(2);
    expect(wixPost).toHaveBeenCalledTimes(2);
    expect(wixPost).toHaveBeenNthCalledWith(
      1,
      TIME_SLOTS_URL,
      expect.objectContaining({ cursorPaging: { limit: 1000 } })
    );
    expect(wixPost).toHaveBeenNthCalledWith(
      2,
      TIME_SLOTS_URL,
      expect.objectContaining({ cursorPaging: { limit: 1000, cursor: 'next-page' } })
    );
  });

  it('fails closed instead of returning a partial result when Wix omits a required next cursor', async () => {
    wixPost.mockResolvedValue({
      timeSlots: [{ serviceId, localStartDate: '2026-11-11T10:00:00', localEndDate: '2026-11-11T11:00:00' }],
      cursorPagingMetadata: { hasNext: true },
    });

    await expect(
      listWixAvailability({
        serviceId,
        fromLocalDate: '2026-11-11T00:00:00',
        toLocalDate: '2026-11-12T00:00:00',
      })
    ).rejects.toMatchObject({ status: 502 });
  });
});
