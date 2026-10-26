import assert from 'node:assert/strict';
import { test } from 'vitest';
import { Booking } from '@/types';
import { optimizeTiledCapacity } from '@/lib/scheduler/tiled-interval-optimizer';

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 'booking-1',
    bookingReference: 'SD-737-ABCDEFGHJKLMNPQR',
    packageId: 'pkg-captain-60',
    packageTitle: 'Captain',
    durationMinutes: 60,
    bookingDate: '2026-10-25',
    startTime: '10:00',
    endTime: '11:00',
    pilotName: 'Pilot',
    pilotEmail: 'pilot@example.com',
    pilotPhone: '+972555555555',
    experienceLevel: 'enthusiast',
    addons: [],
    subtotalIls: 690,
    discountIls: 0,
    totalIls: 690,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

test('draft optimizer chooses the highest-value compatible alternatives without moving confirmed bookings', () => {
  const preview = optimizeTiledCapacity({
    date: '2026-10-25',
    existingBookings: [booking({})],
    requests: [
      { id: 'high-value', durationMinutes: 90, valueIls: 950, candidateStartTimes: ['10:00', '11:15'] },
      { id: 'overlapping-low-value', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['11:15'] },
      { id: 'late-request', durationMinutes: 60, valueIls: 690, candidateStartTimes: ['18:00'] },
    ],
  });

  assert.equal(preview.mode, 'exact_dry_run');
  assert.equal(preview.projectedValueIls, 1640);
  assert.deepEqual(
    preview.recommendations.map((recommendation) => recommendation.requestId),
    ['high-value', 'late-request']
  );
  assert.deepEqual(preview.unallocatedRequestIds, ['overlapping-low-value']);
  assert.equal(preview.recommendations[0].startTime, '11:15');
});

test('draft optimizer refuses schedules that make orphan capacity worse', () => {
  const preview = optimizeTiledCapacity({
    date: '2026-10-25',
    existingBookings: [],
    requests: [
      { id: 'creates-30-minute-tail', durationMinutes: 60, valueIls: 1000, candidateStartTimes: ['10:30'] },
    ],
  });

  assert.equal(preview.projectedValueIls, 0);
  assert.deepEqual(preview.unallocatedRequestIds, ['creates-30-minute-tail']);
  assert.equal(preview.recommendations.length, 0);
});
