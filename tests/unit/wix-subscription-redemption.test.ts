import { describe, expect, it } from 'vitest';
import {
  isWixSubscriptionBookingPackageId,
  wixSubscriptionBookingPackageForPlan,
} from '@/lib/wix/subscription-redemption';

describe('Wix subscription redemption mapping', () => {
  it('maps each staging plan to exactly the Bookings service duration it funds', () => {
    expect(wixSubscriptionBookingPackageForPlan('4aef54a4-c9bb-4355-9e39-087733a83fd2')).toBe('pkg-captain-60');
    expect(wixSubscriptionBookingPackageForPlan('57c42cf1-dbc6-4924-aa3d-a675aa3b7f05')).toBe('pkg-captain-60');
    expect(wixSubscriptionBookingPackageForPlan('d8580735-1450-4a92-a483-9c22b8453d27')).toBe('pkg-ultimate-90');
    expect(wixSubscriptionBookingPackageForPlan('b8046da1-4ee0-4859-a54d-a0d66ef92b70')).toBe('pkg-ultimate-90');
  });

  it('does not treat unknown plans or non-subscription packages as redeemable', () => {
    expect(wixSubscriptionBookingPackageForPlan('not-a-wix-plan')).toBeNull();
    expect(isWixSubscriptionBookingPackageId('pkg-captain-60')).toBe(true);
    expect(isWixSubscriptionBookingPackageId('pkg-discovery-30')).toBe(false);
  });
});
