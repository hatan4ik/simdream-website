import { describe, expect, it } from 'vitest';
import { DEFAULT_TEST_NOW, loadApp, type TestApp } from '../support/app';
import { apiRequest, readJson } from '../support/http';
import { adminRequest, EMPTY_DAY, PRIVATE_NO_STORE } from './api-helpers';
import {
  errorBody,
  expectContract,
  reviewsSnapshot,
  reviewsSync,
  scheduleOptimizationPreview,
  validationErrorBody,
} from './contracts';

const SEEDED_DAY = DEFAULT_TEST_NOW.slice(0, 10);

function draftRequest(overrides: Record<string, unknown> = {}) {
  return { id: 'draft-1', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['10:00'], ...overrides };
}

async function optimize(app: TestApp, body: unknown) {
  const { POST } = await app.routes.adminScheduleOptimization();
  return readJson(await POST(adminRequest('/api/admin/schedule-optimization', { method: 'POST', body })));
}

describe('POST /api/admin/schedule-optimization', () => {
  it('returns an exact dry-run preview under the contract, privately', async () => {
    const app = await loadApp();
    const requests = [
      draftRequest({ id: 'evening-90', durationMinutes: 90, valueIls: 950, candidateStartTimes: ['18:00'] }),
      draftRequest({ id: 'morning-60', candidateStartTimes: ['10:00', '11:15'] }),
    ];

    const response = await optimize(app, { date: EMPTY_DAY.sunday, requests });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE);
    const preview = expectContract(scheduleOptimizationPreview, response.body);
    expect(preview).toMatchObject({ date: EMPTY_DAY.sunday, existingBookingCount: 0 });
    const recommended = preview.recommendations.map((item) => item.requestId);
    expect([...recommended, ...preview.unallocatedRequestIds].sort()).toEqual(['evening-90', 'morning-60']);
    expect(preview.projectedValueIls).toBe(preview.recommendations.reduce((total, item) => total + item.valueIls, 0));
    expect(preview.recommendedOrphanMinutes).toBeLessThanOrEqual(preview.baselineOrphanMinutes);
  });

  it('never creates, moves or cancels a booking', async () => {
    const app = await loadApp();
    const before = JSON.stringify(await app.store.getBookings());
    const activeThatDay = (await app.store.getBookings()).filter(
      (item) => item.bookingDate === SEEDED_DAY && item.status !== 'cancelled'
    ).length;
    expect(activeThatDay).toBeGreaterThan(0);

    const response = await optimize(app, {
      date: SEEDED_DAY,
      requests: [draftRequest({ candidateStartTimes: ['10:00', '13:45', '18:00', '21:45'] })],
    });

    expect(response.status).toBe(200);
    expect(expectContract(scheduleOptimizationPreview, response.body).existingBookingCount).toBe(activeThatDay);
    expect(JSON.stringify(await app.store.getBookings())).toBe(before);
  });

  it.each([
    { name: 'duplicate request ids', body: { date: EMPTY_DAY.sunday, requests: [draftRequest(), draftRequest()] }, field: 'requests' },
    { name: 'an unsupported duration', body: { date: EMPTY_DAY.sunday, requests: [draftRequest({ durationMinutes: 30 })] }, field: 'requests.0.durationMinutes' },
    { name: 'a start time off the quarter hour', body: { date: EMPTY_DAY.sunday, requests: [draftRequest({ candidateStartTimes: ['10:10'] })] }, field: 'requests.0.candidateStartTimes.0' },
    { name: 'more than four candidate times', body: { date: EMPTY_DAY.sunday, requests: [draftRequest({ candidateStartTimes: ['10:00', '11:15', '12:30', '13:45', '15:00'] })] }, field: 'requests.0.candidateStartTimes' },
    { name: 'a zero declared value', body: { date: EMPTY_DAY.sunday, requests: [draftRequest({ valueIls: 0 })] }, field: 'requests.0.valueIls' },
    { name: 'an empty request list', body: { date: EMPTY_DAY.sunday, requests: [] }, field: 'requests' },
    { name: 'more than eight requests', body: { date: EMPTY_DAY.sunday, requests: Array.from({ length: 9 }, (_, i) => draftRequest({ id: `draft-${i}` })) }, field: 'requests' },
    { name: 'a non-ISO date', body: { date: '13-12-2026', requests: [draftRequest()] }, field: 'date' },
  ])('rejects $name with 400 and a field error', async ({ body, field }) => {
    const app = await loadApp();

    const response = await optimize(app, body);

    expect(response.status).toBe(400);
    expect(Object.keys(expectContract(validationErrorBody, response.body).fields)).toContain(field);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.adminScheduleOptimization();

    const response = await readJson(
      await POST(adminRequest('/api/admin/schedule-optimization', { method: 'POST', rawBody: '[' }))
    );

    expect(response.status).toBe(400);
    expect(expectContract(errorBody, response.body).error).toBe('Invalid JSON request body.');
  });

  it('challenges an anonymous caller with 401', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.adminScheduleOptimization();

    const response = await readJson(
      await POST(
        apiRequest('/api/admin/schedule-optimization', { body: { date: EMPTY_DAY.sunday, requests: [draftRequest()] } })
      )
    );

    expect(response.status).toBe(401);
    expectContract(errorBody, response.body);
  });
});

describe('GET /api/reviews', () => {
  it('serves the review snapshot publicly with a one-day shared cache', async () => {
    const app = await loadApp();
    const { GET } = await app.routes.reviews();

    const response = await readJson(await GET());

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=86400, stale-while-revalidate=43200');
    const snapshot = expectContract(reviewsSnapshot, response.body);
    expect(snapshot.source).toMatch(/not configured/);
    for (const review of snapshot.reviews) expect(review.characterCount).toBe(review.quote.length);
    const lengths = snapshot.reviews.map((review) => review.characterCount);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });
});

describe('POST /api/reviews (admin sync)', () => {
  it('challenges an anonymous caller with 401', async () => {
    const app = await loadApp();
    const { POST } = await app.routes.reviews();

    const response = await readJson(await POST(apiRequest('/api/reviews', { method: 'POST' })));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Basic realm="Sim Dream Admin"/);
    expectContract(errorBody, response.body);
  });

  it('refreshes the snapshot for an admin and reports what was synced', async () => {
    const app = await loadApp();
    const reviews = await app.routes.reviews();

    const response = await readJson(await reviews.POST(adminRequest('/api/reviews', { method: 'POST' })));

    expect(response.status).toBe(200);
    const sync = expectContract(reviewsSync, response.body);
    const snapshot = expectContract(reviewsSnapshot, (await readJson(await reviews.GET())).body);
    expect(sync).toMatchObject({
      syncedAt: snapshot.lastUpdated,
      totalReviews: snapshot.totalReviewsCount,
      rating: snapshot.overallRating,
    });
    expect(sync.reviews).toEqual(snapshot.reviews);
  });
});
