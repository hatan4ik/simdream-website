import type { SubscriptionPassId } from '@/lib/data/subscription-passes';
import { subscriptionPassIdForWixPlan } from './catalog';

export type WixSubscriptionBookingPackageId = 'pkg-captain-60' | 'pkg-ultimate-90';

const BOOKING_PACKAGE_BY_PASS: Readonly<Record<SubscriptionPassId, WixSubscriptionBookingPackageId>> = {
  'flight-foundations-5x60': 'pkg-captain-60',
  'advanced-captain-5x90': 'pkg-ultimate-90',
  'atpl-concepts-10x60': 'pkg-captain-60',
  'airline-readiness-10x90': 'pkg-ultimate-90',
};

/**
 * Public identifiers for the dedicated SimDream-Staging plans. Environment
 * mappings remain the primary configuration path; this lets the member UI
 * recognize an existing staging order without leaking or requiring a secret.
 */
const STAGING_BOOKING_PACKAGE_BY_PLAN_ID: Readonly<Record<string, WixSubscriptionBookingPackageId>> = {
  '4aef54a4-c9bb-4355-9e39-087733a83fd2': 'pkg-captain-60',
  '57c42cf1-dbc6-4924-aa3d-a675aa3b7f05': 'pkg-captain-60',
  'd8580735-1450-4a92-a483-9c22b8453d27': 'pkg-ultimate-90',
  'b8046da1-4ee0-4859-a54d-a0d66ef92b70': 'pkg-ultimate-90',
};

export function wixSubscriptionBookingPackageForPlan(planId: string): WixSubscriptionBookingPackageId | null {
  const passId = subscriptionPassIdForWixPlan(planId);
  return passId ? BOOKING_PACKAGE_BY_PASS[passId] : STAGING_BOOKING_PACKAGE_BY_PLAN_ID[planId] ?? null;
}

export function isWixSubscriptionBookingPackageId(packageId: string): packageId is WixSubscriptionBookingPackageId {
  return packageId === 'pkg-captain-60' || packageId === 'pkg-ultimate-90';
}
