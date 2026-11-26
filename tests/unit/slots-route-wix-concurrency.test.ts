import { beforeEach, describe, expect, it, vi } from 'vitest';

// In Wix mode the local efficiency report is independent of the Wix availability reads, so it must start with
// them instead of after them. It is booking state: never cached, only overlapped.

const mocks = vi.hoisted(() => ({
  getAvailableSlots: vi.fn(),
  getDailyEfficiencyReport: vi.fn(),
  listWixBookableSlotsForDuration: vi.fn(),
  getWixBackedKantorovichSlots: vi.fn(),
}));

vi.mock('@/lib/db/store', () => ({
  store: { getAvailableSlots: mocks.getAvailableSlots, getDailyEfficiencyReport: mocks.getDailyEfficiencyReport },
}));
vi.mock('@/lib/wix', () => ({
  isWixAvailabilityAdapterEnabled: () => true,
  listWixBookableSlotsForDuration: mocks.listWixBookableSlotsForDuration,
  getWixBackedKantorovichSlots: mocks.getWixBackedKantorovichSlots,
}));

import { GET } from '@/app/api/slots/route';
import { israelToday } from '@/lib/scheduler/israel-clock';

const slotsRequest = (query: string) => new Request(`https://simdream.example.test/api/slots?date=${israelToday()}&${query}`);

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getWixBackedKantorovichSlots.mockResolvedValue([]);
});

describe('GET /api/slots in Wix mode', () => {
  it('starts the local efficiency read while the Wix availability reads are still in flight', async () => {
    const events: string[] = [];
    mocks.getDailyEfficiencyReport.mockImplementation(async () => {
      events.push('efficiency:start');
      return null;
    });
    mocks.listWixBookableSlotsForDuration.mockImplementation(async () => {
      events.push('wix:start');
      await new Promise((resolve) => setTimeout(resolve, 30));
      events.push('wix:done');
      return [];
    });

    const response = await GET(slotsRequest('duration=60&includeEfficiency=true'));

    expect(response.status).toBe(200);
    expect(mocks.getDailyEfficiencyReport).toHaveBeenCalledTimes(1);
    expect(events.indexOf('efficiency:start')).toBeGreaterThan(-1);
    expect(events.indexOf('efficiency:start')).toBeLessThan(events.indexOf('wix:done'));
  });

  it('still answers, without efficiency, when the local efficiency read fails', async () => {
    mocks.getDailyEfficiencyReport.mockRejectedValue(new Error('store down'));
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([]);

    const response = await GET(slotsRequest('duration=60&includeEfficiency=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.wixBookingsAuthoritative).toBe(true);
    expect(body).not.toHaveProperty('efficiency');
  });

  it('does not read the efficiency report when the caller did not ask for it', async () => {
    mocks.listWixBookableSlotsForDuration.mockResolvedValue([]);

    const response = await GET(slotsRequest('duration=60'));

    expect(response.status).toBe(200);
    expect(mocks.getDailyEfficiencyReport).not.toHaveBeenCalled();
  });

  it('logs, with the reason and no booking data, when it falls back to the local calendar because Wix cannot answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.listWixBookableSlotsForDuration.mockRejectedValue(new Error('Wix API 504: no answer within 8000 ms'));
    mocks.getAvailableSlots.mockResolvedValue([]);

    const response = await GET(slotsRequest('duration=60'));

    expect(response.status).toBe(200);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Wix availability'), expect.stringContaining('no answer'));
    warn.mockRestore();
  });
});
