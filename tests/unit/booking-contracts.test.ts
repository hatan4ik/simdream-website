import assert from 'node:assert/strict';
import { test } from 'vitest';
import { calculateMissionManifest } from '@/lib/scheduler/mission-calculator';
import { getReservedMinutesForFlight, canTileIntervalZeroWaste } from '@/lib/scheduler/kantorovich-engine';
import { checkoutRequestSchema } from '@/lib/validation';

test('mission pricing and end time are calculated from server-owned package and add-on data', () => {
  const manifest = calculateMissionManifest({
    pkg: { title: "Captain's Command Flight (60m)", durationMinutes: 60, priceIls: 690 },
    slot: { startTime: '18:00', endTime: '19:30', isPrimeTime: true, maxAvailableMinutes: 120 },
    selectedAddonIds: ['weather', 'video'],
    availableAddons: [
      { id: 'weather', name: 'Weather', description: '', priceIls: 250, durationMinutes: 15, icon: 'CloudLightning' },
      { id: 'video', name: 'Video', description: '', priceIls: 120, durationMinutes: 0, icon: 'Video' },
    ],
  });

  assert.equal(manifest.cleanPackageTitle, "Captain's Command Flight");
  assert.equal(manifest.totalDurationMinutes, 75);
  assert.equal(manifest.effectiveEndTime, '19:15');
  assert.equal(manifest.subtotalIls, 1060);
  assert.equal(manifest.totalIls, 1060);
});

test('reserved scheduling capacity includes the mandatory and package-specific turnaround buffer', () => {
  assert.equal(getReservedMinutesForFlight(20), 45);
  assert.equal(getReservedMinutesForFlight(45), 60);
  assert.equal(getReservedMinutesForFlight(60), 75);
  assert.equal(getReservedMinutesForFlight(90), 105);
  assert.equal(getReservedMinutesForFlight(120), 150);
  assert.equal(canTileIntervalZeroWaste(150, true), true);
  assert.equal(canTileIntervalZeroWaste(30, false), false);
});

test('checkout accepts only the server-priced booking command shape', () => {
  const parsed = checkoutRequestSchema.safeParse({
    kind: 'booking',
    packageId: 'pkg-captain-60',
    bookingDate: '2026-12-10',
    startTime: '18:00',
    pilotName: 'Test Pilot',
    pilotEmail: 'pilot@example.com',
    pilotPhone: '+972555071307',
    experienceLevel: 'beginner',
    addons: [],
    totalIls: 1,
    discountIls: 9999,
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal('totalIls' in parsed.data, false);
  assert.equal('discountIls' in parsed.data, false);
});
