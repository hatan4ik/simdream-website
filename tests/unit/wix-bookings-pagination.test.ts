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
      expect.objectContaining({ cursorPaging: { limit: 1000 } }),
      { timeoutMs: 8_000 }
    );
    expect(wixPost).toHaveBeenNthCalledWith(
      2,
      TIME_SLOTS_URL,
      expect.objectContaining({ cursorPaging: { limit: 1000, cursor: 'next-page' } }),
      { timeoutMs: 8_000 }
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

  it('asks Wix for every page with a read deadline', async () => {
    wixPost.mockResolvedValue({ timeSlots: [], cursorPagingMetadata: { hasNext: false } });

    await listWixAvailability({ serviceId, fromLocalDate: '2026-11-11T00:00:00', toLocalDate: '2026-11-12T00:00:00' });

    expect(wixPost).toHaveBeenCalledWith(TIME_SLOTS_URL, expect.anything(), { timeoutMs: 8_000 });
  });

  it('stops following cursor pages once the whole query has taken longer than its deadline', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    wixPost.mockImplementation(async () => {
      now += 9_000; // each page is slow but inside its own 8 s read deadline's grace; three of them overrun 20 s
      return {
        timeSlots: [{ serviceId, localStartDate: '2026-11-11T10:00:00', localEndDate: '2026-11-11T11:00:00' }],
        cursorPagingMetadata: { hasNext: true, cursors: { next: 'more' } },
      };
    });

    await expect(
      listWixAvailability({ serviceId, fromLocalDate: '2026-11-11T00:00:00', toLocalDate: '2026-11-12T00:00:00' })
    ).rejects.toMatchObject({ status: 504 });
    expect(wixPost.mock.calls.length).toBeLessThan(20);
  });
});
