import { describe, expect, it } from 'vitest';
import { loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { adminRequest, createVoucherFundedBooking, EMPTY_DAY, PRIVATE_NO_STORE } from './api-helpers';
import { dailyEfficiencyReport, errorBody, expectContract } from './contracts';

async function efficiencyResponse(app: TestApp, request: Request) {
  const { GET } = await app.routes.adminScheduleEfficiency();
  return readJson(await GET(request));
}

describe('GET /api/admin/schedule-efficiency', () => {
  it('refuses anonymous callers with a Basic auth challenge', async () => {
    const app = await loadApp();

    const response = await efficiencyResponse(app, apiRequest(`/api/admin/schedule-efficiency?date=${EMPTY_DAY.sunday}`));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Basic /);
    expect(JSON.stringify(response.body)).not.toContain('timelineBlocks');
  });

  it('gives an admin the full report, including who booked and what the day earned', async () => {
    const app = await loadApp();
    const booking = await createVoucherFundedBooking(app, { date: EMPTY_DAY.sunday, pilotName: 'Dispatch Visible' });

    const response = await efficiencyResponse(app, adminRequest(`/api/admin/schedule-efficiency?date=${EMPTY_DAY.sunday}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const report = expectContract(dailyEfficiencyReport, response.body);
    expect(report).toMatchObject({ date: EMPTY_DAY.sunday, bookedMinutes: 45, actualRevenueIls: 0 });
    const booked = report.timelineBlocks.filter((block) => block.type === 'booked');
    expect(booked).toHaveLength(1);
    expect(booked[0].label).toContain('Dispatch Visible');
    expect(booked[0].booking).toMatchObject({ bookingReference: booking.bookingReference });
  });

  it.each([
    { name: 'a missing date', query: '' },
    { name: 'a malformed date', query: '?date=2026-12-1' },
    { name: 'an impossible calendar date', query: '?date=2026-02-30' },
  ])('rejects $name with 400', async ({ query }) => {
    const app = await loadApp();

    const response = await efficiencyResponse(app, adminRequest(`/api/admin/schedule-efficiency${query}`));

    expect(response.status).toBe(400);
    expectContract(errorBody, response.body);
  });
});
